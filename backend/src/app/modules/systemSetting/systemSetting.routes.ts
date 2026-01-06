/**
 * System Setting Routes
 * API routes for settings management
 */

import express from 'express';
import { checkAuth } from '@/app/middlewares';
import { validateRequest } from '@/app/middlewares';
import { SystemSettingController } from './systemSetting.controller';
import {
  createSettingValidation,
  updateSettingValidation,
  getSettingValidation,
  querySettingsValidation,
  deleteSettingValidation,
  bulkGetSettingsValidation,
} from './systemSetting.validation';

const router = express.Router();

/**
 * Public Routes
 */

// Get all public settings (for frontend config)
router.get('/public', SystemSettingController.getPublicSettings);

/**
 * Admin Routes
 */

// Get all settings (with filters)
router.get(
  '/',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(querySettingsValidation),
  SystemSettingController.getSettings
);

// Get multiple settings by keys
router.post(
  '/bulk',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(bulkGetSettingsValidation),
  SystemSettingController.getBulkSettings
);

// Get single setting by key
router.get(
  '/:key',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(getSettingValidation),
  SystemSettingController.getSetting
);

// Create new setting
router.post(
  '/',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(createSettingValidation),
  SystemSettingController.createSetting
);

// Update setting
router.patch(
  '/:key',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(updateSettingValidation),
  SystemSettingController.updateSetting
);

// Delete setting (Super Admin only)
router.delete(
  '/:key',
  checkAuth('SUPER_ADMIN'),
  validateRequest(deleteSettingValidation),
  SystemSettingController.deleteSetting
);

export const SystemSettingRoutes = router;
