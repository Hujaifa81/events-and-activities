// Session Cleanup Cron Job
/* eslint-disable no-console */
import cron from 'node-cron';
import { prisma } from '@/shared/utils';

/**
 * Session Cleanup Job
 * Calculate durations for abandoned sessions
 */
async function sessionCleanupJob(): Promise<void> {
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

    console.log(`✅ Session cleanup completed`);
  } catch (error) {
    console.error('❌ Session cleanup job failed:', error);
  }
}

/**
 * Start Session Cleanup Cron
 * Runs every hour to calculate durations for abandoned sessions
 * (sessions where user closed browser without logging out)
 */
export const startSessionCleanupCron = () => {
  // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [CRON] Starting session cleanup job...');
    try {
      await sessionCleanupJob();
    } catch (error) {
      console.error('❌ [CRON] Session cleanup failed:', error);
    }
  });

  console.log('✅ Session cleanup cron job scheduled (runs every hour)');
};
