// Audit Validation Schemas
import { z } from 'zod';

/**
 * Query filters validation
 */
export const getAuditLogsSchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Search validation
 */
export const searchAuditLogsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    entityType: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

/**
 * Stats filters validation
 */
export const getAuditStatsSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    userId: z.string().uuid().optional(),
  }),
});

export const AuditValidation = {
  getAuditLogs: getAuditLogsSchema,
  searchAuditLogs: searchAuditLogsSchema,
  getAuditStats: getAuditStatsSchema,
};
