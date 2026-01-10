// Event Cron Jobs - Automated Featured Event Cleanup
import cron from 'node-cron';
import { prisma } from '@/shared/utils';
import { createAuditLog } from '@/shared/helper/auditHelper';
import { AuditAction, AuditEntityType } from '@prisma/client';

/**
 * Unfeature expired events and normalize featured positions
 * Call this before fetching featured events or on a schedule (cron)
 */

export const unfeatureExpiredAndNormalizePositions = async () => {
  // 1. Unfeature all events where featuredUntil < now
  const now = new Date();
  // Find all events to be unfeatured
  const expiredEvents = await prisma.event.findMany({
    where: {
      featured: true,
      featuredUntil: { not: null, lt: now },
    },
  });

  // Unfeature them and log audit
  for (const event of expiredEvents) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        featured: false,
        featuredUntil: null,
        featuredPosition: null,
      },
    });
    // Audit log for cron unfeature
    await createAuditLog({
      userId: 'system-cron',
      action: AuditAction.UNFEATURE,
      entityType: AuditEntityType.EVENT,
      entityId: event.id,
      description: 'Event automatically unfeatured by cron job (expired)',
      oldValues: {
        featured: event.featured,
        featuredUntil: event.featuredUntil,
        featuredPosition: event.featuredPosition,
      },
      newValues: {
        featured: false,
        featuredUntil: null,
        featuredPosition: null,
      },
      metadata: {
        reason: 'expired',
        triggeredBy: 'cron',
      },
      severity: 'INFO',
    });
  }


  // 2. Get all currently featured events, ordered by position
  const featuredEvents = await prisma.event.findMany({
    where: {
      featured: true,
      deletedAt: null,
      OR: [
        { featuredUntil: null },
        { featuredUntil: { gt: now } },
      ],
    },
    orderBy: { featuredPosition: 'asc' },
  });

  // 3. Normalize positions (1, 2, 3, ...)
  for (let i = 0; i < featuredEvents.length; i++) {
    const e = featuredEvents[i];
    if (e.featuredPosition !== i + 1) {
      await prisma.event.update({
        where: { id: e.id },
        data: { featuredPosition: i + 1 },
      });
    }
  }
}

/**
 * Setup Cron Job for Featured Event Cleanup
 * Runs every day at 12:30 AM
 * Cron: 30 0 * * *
 */
export function setupEventCronJobs() {
  console.log('🔄 Initializing event cron jobs...');

  cron.schedule('30 0 * * *', async () => {
    console.log('⏰ [CRON] Running featured event cleanup...');
    try {
      await unfeatureExpiredAndNormalizePositions();
      console.log('✅ [CRON] Featured event cleanup completed successfully');
    } catch (error) {
      console.error('❌ [CRON] Featured event cleanup failed:', error);
    }
  });

  console.log('✅ Event cron jobs initialized successfully');
  console.log('📅 Schedule:');
  console.log('   - Featured Event Cleanup: Every day at 12:30 AM');
}
