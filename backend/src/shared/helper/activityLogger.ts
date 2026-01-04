/* eslint-disable @typescript-eslint/no-explicit-any */
// Activity Logger Helper - Production-Ready Activity Tracking
/* eslint-disable no-console */

import { Request } from 'express';
import { prisma } from '@/shared/utils';
import { ActivityType, EntityType } from '@/types/activityTypes';

/**
 * Log Activity Parameters Interface
 * Defines all possible parameters for activity logging
 */
interface ILogActivityParams {
  // Required
  activityType: ActivityType;
  activityName: string;

  // Optional - User & Session
  userId?: string;
  sessionId?: string;

  // Optional - Context
  page?: string;
  referrer?: string;

  // Optional - Entity Reference
  entityType?: EntityType | string;
  entityId?: string;

  // Optional - Performance
  duration?: number; // Milliseconds

  // Optional - Metadata
  metadata?: Record<string, any>;

  // Optional - Request Object (auto-extracts info)
  req?: Request;
}

/**
 * Parse User Agent String
 * Extracts device, browser, and OS information
 */
const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) {
    return {
      device: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  // Device Detection
  let device = 'Desktop';
  if (/mobile/i.test(userAgent)) device = 'Mobile';
  else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

  // Browser Detection
  let browser = 'Other';
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/opera|opr/i.test(userAgent)) browser = 'Opera';

  // OS Detection
  let os = 'Other';
  if (/windows nt 10/i.test(userAgent)) os = 'Windows 10/11';
  else if (/windows nt/i.test(userAgent)) os = 'Windows';
  else if (/mac os x/i.test(userAgent)) os = 'MacOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(userAgent)) os = 'iOS';

  return { device, browser, os };
};

/**
 * Get Session ID from Request
 * Extracts or generates session ID from cookie/header
 */
const getSessionId = (req?: Request): string | undefined => {
  if (!req) return undefined;

  // Try to get from cookie
  if (req.cookies?.sessionId) {
    return req.cookies.sessionId;
  }

  // Try to get from header
  if (req.headers['x-session-id']) {
    return req.headers['x-session-id'] as string;
  }

  return undefined;
};

/**
 * Log Activity Function
 * Main function to track user activities
 * 
 * Usage Examples:
 * 
 * // Basic usage
 * await logActivity({
 *   activityType: ActivityType.EVENT_VIEW,
 *   activityName: 'View Event: Birthday Party',
 *   userId: req.user?.id,
 *   req,
 * });
 * 
 * // With entity reference
 * await logActivity({
 *   activityType: ActivityType.BOOKING_CREATE,
 *   activityName: 'Create Booking for Event #123',
 *   userId: req.user!.id,
 *   entityType: EntityType.BOOKING,
 *   entityId: booking.id,
 *   metadata: { amount: booking.totalAmount },
 *   req,
 * });
 * 
 * // With custom duration
 * const startTime = Date.now();
 * // ... some operation ...
 * await logActivity({
 *   activityType: ActivityType.SEARCH,
 *   activityName: 'Search Events: "Birthday"',
 *   duration: Date.now() - startTime,
 *   req,
 * });
 */
export const logActivity = async (
  params: ILogActivityParams
): Promise<void> => {
  try {
    const {
      activityType,
      activityName,
      userId,
      sessionId,
      page,
      referrer,
      entityType,
      entityId,
      duration,
      metadata,
      req,
    } = params;

    // Extract information from request if provided
    const userAgent = req?.headers['user-agent'];
    const { device, browser, os } = parseUserAgent(userAgent);
    const ipAddress = req?.ip || req?.socket.remoteAddress;
    const requestSessionId = sessionId || getSessionId(req);

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        // Core Activity Data
        activityType,
        activityName,

        // User & Session
        userId: userId || undefined,
        sessionId: requestSessionId,

        // Context
        page: page || req?.path,
        referrer: referrer || (req?.headers.referer as string),

        // Entity Reference
        entityType,
        entityId,

        // Device & Browser Info
        ipAddress,
        userAgent,
        device,
        browser,
        os,

        // Performance
        duration,

        // Additional Data
        metadata: metadata || undefined,
      },
    });
  } catch (error) {
    // Don't throw - activity logging failure shouldn't break the application
    console.error('❌ Activity logging failed:', error);
  }
};

/**
 * Log Page View
 * Convenience function for logging page views
 * 
 * Usage:
 * await logPageView(req, req.user?.id);
 */
export const logPageView = async (
  req: Request,
  userId?: string
): Promise<void> => {
  await logActivity({
    activityType: ActivityType.PAGE_VIEW,
    activityName: `Visit: ${req.path}`,
    userId,
    req,
  });
};

/**
 * Log Search Activity
 * Convenience function for logging search queries
 * 
 * Usage:
 * await logSearch(query, resultsCount, req);
 */
export const logSearch = async (
  query: string,
  resultsCount: number,
  req: Request
): Promise<void> => {
  await logActivity({
    activityType: ActivityType.SEARCH,
    activityName: `Search: "${query}"`,
    userId: req.user?.id,
    metadata: {
      query,
      resultsCount,
    },
    req,
  });
};

/**
 * Log Event View
 * Convenience function for logging event views
 * 
 * Usage:
 * await logEventView(eventId, eventTitle, req);
 */
export const logEventView = async (
  eventId: string,
  eventTitle: string,
  req: Request
): Promise<void> => {
  await logActivity({
    activityType: ActivityType.EVENT_VIEW,
    activityName: `View Event: ${eventTitle}`,
    userId: req.user?.id,
    entityType: EntityType.EVENT,
    entityId: eventId,
    req,
  });
};

/**
 * Log Booking Creation
 * Convenience function for logging booking creation
 * 
 * Usage:
 * await logBookingCreate(booking, req);
 */
export const logBookingCreate = async (
  bookingId: string,
  eventId: string,
  amount: number,
  req: Request
): Promise<void> => {
  await logActivity({
    activityType: ActivityType.BOOKING_CREATE,
    activityName: `Create Booking for Event #${eventId}`,
    userId: req.user?.id,
    entityType: EntityType.BOOKING,
    entityId: bookingId,
    metadata: {
      eventId,
      amount,
    },
    req,
  });
};

/**
 * Log User Authentication
 * Convenience function for logging login/signup
 * 
 * Usage:
 * await logAuth(ActivityType.LOGIN, userId, req);
 */
export const logAuth = async (
  activityType: ActivityType.LOGIN | ActivityType.SIGNUP | ActivityType.LOGOUT,
  userId: string,
  req: Request
): Promise<void> => {
  const activityNames = {
    [ActivityType.LOGIN]: 'User Login',
    [ActivityType.SIGNUP]: 'User Signup',
    [ActivityType.LOGOUT]: 'User Logout',
  };

  await logActivity({
    activityType,
    activityName: activityNames[activityType],
    userId,
    req,
  });
};

/**
 * Batch Log Activities
 * Log multiple activities at once (for bulk operations)
 * 
 * Usage:
 * await batchLogActivities([
 *   { activityType: ActivityType.EVENT_VIEW, activityName: 'View Event 1' },
 *   { activityType: ActivityType.EVENT_VIEW, activityName: 'View Event 2' },
 * ]);
 */
export const batchLogActivities = async (
  activities: ILogActivityParams[]
): Promise<void> => {
  try {
    const logs = activities.map(activity => {
      const userAgent = activity.req?.headers['user-agent'];
      const { device, browser, os } = parseUserAgent(userAgent);

      return {
        activityType: activity.activityType,
        activityName: activity.activityName,
        userId: activity.userId,
        sessionId: activity.sessionId || getSessionId(activity.req),
        page: activity.page || activity.req?.path,
        referrer: activity.referrer || (activity.req?.headers.referer as string),
        entityType: activity.entityType,
        entityId: activity.entityId,
        ipAddress: activity.req?.ip,
        userAgent,
        device,
        browser,
        os,
        duration: activity.duration,
        metadata: activity.metadata,
      };
    });

    await prisma.activityLog.createMany({
      data: logs,
      skipDuplicates: true,
    });
  } catch (error) {
    console.error('❌ Batch activity logging failed:', error);
  }
};
