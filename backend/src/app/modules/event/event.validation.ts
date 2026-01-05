// Event Validation Schemas
import { z } from 'zod';

/**
 * Reject Event Validation
 */
export const rejectEventSchema = z.object({
  body: z.object({
    reason: z
      .string({
        required_error: 'Rejection reason is required',
      })
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must not exceed 500 characters'),
    
    notifyHost: z.boolean().optional().default(true),
  }),
});

/**
 * Feature Event Validation
 */
export const featureEventSchema = z.object({
  body: z.object({
    featured: z.boolean({
      required_error: 'Featured status is required',
    }),
    
    featuredUntil: z.string().optional(),
    
    position: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional(),
  }),
});

/**
 * Suspend Event Validation
 */
export const suspendEventSchema = z.object({
  body: z.object({
    reason: z
      .string({
        required_error: 'Suspension reason is required',
      })
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason must not exceed 500 characters'),
    
    suspendUntil: z.string().optional(),
    
    notifyHost: z.boolean().optional().default(true),
  }),
});

export const EventValidation = {
  rejectEvent: rejectEventSchema,
  featureEvent: featureEventSchema,
  suspendEvent: suspendEventSchema,
};
