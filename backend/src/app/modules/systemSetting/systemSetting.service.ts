/**
 * System Setting Service
 * Business logic for system configuration management
 */

import { prisma } from '@/shared/utils/prisma';
import { ApiError } from '@/app/errors';
import { SystemSetting } from '@prisma/client';
import {
  CreateSettingInput,
  UpdateSettingInput,
  QuerySettingsInput,
  SettingValueType,
  ParsedSetting,
  PublicSettingResponse,
  SettingsMap,
} from './systemSetting.interface';

/**
 * Parse setting value based on valueType
 */
const parseSettingValue = (
  value: string,
  valueType: SettingValueType
): string | number | boolean | Record<string, unknown> => {
  switch (valueType) {
    case SettingValueType.NUMBER:
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new ApiError(400, `Invalid number value: ${value}`);
      }
      return num;

    case SettingValueType.BOOLEAN:
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new ApiError(400, `Invalid boolean value: ${value}`);

    case SettingValueType.JSON:
      try {
        return JSON.parse(value);
      } catch {
        throw new ApiError(400, `Invalid JSON value: ${value}`);
      }

    case SettingValueType.STRING:
    default:
      return value;
  }
};

/**
 * Format setting with parsed value
 */
const formatParsedSetting = (setting: SystemSetting): ParsedSetting => {
  return {
    ...setting,
    value: parseSettingValue(
      setting.value,
      setting.valueType as SettingValueType
    ),
    rawValue: setting.value,
  };
};

/**
 * Get a single setting by key
 */
const getSetting = async (key: string): Promise<ParsedSetting> => {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new ApiError(404, `Setting '${key}' not found`);
  }

  return formatParsedSetting(setting);
};

/**
 * Get multiple settings with filters
 */
const getSettings = async (
  filters: QuerySettingsInput
): Promise<ParsedSetting[]> => {
  const { category, isPublic, searchTerm } = filters;

  const settings = await prisma.systemSetting.findMany({
    where: {
      ...(category && { category }),
      ...(isPublic !== undefined && { isPublic }),
      ...(searchTerm && {
        OR: [
          { key: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  return settings.map(formatParsedSetting);
};

/**
 * Get all public settings (for frontend)
 */
const getPublicSettings = async (): Promise<PublicSettingResponse[]> => {
  const settings = await prisma.systemSetting.findMany({
    where: { isPublic: true },
    select: {
      key: true,
      value: true,
      valueType: true,
    },
  });

  return settings.map((setting) => ({
    key: setting.key,
    value: parseSettingValue(
      setting.value,
      setting.valueType as SettingValueType
    ),
    valueType: setting.valueType as SettingValueType,
  }));
};

/**
 * Get bulk settings by keys
 */
const getBulkSettings = async (keys: string[]): Promise<SettingsMap> => {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: keys },
    },
  });

  // Create a map for quick access
  const settingsMap: SettingsMap = {};
  settings.forEach((setting) => {
    settingsMap[setting.key] = setting;
  });

  return settingsMap;
};

/**
 * Create a new setting
 */
const createSetting = async (
  data: CreateSettingInput,
  adminId: string
): Promise<ParsedSetting> => {
  // Validate value format before saving
  parseSettingValue(data.value, data.valueType);

  // Check if setting already exists
  const existing = await prisma.systemSetting.findUnique({
    where: { key: data.key },
  });

  if (existing) {
    throw new ApiError(409, `Setting '${data.key}' already exists`);
  }

  const setting = await prisma.systemSetting.create({
    data: {
      ...data,
      updatedBy: adminId,
    },
  });

  return formatParsedSetting(setting);
};

/**
 * Update an existing setting
 */
const updateSetting = async (
  key: string,
  data: UpdateSettingInput,
  adminId: string
): Promise<ParsedSetting> => {
  // Check if setting exists
  const existing = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!existing) {
    throw new ApiError(404, `Setting '${key}' not found`);
  }

  // Check if setting is editable
  if (!existing.isEditable) {
    throw new ApiError(403, `Setting '${key}' is not editable`);
  }

  // Validate new value format if provided
  if (data.value && data.valueType) {
    parseSettingValue(data.value, data.valueType);
  } else if (data.value) {
    parseSettingValue(data.value, existing.valueType as SettingValueType);
  }

  const setting = await prisma.systemSetting.update({
    where: { key },
    data: {
      ...data,
      updatedBy: adminId,
    },
  });

  return formatParsedSetting(setting);
};

/**
 * Delete a setting
 */
const deleteSetting = async (key: string): Promise<void> => {
  const existing = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!existing) {
    throw new ApiError(404, `Setting '${key}' not found`);
  }

  if (!existing.isEditable) {
    throw new ApiError(403, `Setting '${key}' cannot be deleted`);
  }

  await prisma.systemSetting.delete({
    where: { key },
  });
};

/**
 * Get setting value with type safety (helper for other services)
 */
const getSettingValue = async <T extends SettingValueType>(
  key: string
): Promise<string | number | boolean | Record<string, unknown>> => {
  const setting = await getSetting(key);
  return setting.value;
};

/**
 * Update setting value (helper for other services)
 */
const updateSettingValue = async (
  key: string,
  value: string,
  adminId: string
): Promise<void> => {
  await updateSetting(key, { value }, adminId);
};

export const SystemSettingService = {
  getSetting,
  getSettings,
  getPublicSettings,
  getBulkSettings,
  createSetting,
  updateSetting,
  deleteSetting,
  getSettingValue,
  updateSettingValue,
};
