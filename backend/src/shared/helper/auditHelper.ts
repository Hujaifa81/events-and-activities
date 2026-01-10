/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from 'express';
import { prisma } from '@/shared/utils/prisma';
import { UserRole, Prisma, AuditAction, AuditEntityType } from '@prisma/client';
import geoip from 'geoip-lite';


/**
 * ============================================
 * AUDIT LOGGING SYSTEM - Implementation Guide
 * ============================================
 * 
 * WHEN TO ADD AUDIT LOGS:
 * 
 * 1. LOGIN/LOGOUT (auth.service.ts)
 *    - ✅ After successful login
 *    - ✅ After failed login attempts (track brute force)
 *    - ✅ On logout
 *    Example:
 *    await createAuditLog({
 *      userId: user.id,
 *      action: 'LOGIN',
 *      entityType: 'USER',
 *      entityId: user.id,
 *      description: 'User logged in',
 *      ipAddress: req.ip,
 *      userAgent: req.headers['user-agent']
 *    });
 * 
 * 2. BAN/RESTORE (admin.service.ts - CREATE THESE METHODS)
 *    - ✅ When admin bans a user (CRITICAL)
 *    - ✅ When admin restores banned user (WARNING)
 *    Example:
 *    await createAuditLog({
 *      userId: adminId,
 *      action: 'BAN',
 *      entityType: 'USER',
 *      entityId: bannedUserId,
 *      description: `Banned user: ${user.name}`,
 *      metadata: { reason: 'spam' }
 *    });
 * 
 * 3. VERIFY (user.service.ts)
 *    - ✅ Email verification
 *    - ✅ Phone verification
 *    - ✅ ID verification
 *    Example:
 *    await createAuditLog({
 *      userId: user.id,
 *      action: 'VERIFY',
 *      entityType: 'USER',
 *      entityId: user.id,
 *      description: 'Email verified',
 *      metadata: { verificationType: 'email' }
 *    });
 * 
 * 4. EVENT CREATION (event.controller.ts - TODO)
 *    - ✅ When HOST creates event
 *    Example:
 *    await createAuditLog({
 *      userId: hostId,
 *      action: 'CREATE',
 *      entityType: 'EVENT',
 *      entityId: event.id,
 *      description: `Created event: ${event.title}`,
 *      newValues: { title, price, capacity }
 *    });
 * 
 * 5. BOOKING CREATION/CANCEL (booking.controller.ts - TODO)
 *    - ✅ When USER creates booking
 *    - ✅ When USER cancels booking (WARNING)
 *    Example:
 *    await createAuditLog({
 *      userId: user.id,
 *      action: 'CREATE', // or 'DELETE' for cancel
 *      entityType: 'BOOKING',
 *      entityId: booking.id,
 *      description: 'Booking created'
 *    });
 * 
 * 6. ACCOUNT DELETION (user.service.ts - TODO)
 *    - ✅ When HOST/USER deletes account (CRITICAL)
 *    Example:
 *    await createAuditLog({
 *      userId: user.id,
 *      action: 'DELETE',
 *      entityType: 'USER',
 *      entityId: user.id,
 *      description: 'Account deleted',
 *      oldValues: { email, role, totalEvents }
 *    });
 * 
 * REMEMBER: Audit logging failures should NOT break main operations!
 * The createAuditLog function handles errors internally.
 */

/**
 * Audit Configuration - Defines which actions should be audited for each role
 * Uses generic actions from AuditAction enum + entityType for context
 * 
 * NOTE: LOGIN/LOGOUT are automatically audited for all roles (handled separately)
 */
const AUDIT_ACTIONS = {
  // Admin & Moderator = Everything
  ADMIN: ['*'],
  SUPER_ADMIN: ['*'],
  MODERATOR: ['*'],

  // Host = Business-critical actions (by entity type)
  HOST: {
    [AuditEntityType.EVENT]: [AuditAction.CREATE, AuditAction.DELETE, AuditAction.UPDATE,AuditAction.PUBLISHED, AuditAction.CANCELLED, AuditAction.POSTPONED],
    [AuditEntityType.PAYMENT]: [AuditAction.CREATE],
    [AuditEntityType.USER]: [AuditAction.DELETE, AuditAction.VERIFY],
  },

  // User = Financial and safety actions
  USER: {
    [AuditEntityType.BOOKING]: [AuditAction.CREATE, AuditAction.DELETE],
    [AuditEntityType.PAYMENT]: [AuditAction.CREATE],
    [AuditEntityType.REFUND]: [AuditAction.CREATE],
    [AuditEntityType.USER]: [AuditAction.DELETE, AuditAction.VERIFY],
    [AuditEntityType.REPORT]: [AuditAction.CREATE],
  },
};

/**
 * Check if an action should be audited based on user role, action, and entity type
 */
export const shouldAudit = (
  userRole: UserRole,
  action: AuditAction,
  entityType?: AuditEntityType
): boolean => {
  // Security-critical actions are ALWAYS audited for all users
  const alwaysAuditActions: AuditAction[] = [
    AuditAction.LOGIN,
    AuditAction.LOGOUT,
    AuditAction.BAN,
    AuditAction.RESTORE,
  ];
  if (alwaysAuditActions.includes(action)) return true;

  const rules = AUDIT_ACTIONS[userRole];
  if (!rules) return false;

  // Admin/Moderator audit everything
  if (Array.isArray(rules) && rules.includes('*')) return true;

  // For HOST/USER, check entity-specific rules
  if (typeof rules === 'object' && entityType) {
    const entityRules = (rules as Record<AuditEntityType, AuditAction[]>)[entityType];
    return entityRules ? entityRules.includes(action) : false;
  }

  return false;
};

/**
 * Calculate severity based on action, entity, and metadata
 */
export const calculateSeverity = (
  action: AuditAction,
  entityType?: AuditEntityType,
  metadata?: any
): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' => {
  // CRITICAL - Legal/Financial/Security Risk
  if (action === AuditAction.DELETE && entityType === AuditEntityType.USER) return 'CRITICAL';
  if (action === AuditAction.DELETE && entityType === AuditEntityType.EVENT && (metadata?.bookingCount ?? 0) > 0)
    return 'CRITICAL';
  if (action === AuditAction.BAN) return 'CRITICAL';
  if (action === AuditAction.POSTPONED && (metadata?.affectedBookings ?? 0) > 0) return 'CRITICAL'; // Postponement with bookings
  if (action === AuditAction.REJECT && entityType === AuditEntityType.EVENT && (metadata?.affectedBookings ?? 0) > 0)
    return 'CRITICAL'; // Rejecting event with bookings
  if (action === AuditAction.LOGIN && (metadata?.failedAttempts ?? 0) >= 3) return 'CRITICAL';
  if (action === AuditAction.LOGIN && metadata?.suspiciousLocation) return 'CRITICAL';

  // WARNING - Business Impact
  if (action === AuditAction.DELETE && entityType === AuditEntityType.BOOKING) return 'WARNING';
  if (action === AuditAction.CANCELLED) return 'WARNING';
  if (action === AuditAction.POSTPONED) return 'WARNING'; // Postponement without bookings
  if (action === AuditAction.REJECT && entityType === AuditEntityType.EVENT) return 'WARNING'; // Rejecting event without bookings
  if (action === AuditAction.UPDATE && entityType === AuditEntityType.EVENT && (metadata?.priceIncreasePercent ?? 0) > 20)
    return 'WARNING';
  if (action === AuditAction.CREATE && entityType === AuditEntityType.REPORT) return 'WARNING';
  if (action === AuditAction.CREATE && entityType === AuditEntityType.REFUND) return 'WARNING';
  if (action === AuditAction.RESTORE) return 'WARNING';

  // INFO - Normal Operations
  return 'INFO'; // LOGIN, LOGOUT, VERIFY, CREATE, UPDATE, APPROVE, etc.
};

/**
 * Generate a diff between old and new values
 */
export const compareChanges = (
  oldValues: any,
  newValues: any
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
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  description?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
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
      severity || calculateSeverity(action, entityType, metadata);

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        description,
        oldValues: oldValues ?? Prisma.DbNull,
        newValues: newValues ?? Prisma.DbNull,
        changes: changes ?? Prisma.DbNull,
        metadata: metadata ?? Prisma.DbNull,
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

// IP থেকে location detect
const getLocationFromIP = (ip: string): string | undefined => {
  const geo = geoip.lookup(ip);
  if (!geo) return undefined;
  
  return `${geo.city || 'Unknown'}, ${geo.country}`;
};
/**
 * Helper to create audit log from Express request
 */
export const createAuditLogFromRequest = async (
  req: Request,
  params: Omit<CreateAuditLogParams, 'ipAddress' | 'userAgent' | 'location'>
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
    location: getLocationFromIP(req.ip as string),
  });
};

/**
 * Check if user should be audited for specific action
 */
export const shouldAuditUser = async (
  userId: string,
  action: AuditAction
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
