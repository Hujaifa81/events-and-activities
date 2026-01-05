// Stats Service - Dashboard Statistics Generation & Management
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from '@/shared';
import {
  StatsPeriod,
  IDashboardStats,
  IStatsFilters,
  IStatsComparison,
  IRealTimeStats,
  IStatsSummary,
} from './stats.interface';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns';

// ============================================
// STATS GENERATION FUNCTIONS
// ============================================

/**
 * Generate Daily Statistics
 * Runs every day at midnight to cache daily stats
 * @param date - Date for which to generate stats (default: yesterday)
 * @param forceRegenerate - Force regeneration even if exists
 */
const generateDailyStats = async (
  date: Date = subDays(new Date(), 1),
  forceRegenerate = false
): Promise<IDashboardStats> => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Check if already generated
  if (!forceRegenerate) {
    const exists = await prisma.dashboardStats.findFirst({
      where: { period: 'DAILY', date: dayStart },
    });
    if (exists) {
      console.log('Daily stats already generated for:', dayStart);
      return exists as IDashboardStats;
    }
  }

  console.log('Generating daily stats for:', dayStart);

  // Run all queries in parallel for performance
  const [
    totalUsers,
    newUsers,
    activeUsers,
    deletedUsers,
    totalHosts,
    newHosts,
    activeHosts,
    totalEvents,
    newEvents,
    completedEvents,
    cancelledEvents,
    totalBookings,
    newBookings,
    cancelledBookings,
    revenueData,
    refundData,
    totalPageViews,
    avgSessionData,
  ] = await Promise.all([
    // User Statistics
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.user.count({
      where: { deletedAt: { gte: dayStart, lte: dayEnd } },
    }),

    // Host Statistics
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.user.count({
      where: {
        role: 'HOST',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.user.count({
      where: {
        role: 'HOST',
        status: 'ACTIVE',
        lastActiveAt: { gte: dayStart, lte: dayEnd },
      },
    }),

    // Event Statistics
    prisma.event.count(),
    prisma.event.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.event.count({
      where: {
        status: 'COMPLETED',
        endDate: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: dayStart, lte: dayEnd },
      },
    }),

    // Booking Statistics
    prisma.booking.count(),
    prisma.booking.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: dayStart, lte: dayEnd },
      },
    }),

    // Revenue Statistics
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: {
        amount: true,
        platformFee: true,
        hostEarning: true,
      },
    }),

    // Refund Statistics
    prisma.refund.aggregate({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: { amount: true },
    }),

    // Page Views (ActivityLog)
    prisma.activityLog.count({
      where: {
        activityType: 'PAGE_VIEW',
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),

    // Average Session Duration (ActivityLog)
    prisma.activityLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { not: null },
        duration: { not: null },
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      _avg: {
        duration: true,
      },
    }),
  ]);

  // Create or update daily stats
  const dailyStats = await prisma.dashboardStats.upsert({
    where: {
      period_date: {
        period: 'DAILY',
        date: dayStart,
      },
    },
    create: {
      period: 'DAILY',
      date: dayStart,
      totalUsers,
      newUsers,
      activeUsers,
      deletedUsers,
      totalHosts,
      newHosts,
      activeHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      deletedUsers,
      totalHosts,
      newHosts,
      activeHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
  });

  console.log('✅ Daily stats generated successfully');
  return dailyStats as IDashboardStats;
};

/**
 * Generate Weekly Statistics
 * Runs every Sunday at midnight
 * @param date - Date for which to generate stats (default: previous week)
 * @param forceRegenerate - Force regeneration even if exists
 */
const generateWeeklyStats = async (
  date: Date = subWeeks(new Date(), 1),
  forceRegenerate = false
): Promise<IDashboardStats> => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

  // Check if already generated
  if (!forceRegenerate) {
    const exists = await prisma.dashboardStats.findFirst({
      where: { period: 'WEEKLY', date: weekStart },
    });
    if (exists) {
      console.log('Weekly stats already generated for:', weekStart);
      return exists as IDashboardStats;
    }
  }

  console.log('Generating weekly stats for:', weekStart);

  // Calculate stats for the week
  const [
    totalUsers,
    newUsers,
    activeUsers,
    totalHosts,
    newHosts,
    activeHosts,
    totalEvents,
    newEvents,
    completedEvents,
    cancelledEvents,
    totalBookings,
    newBookings,
    cancelledBookings,
    revenueData,
    refundData,
    totalPageViews,
    avgSessionData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.user.count({
      where: {
        role: 'HOST',
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.user.count({
      where: {
        role: 'HOST',
        status: 'ACTIVE',
        lastActiveAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.event.count(),
    prisma.event.count({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.event.count({
      where: {
        status: 'COMPLETED',
        endDate: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: weekStart, lte: weekEnd },
      },
      _sum: {
        amount: true,
        platformFee: true,
        hostEarning: true,
      },
    }),
    prisma.refund.aggregate({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: weekStart, lte: weekEnd },
      },
      _sum: { amount: true },
    }),

    // Page Views (ActivityLog)
    prisma.activityLog.count({
      where: {
        activityType: 'PAGE_VIEW',
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    }),

    // Average Session Duration (ActivityLog)
    prisma.activityLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { not: null },
        duration: { not: null },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      _avg: {
        duration: true,
      },
    }),
  ]);

  const weeklyStats = await prisma.dashboardStats.upsert({
    where: {
      period_date: {
        period: 'WEEKLY',
        date: weekStart,
      },
    },
    create: {
      period: 'WEEKLY',
      date: weekStart,
      totalUsers,
      newUsers,
      activeUsers,
      deletedUsers: 0,
      totalHosts,
      newHosts,
      activeHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      totalHosts,
      newHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
  });

  console.log('✅ Weekly stats generated successfully');
  return weeklyStats as IDashboardStats;
};

/**
 * Generate Monthly Statistics
 * Runs on the 1st of every month at midnight
 * @param date - Date for which to generate stats (default: previous month)
 * @param forceRegenerate - Force regeneration even if exists
 */
const generateMonthlyStats = async (
  date: Date = subMonths(new Date(), 1),
  forceRegenerate = false
): Promise<IDashboardStats> => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  if (!forceRegenerate) {
    const exists = await prisma.dashboardStats.findFirst({
      where: { period: 'MONTHLY', date: monthStart },
    });
    if (exists) {
      console.log('Monthly stats already generated for:', monthStart);
      return exists as IDashboardStats;
    }
  }

  console.log('Generating monthly stats for:', monthStart);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    totalHosts,
    newHosts,
    activeHosts,
    totalEvents,
    newEvents,
    completedEvents,
    cancelledEvents,
    totalBookings,
    newBookings,
    cancelledBookings,
    revenueData,
    refundData,
    totalPageViews,
    avgSessionData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.user.count({
      where: {
        role: 'HOST',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.user.count({
      where: {
        role: 'HOST',
        status: 'ACTIVE',
        lastActiveAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.event.count(),
    prisma.event.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.event.count({
      where: {
        status: 'COMPLETED',
        endDate: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: {
        amount: true,
        platformFee: true,
        hostEarning: true,
      },
    }),
    prisma.refund.aggregate({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),

    // Page Views (ActivityLog)
    prisma.activityLog.count({
      where: {
        activityType: 'PAGE_VIEW',
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),

    // Average Session Duration (ActivityLog)
    prisma.activityLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { not: null },
        duration: { not: null },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _avg: {
        duration: true,
      },
    }),
  ]);

  const monthlyStats = await prisma.dashboardStats.upsert({
    where: {
      period_date: {
        period: 'MONTHLY',
        date: monthStart,
      },
    },
    create: {
      period: 'MONTHLY',
      date: monthStart,
      totalUsers,
      newUsers,
      activeUsers,
      deletedUsers: 0,
      totalHosts,
      newHosts,
      activeHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      totalHosts,
      newHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
  });

  console.log('✅ Monthly stats generated successfully');
  return monthlyStats as IDashboardStats;
};

/**
 * Generate Yearly Statistics
 * Runs on January 1st at midnight
 * @param date - Date for which to generate stats (default: previous year)
 * @param forceRegenerate - Force regeneration even if exists
 */
const generateYearlyStats = async (
  date: Date = subYears(new Date(), 1),
  forceRegenerate = false
): Promise<IDashboardStats> => {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);

  if (!forceRegenerate) {
    const exists = await prisma.dashboardStats.findFirst({
      where: { period: 'YEARLY', date: yearStart },
    });
    if (exists) {
      console.log('Yearly stats already generated for:', yearStart);
      return exists as IDashboardStats;
    }
  }

  console.log('Generating yearly stats for:', yearStart);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    totalHosts,
    newHosts,
    activeHosts,
    totalEvents,
    newEvents,
    completedEvents,
    cancelledEvents,
    totalBookings,
    newBookings,
    cancelledBookings,
    revenueData,
    refundData,
    totalPageViews,
    avgSessionData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.user.count({
      where: {
        role: 'HOST',
        createdAt: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.user.count({
      where: {
        role: 'HOST',
        status: 'ACTIVE',
        lastActiveAt: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.event.count(),
    prisma.event.count({
      where: { createdAt: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.event.count({
      where: {
        status: 'COMPLETED',
        endDate: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.event.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { createdAt: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.booking.count({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: yearStart, lte: yearEnd },
      },
      _sum: {
        amount: true,
        platformFee: true,
        hostEarning: true,
      },
    }),
    prisma.refund.aggregate({
      where: {
        status: 'COMPLETED',
        processedAt: { gte: yearStart, lte: yearEnd },
      },
      _sum: { amount: true },
    }),

    // Page Views (ActivityLog)
    prisma.activityLog.count({
      where: {
        activityType: 'PAGE_VIEW',
        createdAt: { gte: yearStart, lte: yearEnd },
      },
    }),

    // Average Session Duration (ActivityLog)
    prisma.activityLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { not: null },
        duration: { not: null },
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      _avg: {
        duration: true,
      },
    }),
  ]);

  const yearlyStats = await prisma.dashboardStats.upsert({
    where: {
      period_date: {
        period: 'YEARLY',
        date: yearStart,
      },
    },
    create: {
      period: 'YEARLY',
      date: yearStart,
      totalUsers,
      newUsers,
      activeUsers,
      deletedUsers: 0,
      totalHosts,
      newHosts,
      activeHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      totalHosts,
      newHosts,
      totalEvents,
      newEvents,
      completedEvents,
      cancelledEvents,
      totalBookings,
      newBookings,
      cancelledBookings,
      totalRevenue: revenueData._sum?.amount || 0,
      platformRevenue: revenueData._sum?.platformFee || 0,
      hostRevenue: revenueData._sum?.hostEarning || 0,
      refundedAmount: refundData._sum?.amount || 0,
      totalPageViews,
      avgSessionDuration: avgSessionData.length > 0
        ? Math.round(
            avgSessionData.reduce((sum, s) => sum + (s._avg.duration || 0), 0) /
              avgSessionData.length /
              1000
          )
        : 0,
    },
  });

  console.log('✅ Yearly stats generated successfully');
  return yearlyStats as IDashboardStats;
};

// ============================================
// STATS RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get Dashboard Stats by Period
 * Retrieves cached stats for a specific period
 * @param period - Time period (DAILY, WEEKLY, MONTHLY, YEARLY)
 * @param filters - Optional filters for date range
 */
const getStatsByPeriod = async (
  period: StatsPeriod,
  filters?: IStatsFilters
): Promise<IDashboardStats[]> => {
  const where: any = { period };

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  const stats = await prisma.dashboardStats.findMany({
    where,
    orderBy: { date: 'desc' },
    take: filters?.limit || 30,
  });

  return stats as IDashboardStats[];
};

/**
 * Get Latest Stats for All Periods
 * Returns the most recent stats for daily, weekly, monthly, yearly
 */
const getLatestStats = async (): Promise<IStatsSummary> => {
  const [daily, weekly, monthly, yearly] = await Promise.all([
    prisma.dashboardStats.findFirst({
      where: { period: 'DAILY' },
      orderBy: { date: 'desc' },
    }),
    prisma.dashboardStats.findFirst({
      where: { period: 'WEEKLY' },
      orderBy: { date: 'desc' },
    }),
    prisma.dashboardStats.findFirst({
      where: { period: 'MONTHLY' },
      orderBy: { date: 'desc' },
    }),
    prisma.dashboardStats.findFirst({
      where: { period: 'YEARLY' },
      orderBy: { date: 'desc' },
    }),
  ]);

  return {
    daily: daily as IDashboardStats,
    weekly: weekly as IDashboardStats,
    monthly: monthly as IDashboardStats,
    yearly: yearly as IDashboardStats,
  };
};

/**
 * Compare Stats Between Two Periods
 * Calculates growth percentages between current and previous period
 */
const compareStats = async (
  period: StatsPeriod,
  currentDate: Date
): Promise<IStatsComparison> => {
  let previousDate: Date;

  // Calculate previous period date
  switch (period) {
    case StatsPeriod.DAILY:
      previousDate = subDays(currentDate, 1);
      break;
    case StatsPeriod.WEEKLY:
      previousDate = subWeeks(currentDate, 1);
      break;
    case StatsPeriod.MONTHLY:
      previousDate = subMonths(currentDate, 1);
      break;
    case StatsPeriod.YEARLY:
      previousDate = subYears(currentDate, 1);
      break;
    default:
      previousDate = subDays(currentDate, 1);
  }

  const [current, previous] = await Promise.all([
    prisma.dashboardStats.findFirst({
      where: { period, date: currentDate },
    }),
    prisma.dashboardStats.findFirst({
      where: { period, date: previousDate },
    }),
  ]);

  if (!current) {
    throw new Error('Current period stats not found');
  }

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    current: current as IDashboardStats,
    previous: previous as IDashboardStats | undefined,
    changes: {
      usersGrowth: previous
        ? calculateGrowth(current.newUsers, previous.newUsers)
        : 0,
      revenueGrowth: previous
        ? calculateGrowth(current.totalRevenue, previous.totalRevenue)
        : 0,
      eventsGrowth: previous
        ? calculateGrowth(current.newEvents, previous.newEvents)
        : 0,
      bookingsGrowth: previous
        ? calculateGrowth(current.newBookings, previous.newBookings)
        : 0,
    },
  };
};

/**
 * Get Real-time Stats (Not Cached)
 * Fetches current stats directly from database without caching
 * Use sparingly - prefer cached stats for performance
 */
const getRealTimeStats = async (): Promise<IRealTimeStats> => {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [
    totalUsers,
    totalHosts,
    totalEvents,
    totalBookings,
    totalRevenue,
    todayUsers,
    todayEvents,
    todayRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'HOST' } }),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.event.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    totalHosts,
    totalEvents,
    totalBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
    todayUsers,
    todayEvents,
    todayRevenue: todayRevenue._sum.amount || 0,
  };
};

// ============================================
// SESSION MONITORING HELPERS
// ============================================

/**
 * Get User Activity History
 * Retrieves past session data from ActivityLog
 */
const getUserActivityHistory = async (userId: string) => {
  const sessions = await prisma.activityLog.findMany({
    where: {
      userId,
      activityType: 'USER_LOGOUT',
      duration: { not: null },
    },
    select: {
      sessionId: true,
      duration: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20, // Last 20 sessions
  });

  return {
    totalSessions: sessions.length,
    avgDurationMinutes: sessions.length
      ? Math.floor(
          sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
            sessions.length /
            1000 /
            60
        )
      : 0,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      durationMinutes: Math.floor((s.duration || 0) / 1000 / 60),
      date: s.createdAt.toISOString(),
    })),
  };
};

/**
 * Get Current User Session
 * Checks if user has an active session
 */
const getCurrentUserSession = async (userId: string) => {
  const activeSession = await prisma.activityLog.findFirst({
    where: {
      userId,
      sessionId: { not: null },
      duration: null, // Active session (no end time yet)
    },
    select: {
      sessionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return activeSession;
};

// ============================================
// EXPORTS
// ============================================

export const StatsService = {
  // Generation
  generateDailyStats,
  generateWeeklyStats,
  generateMonthlyStats,
  generateYearlyStats,

  // Retrieval
  getStatsByPeriod,
  getLatestStats,
  compareStats,
  getRealTimeStats,

  // Session Monitoring
  getUserActivityHistory,
  getCurrentUserSession,
};
