/**
 * System Setting Controller
 * HTTP request handlers for settings management
 */

import { Request, Response } from 'express';
import { catchAsync, sendResponse } from '@/shared/utils';
import { SystemSettingService } from './systemSetting.service';
import {
  CreateSettingInput,
  UpdateSettingInput,
  QuerySettingsInput,
} from './systemSetting.interface';

/**
 * @route   GET /api/v1/settings
 * @desc    Get all settings (with filters)
 * @access  Admin
 */
const getSettings = catchAsync(async (req: Request, res: Response) => {
  const filters: QuerySettingsInput = {
    category: req.query.category as any,
    isPublic: req.query.isPublic === 'true' ? true : undefined,
    searchTerm: req.query.searchTerm as string,
  };

  const settings = await SystemSettingService.getSettings(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Settings retrieved successfully',
    data: settings,
  });
});

/**
 * @route   GET /api/v1/settings/public
 * @desc    Get all public settings (for frontend)
 * @access  Public
 */
const getPublicSettings = catchAsync(async (req: Request, res: Response) => {
  const settings = await SystemSettingService.getPublicSettings();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Public settings retrieved successfully',
    data: settings,
  });
});

/**
 * @route   GET /api/v1/settings/:key
 * @desc    Get a single setting by key
 * @access  Admin
 */
const getSetting = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;

  const setting = await SystemSettingService.getSetting(key);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting retrieved successfully',
    data: setting,
  });
});

/**
 * @route   POST /api/v1/settings/bulk
 * @desc    Get multiple settings by keys
 * @access  Admin
 */
const getBulkSettings = catchAsync(async (req: Request, res: Response) => {
  const { keys } = req.body;

  const settings = await SystemSettingService.getBulkSettings(keys);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Settings retrieved successfully',
    data: settings,
  });
});

/**
 * @route   POST /api/v1/settings
 * @desc    Create a new setting
 * @access  Admin/Super Admin
 */
const createSetting = catchAsync(async (req: Request, res: Response) => {
  const data: CreateSettingInput = req.body;
  const adminId = (req as any).user.id;

  const setting = await SystemSettingService.createSetting(data, adminId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Setting created successfully',
    data: setting,
  });
});

/**
 * @route   PATCH /api/v1/settings/:key
 * @desc    Update a setting
 * @access  Admin/Super Admin
 */
const updateSetting = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  const data: UpdateSettingInput = req.body;
  const adminId = (req as any).user.id;

  const setting = await SystemSettingService.updateSetting(key, data, adminId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting updated successfully',
    data: setting,
  });
});

/**
 * @route   DELETE /api/v1/settings/:key
 * @desc    Delete a setting
 * @access  Super Admin
 */
const deleteSetting = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;

  await SystemSettingService.deleteSetting(key);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting deleted successfully',
    data: null,
  });
});

export const SystemSettingController = {
  getSettings,
  getPublicSettings,
  getSetting,
  getBulkSettings,
  createSetting,
  updateSetting,
  deleteSetting,
};
