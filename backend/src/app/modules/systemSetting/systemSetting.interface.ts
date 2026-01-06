/**
 * System Setting Types and Interfaces
 * Production-ready configuration management
 */

import { SystemSetting } from '@prisma/client';

/**
 * Setting Value Types
 */
export enum SettingValueType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}

/**
 * Setting Categories
 */
export enum SettingCategory {
  GENERAL = 'GENERAL',
  PAYMENT = 'PAYMENT',
  EMAIL = 'EMAIL',
  NOTIFICATION = 'NOTIFICATION',
  FEATURE_FLAGS = 'FEATURE_FLAGS',
  BUSINESS_RULES = 'BUSINESS_RULES',
  SECURITY = 'SECURITY',
  ANALYTICS = 'ANALYTICS',
}

/**
 * Predefined Setting Keys (Type-safe constants)
 */
export const SETTING_KEYS = {
  // Payment Settings
  PLATFORM_FEE_PERCENTAGE: 'PLATFORM_FEE_PERCENTAGE',
  MIN_BOOKING_AMOUNT: 'MIN_BOOKING_AMOUNT',
  MAX_BOOKING_AMOUNT: 'MAX_BOOKING_AMOUNT',
  REFUND_DEADLINE_DAYS: 'REFUND_DEADLINE_DAYS',
  AUTO_REFUND_ENABLED: 'AUTO_REFUND_ENABLED',
  PAYMENT_GATEWAY: 'PAYMENT_GATEWAY',

  // Feature Flags
  ENABLE_SOCIAL_LOGIN: 'ENABLE_SOCIAL_LOGIN',
  ENABLE_CHAT: 'ENABLE_CHAT',
  ENABLE_WISHLISTS: 'ENABLE_WISHLISTS',
  ENABLE_REVIEWS: 'ENABLE_REVIEWS',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',

  // Business Rules
  MAX_EVENTS_PER_HOST: 'MAX_EVENTS_PER_HOST',
  MAX_ATTENDEES_PER_EVENT: 'MAX_ATTENDEES_PER_EVENT',
  EVENT_APPROVAL_REQUIRED: 'EVENT_APPROVAL_REQUIRED',
  AUTO_APPROVE_VERIFIED_HOSTS: 'AUTO_APPROVE_VERIFIED_HOSTS',
  FEATURED_EVENT_PRICE: 'FEATURED_EVENT_PRICE',

  // Email Settings
  SUPPORT_EMAIL: 'SUPPORT_EMAIL',
  NOTIFICATION_EMAIL_ENABLED: 'NOTIFICATION_EMAIL_ENABLED',
  EMAIL_SIGNATURE: 'EMAIL_SIGNATURE',

  // General
  APP_NAME: 'APP_NAME',
  CONTACT_PHONE: 'CONTACT_PHONE',
  CONTACT_EMAIL: 'CONTACT_EMAIL',
  FACEBOOK_URL: 'FACEBOOK_URL',
  TWITTER_URL: 'TWITTER_URL',
  TERMS_URL: 'TERMS_URL',
} as const;

/**
 * Setting key type (for type safety)
 */
export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/**
 * Create Setting Input
 */
export interface CreateSettingInput {
  key: string;
  value: string;
  valueType: SettingValueType;
  category: SettingCategory;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
  validationRules?: Record<string, unknown>;
}

/**
 * Update Setting Input
 */
export interface UpdateSettingInput {
  value?: string;
  valueType?: SettingValueType;
  category?: SettingCategory;
  description?: string;
  isPublic?: boolean;
  isEditable?: boolean;
  validationRules?: Record<string, unknown>;
}

/**
 * Query Settings Input
 */
export interface QuerySettingsInput {
  category?: SettingCategory;
  isPublic?: boolean;
  searchTerm?: string;
}

/**
 * Typed Setting Value (parsed by type)
 */
export type TypedSettingValue<T extends SettingValueType> = T extends 'STRING'
  ? string
  : T extends 'NUMBER'
    ? number
    : T extends 'BOOLEAN'
      ? boolean
      : T extends 'JSON'
        ? Record<string, unknown>
        : unknown;

/**
 * Public Setting Response (for frontend)
 */
export interface PublicSettingResponse {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  valueType: SettingValueType;
}

/**
 * Bulk Settings Map
 */
export type SettingsMap = Record<string, SystemSetting>;

/**
 * Setting with parsed value
 */
export interface ParsedSetting extends Omit<SystemSetting, 'value'> {
  value: string | number | boolean | Record<string, unknown>;
  rawValue: string;
}
