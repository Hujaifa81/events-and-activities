// Activity Logger Middleware - Automatic Page View & Session Tracking
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
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


