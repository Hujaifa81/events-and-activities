import { Request } from 'express';
import { prisma } from '@/shared/utils/prisma';
import { UserRole } from '@prisma/client';

/**
 * Audit Configuration - Defines which actions should be audited for each role
 */
const AUDIT_ACTIONS = {
  // Admin & Moderator = Everything
  ADMIN: ['*'],
  SUPER_ADMIN: ['*'],
  MODERATOR: ['*'],

  // Host = Business-critical actions
  HOST: [
    'EVENT_CREATE',
    'EVENT_DELETE',
    'EVENT_CANCEL',
    'EVENT_PRICE_INCREASE',
    'EVENT_CAPACITY_REDUCE',
    'PAYOUT_REQUEST',
    'PAYOUT_ACCOUNT_ADD',
    'PAYOUT_ACCOUNT_UPDATE',
    'DISPUTE_RESPONSE',
  ],

  // User = Financial and safety actions
  USER: [
    'BOOKING_CREATE',
    'BOOKING_CANCEL',
    'PAYMENT_CREATE',
    'PAYMENT_FAILED',
    'REFUND_REQUEST',
    'CHARGEBACK_FILED',
    'ACCOUNT_DELETE',
    'REPORT_CREATE',
    'BLOCK_USER',
    'REVIEW_CREATE',
  ],
};

/**
 * Check if an action should be audited based on user role
 */
export const shouldAudit = (
  userRole: UserRole,
  action: string
): boolean => {
  const rules = AUDIT_ACTIONS[userRole];
  if (!rules) return false;

  // Admin/Moderator audit everything
  if (rules.includes('*')) return true;

  // Check specific actions
  return rules.includes(action);
};

/**
 * Calculate severity based on action type and metadata
 */
export const calculateSeverity = (
  action: string,
  metadata?: any
): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' => {
  // CRITICAL - Legal/Financial Risk
  if (action === 'ACCOUNT_DELETE') return 'CRITICAL';
  if (action === 'CHARGEBACK_FILED') return 'CRITICAL';
  if (action === 'EVENT_DELETE' && metadata?.bookingCount > 0)
    return 'CRITICAL';
  if (action === 'BAN' || action === 'SUSPEND') return 'CRITICAL';

  // WARNING - Business Impact
  if (action === 'EVENT_CANCEL' && metadata?.bookingCount > 5)
    return 'WARNING';
  if (
    action === 'BOOKING_CANCEL' &&
    metadata?.hoursBeforeEvent &&
    metadata.hoursBeforeEvent < 24
  )
    return 'WARNING';
  if (action === 'REFUND_REQUEST') return 'WARNING';
  if (action === 'REPORT_CREATE') return 'WARNING';
  if (action === 'REJECT') return 'WARNING';
  if (action === 'EVENT_PRICE_INCREASE' && metadata?.increasePercent > 20)
    return 'WARNING';

  // INFO - Normal Operations
  return 'INFO';
};

/**
 * Generate a diff between old and new values
 */
export const compareChanges = (
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Record<string, { old: any; new: any }> => {
  const changes: Record<string, { old: any; new: any }> = {};

  // Check all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  allKeys.forEach((key) => {
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];

    // Only track actual changes
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  });

  return changes;
};

/**
 * Interface for creating audit log
 */
interface CreateAuditLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

/**
 * Central function to create audit logs
 */
export const createAuditLog = async (
  params: CreateAuditLogParams
): Promise<void> => {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      description,
      oldValues,
      newValues,
      metadata,
      severity,
      ipAddress,
      userAgent,
      location,
    } = params;

    // Calculate changes if both old and new values provided
    const changes =
      oldValues && newValues ? compareChanges(oldValues, newValues) : null;

    // Auto-calculate severity if not provided
    const finalSeverity =
      severity || calculateSeverity(action, metadata || newValues);

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        description,
        oldValues: oldValues || null,
        newValues: newValues || null,
        changes: changes || null,
        metadata: metadata || null,
        severity: finalSeverity,
        ipAddress,
        userAgent,
        location,
      },
    });

    console.log(
      `[AUDIT] ${action} on ${entityType}:${entityId} by user:${userId} - ${finalSeverity}`
    );
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to create audit log:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
};

/**
 * Helper to create audit log from Express request
 */
export const createAuditLogFromRequest = async (
  req: Request,
  params: Omit<CreateAuditLogParams, 'ipAddress' | 'userAgent'>
): Promise<void> => {
  const userId = (req as any).user?.id;

  if (!userId) {
    console.warn('[AUDIT] No user ID found in request');
    return;
  }

  await createAuditLog({
    ...params,
    userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

/**
 * Check if user should be audited for specific action
 */
export const shouldAuditUser = async (
  userId: string,
  action: string
): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    return shouldAudit(user.role, action);
  } catch (error) {
    console.error('[AUDIT] Error checking audit eligibility:', error);
    return false;
  }
};
