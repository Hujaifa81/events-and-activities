/**
 * System Setting Validation Schemas
 * Zod validation for settings API
 */

import { z } from 'zod';
import { SettingCategory, SettingValueType } from './systemSetting.interface';

/**
 * Create Setting Validation
 */
export const createSettingValidation = z.object({
  body: z.object({
    key: z
      .string({
        required_error: 'Setting key is required',
      })
      .min(1, 'Setting key cannot be empty')
      .max(100, 'Setting key too long')
      .regex(
        /^[A-Z_]+$/,
        'Setting key must be uppercase with underscores only'
      ),

    value: z
      .string({
        required_error: 'Setting value is required',
      })
      .min(1, 'Setting value cannot be empty'),

    valueType: z.nativeEnum(SettingValueType, {
      required_error: 'Value type is required',
    }),

    category: z.nativeEnum(SettingCategory, {
      required_error: 'Category is required',
    }),

    description: z.string().optional(),

    isPublic: z.boolean().optional().default(false),

    isEditable: z.boolean().optional().default(true),

    validationRules: z.record(z.unknown()).optional(),
  }),
});

/**
 * Update Setting Validation
 */
export const updateSettingValidation = z.object({
  params: z.object({
    key: z.string({
      required_error: 'Setting key is required in params',
    }),
  }),

  body: z.object({
    value: z.string().min(1, 'Setting value cannot be empty').optional(),

    valueType: z.nativeEnum(SettingValueType).optional(),

    category: z.nativeEnum(SettingCategory).optional(),

    description: z.string().optional(),

    isPublic: z.boolean().optional(),

    isEditable: z.boolean().optional(),

    validationRules: z.record(z.unknown()).optional(),
  }),
});

/**
 * Get Setting by Key Validation
 */
export const getSettingValidation = z.object({
  params: z.object({
    key: z.string({
      required_error: 'Setting key is required',
    }),
  }),
});

/**
 * Query Settings Validation
 */
export const querySettingsValidation = z.object({
  query: z.object({
    category: z.nativeEnum(SettingCategory).optional(),

    isPublic: z
      .string()
      .transform((val) => val === 'true')
      .optional(),

    searchTerm: z.string().optional(),

    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

/**
 * Delete Setting Validation
 */
export const deleteSettingValidation = z.object({
  params: z.object({
    key: z.string({
      required_error: 'Setting key is required',
    }),
  }),
});

/**
 * Bulk Get Settings Validation
 */
export const bulkGetSettingsValidation = z.object({
  body: z.object({
    keys: z
      .array(z.string())
      .min(1, 'At least one key is required')
      .max(50, 'Maximum 50 keys allowed'),
  }),
});
