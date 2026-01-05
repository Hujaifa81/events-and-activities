// Session Helper Functions
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import { redis } from '@/config';
import { prisma } from '@/shared/utils';

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
    console.log(`✅ Session ended: ${sessionId} for ${userInfo} (${duration}ms, ${session.requestCount} requests)`);
  } catch (error) {
    console.error('End session failed:', error);
  }
};
