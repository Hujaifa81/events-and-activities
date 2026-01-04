// Stats Module Interfaces

// ============================================
// ENUMS & TYPES
// ============================================

/**
 * Stats Period Types
 * Defines the time period for statistics aggregation
 */
export enum StatsPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// ============================================
// STATS INTERFACES
// ============================================

/**
 * Dashboard Statistics Interface
 * Contains all metrics displayed on admin dashboard
 */
export interface IDashboardStats {
  id: string;
  period: StatsPeriod;
  date: Date;
  
  // User Metrics
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  deletedUsers: number;
  
  // Host Metrics
  totalHosts: number;
  newHosts: number;
  activeHosts: number;
  
  // Event Metrics
  totalEvents: number;
  newEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  
  // Booking Metrics
  totalBookings: number;
  newBookings: number;
  cancelledBookings: number;
  
  // Financial Metrics
  totalRevenue: number;
  platformRevenue: number;
  hostRevenue: number;
  refundedAmount: number;
  
  // Engagement Metrics
  totalPageViews: number;
  avgSessionDuration: number;
  
  generatedAt: Date;
}

/**
 * Stats Query Filters
 * Used to filter stats by period and date range
 */
export interface IStatsFilters {
  period?: StatsPeriod;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Stats Generation Options
 * Configuration for manual stats generation
 */
export interface IStatsGenerationOptions {
  period: StatsPeriod;
  date?: Date; // If not provided, uses current date
  forceRegenerate?: boolean; // Regenerate even if exists
}

/**
 * Stats Comparison Result
 * Used to compare stats between two periods
 */
export interface IStatsComparison {
  current: IDashboardStats;
  previous?: IDashboardStats;
  changes: {
    usersGrowth: number; // Percentage
    revenueGrowth: number;
    eventsGrowth: number;
    bookingsGrowth: number;
  };
}

/**
 * Real-time Stats Response
 * Quick stats without caching (for real-time display)
 */
export interface IRealTimeStats {
  totalUsers: number;
  totalHosts: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  todayUsers: number;
  todayEvents: number;
  todayRevenue: number;
}

/**
 * Stats Summary Response
 * Aggregated stats for admin overview
 */
export interface IStatsSummary {
  daily: IDashboardStats;
  weekly: IDashboardStats;
  monthly: IDashboardStats;
  yearly: IDashboardStats;
}
