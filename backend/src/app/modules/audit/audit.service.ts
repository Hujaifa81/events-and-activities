// Audit Service - Query and analyze audit logs
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/utils/prisma';
import { ApiError } from '@/app/errors';
import { IAuditLogFilters, IAuditLog, IAuditLogStats } from './audit.interface';

/**
 * Get all audit logs with filters and pagination
 */
const getAllAuditLogs = async (filters: IAuditLogFilters) => {
  const {
    userId,
    action,
    entityType,
    entityId,
    severity,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (severity) where.severity = severity;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Execute query
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs as IAuditLog[],
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Get audit logs for specific user
 */
const getUserAuditLogs = async (userId: string, filters: IAuditLogFilters) => {
  return getAllAuditLogs({ ...filters, userId });
};

/**
 * Get audit logs for specific entity
 */
const getEntityAuditHistory = async (
  entityType: string,
  entityId: string,
  filters: IAuditLogFilters
) => {
  return getAllAuditLogs({ ...filters, entityType, entityId });
};

/**
 * Get audit log by ID
 */
const getAuditLogById = async (id: string) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!log) {
    throw new ApiError(404, 'Audit log not found');
  }

  return log;
};

/**
 * Get audit statistics
 */
const getAuditStats = async (filters: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}) => {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.userId) where.userId = filters.userId;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  // Run parallel queries for statistics
  const [
    totalLogs,
    byAction,
    bySeverity,
    byEntityType,
    topUsers,
    recentCritical,
  ] = await Promise.all([
    // Total count
    prisma.auditLog.count({ where }),

    // Group by action
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),

    // Group by severity
    prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),

    // Group by entity type
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    }),

    // Top users (most actions)
    prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),

    // Recent critical logs
    prisma.auditLog.findMany({
      where: { ...where, severity: 'CRITICAL' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  // Fetch user details for top users
  const userIds = topUsers.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Format statistics
  const stats: IAuditLogStats = {
    totalLogs,
    byAction: byAction.reduce(
      (acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      },
      {} as Record<string, number>
    ),
    bySeverity: bySeverity.reduce(
      (acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      },
      {} as Record<string, number>
    ),
    byEntityType: byEntityType.reduce(
      (acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      },
      {} as Record<string, number>
    ),
    topUsers: topUsers.map((item) => {
      const user = userMap.get(item.userId);
      return {
        userId: item.userId,
        username: user?.username || 'Unknown',
        count: item._count.userId,
      };
    }),
    recentCritical: recentCritical as IAuditLog[],
  };

  return stats;
};

/**
 * Search audit logs
 */
const searchAuditLogs = async (query: string, filters: IAuditLogFilters) => {
  const where: Prisma.AuditLogWhereInput = {
    OR: [
      { description: { contains: query, mode: 'insensitive' } },
      { entityId: { contains: query, mode: 'insensitive' } },
      { action: { contains: query, mode: 'insensitive' } },
    ],
  };

  // Add additional filters
  if (filters.userId) where.userId = filters.userId;
  if (filters.severity) where.severity = filters.severity;
  if (filters.entityType) where.entityType = filters.entityType;

  return getAllAuditLogs({ ...filters, ...where } as any);
};

/**
 * Get timeline of changes for an entity
 */
const getEntityTimeline = async (entityType: string, entityId: string) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return logs;
};

export const AuditService = {
  getAllAuditLogs,
  getUserAuditLogs,
  getEntityAuditHistory,
  getAuditLogById,
  getAuditStats,
  searchAuditLogs,
  getEntityTimeline,
};
