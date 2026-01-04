// Activity Service - Activity Log Management & Analytics
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from '@/shared';
import {
  IActivityLog,
  IActivityFilters,
  IUserActivityTimeline,
  IPopularItem,
  IActivityAnalytics,
  ISessionDetails,
  IActivityHeatmap,
  IUserBehaviorPattern,
} from './activity.interface';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';

// ============================================
// ACTIVITY RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get Activities with Filters
 * Retrieves activity logs with pagination and filters
 * @param filters - Filter options
 * @returns Paginated activity logs
 */
const getActivities = async (
  filters: IActivityFilters
): Promise<{ data: IActivityLog[]; total: number; page: number; limit: number }> => {
  const {
    userId,
    activityType,
    entityType,
    entityId,
    sessionId,
    startDate,
    endDate,
    device,
    browser,
    os,
    page = 1,
    limit = 50,
  } = filters;

  // Build where clause
  const where: any = {};

  if (userId) where.userId = userId;
  if (activityType) where.activityType = activityType;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (sessionId) where.sessionId = sessionId;
  if (device) where.device = device;
  if (browser) where.browser = browser;
  if (os) where.os = os;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  // Get total count
  const total = await prisma.activityLog.count({ where });

  // Get paginated data
  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: activities as IActivityLog[],
    total,
    page,
    limit,
  };
};

/**
 * Get User Activity Timeline
 * Retrieves user's activity grouped by date
 * @param userId - User ID
 * @param days - Number of days to retrieve (default: 30)
 */
const getUserActivityTimeline = async (
  userId: string,
  days = 30
): Promise<IUserActivityTimeline> => {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(new Date(), days - 1));

  // Get all activities
  const activities = await prisma.activityLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by date
  const grouped = activities.reduce(
    (acc, activity) => {
      const date = format(activity.createdAt, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity as IActivityLog);
      return acc;
    },
    {} as Record<string, IActivityLog[]>
  );

  // Format response
  const timeline = Object.entries(grouped).map(([date, acts]) => ({
    date,
    count: acts.length,
    activities: acts,
  }));

  return {
    userId,
    totalActivities: activities.length,
    dateRange: {
      from: startDate,
      to: endDate,
    },
    activities: timeline,
  };
};

/**
 * Get Popular Items
 * Finds most viewed events, pages, etc.
 * @param entityType - Type of entity to analyze
 * @param limit - Number of results (default: 10)
 * @param days - Number of days to analyze (default: 30)
 */
const getPopularItems = async (
  entityType: string,
  limit= 10,
  days = 30
): Promise<IPopularItem[]> => {
  const startDate = startOfDay(subDays(new Date(), days - 1));

  const results = await prisma.activityLog.groupBy({
    by: ['entityId'],
    where: {
      entityType,
      entityId: { not: null },
      activityType: { in: ['EVENT_VIEW', 'PAGE_VIEW', 'BOOKING_VIEW'] },
      createdAt: { gte: startDate },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Get unique users for each item
  const popularItemsResults = await Promise.all(
    results.map(async result => {
      if (!result.entityId) return null;

      const uniqueUsers = await prisma.activityLog.findMany({
        where: {
          entityType,
          entityId: result.entityId,
          userId: { not: null },
          createdAt: { gte: startDate },
        },
        distinct: ['userId'],
        select: { userId: true },
      });

      const lastActivity = await prisma.activityLog.findFirst({
        where: {
          entityType,
          entityId: result.entityId,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      if (!lastActivity) return null;

      return {
        entityType,
        entityId: result.entityId,
        viewCount: result._count.id,
        uniqueUsers: uniqueUsers.length,
        lastViewedAt: lastActivity.createdAt,
      };
    })
  );

  const popularItems: IPopularItem[] = popularItemsResults.filter(
    (item): item is IPopularItem => item !== null
  );

  return popularItems;
};

/**
 * Get Activity Analytics
 * Comprehensive analytics dashboard data
 * @param startDate - Start date (default: 30 days ago)
 * @param endDate - End date (default: now)
 */
const getActivityAnalytics = async (
  startDate: Date = subDays(new Date(), 30),
  endDate: Date = new Date()
): Promise<IActivityAnalytics> => {
  const where = {
    createdAt: { gte: startDate, lte: endDate },
  };

  // Run all queries in parallel
  const [
    totalActivities,
    uniqueUsers,
    uniqueSessions,
    byActivityType,
    byDevice,
    byBrowser,
    byOS,
    topPages,
    hourlyDistribution,
  ] = await Promise.all([
    // Total activities
    prisma.activityLog.count({ where }),

    // Unique users
    prisma.activityLog.findMany({
      where: { ...where, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    }),

    // Unique sessions
    prisma.activityLog.findMany({
      where: { ...where, sessionId: { not: null } },
      distinct: ['sessionId'],
      select: { sessionId: true },
    }),

    // By activity type
    prisma.activityLog.groupBy({
      by: ['activityType'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // By device
    prisma.activityLog.groupBy({
      by: ['device'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // By browser
    prisma.activityLog.groupBy({
      by: ['browser'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // By OS
    prisma.activityLog.groupBy({
      by: ['os'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // Top pages
    prisma.activityLog.groupBy({
      by: ['page'],
      where: {
        ...where,
        activityType: 'PAGE_VIEW',
        page: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),

    // Hourly distribution
    prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        COUNT(*) as count
      FROM activity_logs
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY hour
      ORDER BY hour
    `,
  ]);

  // Calculate percentages
  const calculatePercentages = (items: any[]) =>
    items.map(item => ({
      ...item,
      count: item._count.id,
      percentage: Math.round((item._count.id / totalActivities) * 100),
    }));

  return {
    period: {
      from: startDate,
      to: endDate,
    },
    totalActivities,
    uniqueUsers: uniqueUsers.length,
    uniqueSessions: uniqueSessions.length,
    byActivityType: byActivityType.map(item => ({
      activityType: item.activityType,
      count: item._count.id,
      percentage: Math.round((item._count.id / totalActivities) * 100),
    })),
    byDevice: calculatePercentages(byDevice).map(item => ({
      device: item.device || 'Unknown',
      count: item.count,
      percentage: item.percentage,
    })),
    byBrowser: calculatePercentages(byBrowser).map(item => ({
      browser: item.browser || 'Unknown',
      count: item.count,
      percentage: item.percentage,
    })),
    byOS: calculatePercentages(byOS).map(item => ({
      os: item.os || 'Unknown',
      count: item.count,
      percentage: item.percentage,
    })),
    topPages: topPages.map(item => ({
      page: item.page || '',
      viewCount: item._count.id,
    })),
    peakHours: hourlyDistribution.map(item => ({
      hour: Number(item.hour),
      count: Number(item.count),
    })),
  };
};

/**
 * Get Session Details
 * Detailed information about a specific session
 * @param sessionId - Session ID
 */
const getSessionDetails = async (
  sessionId: string
): Promise<ISessionDetails | null> => {
  const activities = await prisma.activityLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  if (activities.length === 0) {
    return null;
  }

  const first = activities[0];
  const last = activities[activities.length - 1];
  const duration = last.duration || last.createdAt.getTime() - first.createdAt.getTime();

  return {
    sessionId,
    userId: first.userId || undefined,
    startTime: first.createdAt,
    endTime: last.createdAt,
    duration,
    totalActivities: activities.length,
    pageViews: activities.filter(a => a.activityType === 'PAGE_VIEW').length,
    actionsPerformed: [
      ...new Set(activities.map(a => a.activityType)),
    ],
    device: first.device || 'Unknown',
    browser: first.browser || 'Unknown',
    os: first.os || 'Unknown',
    pagesVisited: [
      ...new Set(activities.map(a => a.page).filter(Boolean)),
    ] as string[],
    activities: activities as IActivityLog[],
  };
};

/**
 * Get Activity Heatmap
 * Activity distribution by date and hour
 * @param days - Number of days (default: 30)
 */
const getActivityHeatmap = async (
  days = 30
): Promise<IActivityHeatmap[]> => {
  const startDate = subDays(new Date(), days - 1);

  const results = await prisma.$queryRaw<
    { date: string; hour: number; count: bigint }[]
  >`
    SELECT 
      DATE("createdAt") as date,
      EXTRACT(HOUR FROM "createdAt") as hour,
      COUNT(*) as count
    FROM activity_logs
    WHERE "createdAt" >= ${startDate}
    GROUP BY date, hour
    ORDER BY date, hour
  `;

  return results.map(r => ({
    date: format(new Date(r.date), 'yyyy-MM-dd'),
    hour: Number(r.hour),
    count: Number(r.count),
  }));
};

/**
 * Get User Behavior Pattern
 * ML/Analytics insights for a user
 * @param userId - User ID
 */
const getUserBehaviorPattern = async (
  userId: string
): Promise<IUserBehaviorPattern | null> => {
  const activities = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (activities.length === 0) {
    return null;
  }

  // Calculate patterns
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();
  let totalDuration = 0;
  const sessionIds = new Set<string>();

  activities.forEach(activity => {
    const hour = activity.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    const day = format(activity.createdAt, 'EEEE');
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

    if (activity.duration) totalDuration += activity.duration;
    if (activity.sessionId) sessionIds.add(activity.sessionId);
  });

  const mostActiveHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  const mostActiveDays = Array.from(dayCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Get top categories/events
  const eventViews = activities.filter(
    a => a.activityType === 'EVENT_VIEW' && a.entityId
  );
  const topEvents = Array.from(
    eventViews
      .reduce((acc, a) => {
        if (a.entityId) {
          acc.set(a.entityId, (acc.get(a.entityId) || 0) + 1);
        }
        return acc;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const lastActivity = activities[0];
  const daysSinceLastActive = Math.floor(
    (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    userId,
    mostActiveHours,
    mostActiveDays,
    preferredDevice: activities[0].device || 'Unknown',
    preferredBrowser: activities[0].browser || 'Unknown',
    avgSessionDuration: sessionIds.size > 0 ? totalDuration / sessionIds.size : 0,
    avgActivitiesPerSession: sessionIds.size > 0 ? activities.length / sessionIds.size : 0,
    topCategories: [], // TODO: Extract from event metadata
    topEvents,
    lastActiveAt: lastActivity.createdAt,
    daysSinceLastActive,
  };
};

/**
 * Delete Old Activity Logs
 * Clean up logs older than specified days
 * @param days - Retention period in days (default: 90)
 */
const deleteOldActivities = async (days = 90): Promise<number> => {
  const cutoffDate = subDays(new Date(), days);

  const result = await prisma.activityLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(`🗑️ Deleted ${result.count} activity logs older than ${days} days`);
  return result.count;
};

// ============================================
// EXPORTS
// ============================================

export const ActivityService = {
  getActivities,
  getUserActivityTimeline,
  getPopularItems,
  getActivityAnalytics,
  getSessionDetails,
  getActivityHeatmap,
  getUserBehaviorPattern,
  deleteOldActivities,
};
