/* eslint-disable @typescript-eslint/no-explicit-any */
// Activity Module Interfaces

import { ActivityType, EntityType } from '@/types';

/**
 * Activity Log Interface
 * Represents a single user activity entry
 */
export interface IActivityLog {
  id: string;
  userId?: string;
  sessionId?: string;
  
  // Activity Details
  activityType: ActivityType | string;
  activityName: string;
  
  // Context
  page?: string;
  referrer?: string;
  
  // Entity Reference
  entityType?: EntityType | string;
  entityId?: string;
  
  // Device Info
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  
  // Location
  country?: string;
  city?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Duration
  duration?: number; // Milliseconds
  
  createdAt: Date;
}

/**
 * Activity Filters Interface
 * For filtering activity logs
 */
export interface IActivityFilters {
  userId?: string;
  activityType?: ActivityType | string;
  entityType?: EntityType | string;
  entityId?: string;
  sessionId?: string;
  
  // Date Range
  startDate?: Date;
  endDate?: Date;
  
  // Device Filters
  device?: string;
  browser?: string;
  os?: string;
  
  // Pagination
  page?: number;
  limit?: number;
}

/**
 * User Activity Timeline Response
 * Groups activities by date
 */
export interface IUserActivityTimeline {
  userId: string;
  totalActivities: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  activities: {
    date: string; // "2026-01-04"
    count: number;
    activities: IActivityLog[];
  }[];
}

/**
 * Popular Items Response
 * For trending events, pages, etc.
 */
export interface IPopularItem {
  entityType: string;
  entityId: string;
  viewCount: number;
  uniqueUsers: number;
  lastViewedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Activity Analytics Response
 * Overview statistics
 */
export interface IActivityAnalytics {
  period: {
    from: Date;
    to: Date;
  };
  
  // Overall Stats
  totalActivities: number;
  uniqueUsers: number;
  uniqueSessions: number;
  
  // By Activity Type
  byActivityType: {
    activityType: string;
    count: number;
    percentage: number;
  }[];
  
  // By Device
  byDevice: {
    device: string;
    count: number;
    percentage: number;
  }[];
  
  // By Browser
  byBrowser: {
    browser: string;
    count: number;
    percentage: number;
  }[];
  
  // By OS
  byOS: {
    os: string;
    count: number;
    percentage: number;
  }[];
  
  // Top Pages
  topPages: {
    page: string;
    viewCount: number;
  }[];
  
  // Peak Hours
  peakHours: {
    hour: number; // 0-23
    count: number;
  }[];
}

/**
 * Session Details Interface
 * Detailed session information
 */
export interface ISessionDetails {
  sessionId: string;
  userId?: string;
  
  // Session Info
  startTime: Date;
  endTime?: Date;
  duration?: number; // Milliseconds
  
  // Activity Summary
  totalActivities: number;
  pageViews: number;
  actionsPerformed: string[]; // Activity types
  
  // Device Info
  device: string;
  browser: string;
  os: string;
  
  // Pages Visited
  pagesVisited: string[];
  
  // Timeline
  activities: IActivityLog[];
}

/**
 * Activity Export Options
 * For exporting activity data
 */
export interface IActivityExportOptions {
  format: 'CSV' | 'JSON' | 'XLSX';
  filters?: IActivityFilters;
  includeMetadata?: boolean;
  includeDeviceInfo?: boolean;
}

/**
 * Heatmap Data Interface
 * For activity heatmap visualization
 */
export interface IActivityHeatmap {
  date: string; // "2026-01-04"
  hour: number; // 0-23
  count: number;
}

/**
 * User Behavior Pattern Interface
 * ML/Analytics insights
 */
export interface IUserBehaviorPattern {
  userId: string;
  
  // Activity Patterns
  mostActiveHours: number[]; // [14, 15, 16] = 2PM-4PM
  mostActiveDays: string[]; // ["Monday", "Wednesday"]
  
  // Preferences
  preferredDevice: string;
  preferredBrowser: string;
  
  // Engagement
  avgSessionDuration: number; // Milliseconds
  avgActivitiesPerSession: number;
  
  // Interests (based on entity views)
  topCategories: string[];
  topEvents: string[];
  
  // Last Active
  lastActiveAt: Date;
  daysSinceLastActive: number;
}
