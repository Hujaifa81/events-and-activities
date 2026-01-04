// Stats Validation - Request Validation Schemas

import { z } from 'zod';

/**
 * Validation for getting stats by period
 * Params: period (DAILY | WEEKLY | MONTHLY | YEARLY)
 * Query: startDate, endDate, limit (optional)
 */
const getStatsByPeriod = z.object({
  params: z.object({
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      message: 'Period must be DAILY, WEEKLY, MONTHLY, or YEARLY',
    }),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

/**
 * Validation for comparing stats
 * Params: period
 * Query: date (optional)
 */
const compareStats = z.object({
  params: z.object({
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      message: 'Period must be DAILY, WEEKLY, MONTHLY, or YEARLY',
    }),
  }),
  query: z.object({
    date: z.string().datetime().optional(),
  }),
});

/**
 * Validation for manual stats generation
 * Body: period, date (optional), forceRegenerate (optional)
 */
const generateStats = z.object({
  body: z.object({
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      message: 'Period must be DAILY, WEEKLY, MONTHLY, or YEARLY',
    }),
    date: z.string().datetime().optional(),
    forceRegenerate: z.boolean().optional(),
  }),
});

export const StatsValidation = {
  getStatsByPeriod,
  compareStats,
  generateStats,
};
