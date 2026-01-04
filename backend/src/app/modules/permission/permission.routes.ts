// Permission Routes

import express from 'express';
import { PermissionController } from './permission.controller';
import { PermissionValidation } from './permission.validation';
import { checkAuth } from '../../middlewares/checkAuth';
import { checkPermission } from '../../middlewares/checkPermission';
import { validateRequest } from '@/app/middlewares';

const router = express.Router();

// Get all permissions (Admin only)
router.get(
  '/',
  checkAuth(),
  checkPermission('system:settings'),
  PermissionController.getAllPermissions
);

// Get user permissions
router.get(
  '/user/:userId',
  checkAuth(),
  PermissionController.getUserPermissions
);

// Check user permission
router.post(
  '/check',
  checkAuth(),
  validateRequest(PermissionValidation.checkPermission),
  PermissionController.checkUserPermission
);

// Grant permission to user (Admin only)
router.post(
  '/grant',
  checkAuth(),
  checkPermission('admin:manage_all'),
  validateRequest(PermissionValidation.grantPermission),
  PermissionController.grantPermission
);

// Revoke permission from user (Admin only)
router.post(
  '/revoke',
  checkAuth(),
  checkPermission('admin:manage_all'),
  validateRequest(PermissionValidation.revokePermission),
  PermissionController.revokePermission
);

// Remove permission override (Admin only)
router.delete(
  '/override',
  checkAuth(),
  checkPermission('admin:manage_all'),
  validateRequest(PermissionValidation.removePermissionOverride),
  PermissionController.removePermissionOverride
);

export const PermissionRoutes = router;
