// Activity Logger Middleware - Automatic Page View & Session Tracking
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/shared/utils';
import { redis } from '@/config';

/**
 * Activity Logger Middleware
 * Automatically tracks page views and manages session IDs
 * 
 * Features:
 * - Tracks GET requests as page views
 * - Creates and maintains session IDs in cookies
 * - Extracts user info from authenticated requests
 * - Non-blocking (won't break requests if logging fails)
 * 
 * Usage:
 * Add to server.ts or app.ts after authentication middleware:
 * app.use(activityLoggerMiddleware);
 */
export const activityLoggerMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Session Management
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
    const RENEW_THRESHOLD = 15 * 60 * 1000;  // Renew if less than 15 min left
    
    let sessionId = req.cookies?.sessionId;
    let shouldRenewCookie = false;

    if (!sessionId) {
      // New session - create ID
      sessionId = uuidv4();
      shouldRenewCookie = true;
    } else {
      // Existing session - check if needs renewal
      // Get session data from Redis to check age
      try {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await redis.get(sessionKey);
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const timeUntilExpiry = SESSION_DURATION - (Date.now() - session.lastActivity);
          
          // Renew cookie only if close to expiry (less than 15 min left)
          if (timeUntilExpiry < RENEW_THRESHOLD) {
            shouldRenewCookie = true;
          }
        } else {
          // Session expired in Redis, treat as new
          shouldRenewCookie = true;
        }
      } catch (err) {
        console.log(err);
        // Redis error - renew to be safe
        shouldRenewCookie = true;
      }
    }

    // Only set cookie if needed (optimization for production)
    if (shouldRenewCookie) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION,
      });
    }

    // Attach session ID to request for easy access
    req.sessionId = sessionId;

    // Note: Page view tracking removed for pure API backend
    // Use manual logging in controllers instead:
    // - logEventView() for event details
    // - logSearch() for search queries
    // - logActivity() for specific actions

    next();
  } catch (error) {
    // Never block the request due to logging errors
    // eslint-disable-next-line no-console
    console.error('Activity logger middleware error:', error);
    next();
  }
};

/**
 * Session Duration Tracker (Redis-based)
 * Tracks session start/end times for duration calculation
 * 
 * Usage:
 * Add before routes: app.use(sessionDurationTracker);
 */
export const sessionDurationTracker = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const sessionId = req.cookies?.sessionId || req.sessionId;

  if (sessionId) {
    try {
      const now = Date.now();
      const sessionKey = `session:${sessionId}`;
      const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
      const RENEW_THRESHOLD = 15 * 60 * 1000;  // Same as cookie threshold

      // Get existing session data
      const sessionData = await redis.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        const timeUntilExpiry = SESSION_DURATION - (now - session.lastActivity);
        
        // Only update if close to expiry (same logic as cookie renewal)
        if (timeUntilExpiry < RENEW_THRESHOLD) {
          session.lastActivity = now;
          session.requestCount++;

          // Store with 30 min expiry (same as cookie)
          await redis.setex(sessionKey, 1800, JSON.stringify(session));
        }
        // If > 15 min left, skip update (aligned with cookie logic)
      } else {
        // Create new session entry
        const newSession = {
          startTime: now,
          lastActivity: now,
          requestCount: 1,
        };

        // Store with 30 min expiry (same as cookie)
        await redis.setex(sessionKey, 1800, JSON.stringify(newSession));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session tracking failed:', error);
    }
  }

  next();
};

/**
 * Get Session Duration
 * Calculate how long a session has been active
 * 
 * Usage:
 * const duration = await getSessionDuration(req.sessionId);
 */
export const getSessionDuration = async (sessionId?: string): Promise<number> => {
  if (!sessionId) return 0;

  try {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) return 0;

    const session = JSON.parse(sessionData);
    return session.lastActivity - session.startTime;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get session duration:', error);
    return 0;
  }
};

/**
 * End Session
 * Mark session as ended and calculate final duration
 * Call this on logout
 * 
 * Usage:
 * await endSession(req.sessionId, req.user.id);
 */
export const endSession = async (
  sessionId?: string,
  userId?: string
): Promise<void> => {
  if (!sessionId) return;

  try {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) return;

    const session = JSON.parse(sessionData);
    const duration = session.lastActivity - session.startTime;

    // Build where clause with userId filter for security
    const whereClause: any = { sessionId };
    if (userId) {
      whereClause.userId = userId; // Ensure user can only end their own session
    }

    // Update all activity logs with this session to include duration
    await prisma.activityLog.updateMany({
      where: whereClause,
      data: { duration },
    });

    // Clean up from Redis
    await redis.del(sessionKey);

    const userInfo = userId ? `user ${userId}` : 'guest';
    // eslint-disable-next-line no-console
    console.log(`✅ Session ended: ${sessionId} for ${userInfo} (${duration}ms, ${session.requestCount} requests)`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('End session failed:', error);
  }
};

/**
 * Session Cleanup Job
 * Run periodically to clean up old sessions and calculate durations
 * 
 * Usage in cron:
 * cron.schedule('0 * * * *', sessionCleanupJob); // Every hour
 */
export const sessionCleanupJob = async (): Promise<void> => {
  try {
    // Get all unique sessions from last 24 hours that don't have duration set
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const sessions = await prisma.activityLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { not: null },
        createdAt: { gte: oneDayAgo },
        duration: null,
      },
    });

    // eslint-disable-next-line no-console
    console.log(`🔄 Processing ${sessions.length} sessions for duration calculation...`);

    // Calculate duration for each session
    for (const { sessionId } of sessions) {
      if (!sessionId) continue;

      const logs = await prisma.activityLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      if (logs.length > 0) {
        const firstLog = logs[0].createdAt;
        const lastLog = logs[logs.length - 1].createdAt;
        const duration = lastLog.getTime() - firstLog.getTime();

        // Update all logs in this session
        await prisma.activityLog.updateMany({
          where: { sessionId },
          data: { duration },
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Session cleanup completed`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Session cleanup job failed:', error);
  }
};


