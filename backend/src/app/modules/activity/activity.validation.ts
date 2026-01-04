// Activity Validation - Zod Schemas

import { z } from 'zod';

/**
 * Get Activities Query Schema
 * Validates query parameters for activity filtering
 */
export const getActivitiesQuerySchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    activityType: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    sessionId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    device: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    page: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive())
      .optional(),
    limit: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive().max(100))
      .optional(),
  }),
});

/**
 * Get User Timeline Query Schema
 */
export const getUserTimelineQuerySchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  query: z.object({
    days: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive().max(365))
      .optional(),
  }),
});

/**
 * Get Popular Items Query Schema
 */
export const getPopularItemsQuerySchema = z.object({
  params: z.object({
    entityType: z.string(),
  }),
  query: z.object({
    limit: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive().max(100))
      .optional(),
    days: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive().max(365))
      .optional(),
  }),
});

/**
 * Get Analytics Query Schema
 */
export const getAnalyticsQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

/**
 * Get Session Details Params Schema
 */
export const getSessionDetailsParamsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
});

/**
 * Get Heatmap Query Schema
 */
export const getHeatmapQuerySchema = z.object({
  query: z.object({
    days: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive().max(365))
      .optional(),
  }),
});

/**
 * Get User Behavior Params Schema
 */
export const getUserBehaviorParamsSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

/**
 * Delete Old Activities Query Schema
 */
export const deleteOldActivitiesQuerySchema = z.object({
  query: z.object({
    days: z
      .string()
      .transform(val => parseInt(val))
      .pipe(z.number().int().positive())
      .default(90),
  }),
});
