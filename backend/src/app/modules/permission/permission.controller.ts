// Permission Controller

import { Request, Response } from 'express';
import { PermissionService } from './permission.service';
import { catchAsync, sendResponse } from '@/shared';
import { UserRole } from '../user/user.interface';

// Get user permissions
const getUserPermissions = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userRole = req.user?.role as UserRole;

  const result = await PermissionService.getUserPermissions(userId, userRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User permissions retrieved successfully',
    data: result,
  });
});

// Grant permission to user
const grantPermission = catchAsync(async (req: Request, res: Response) => {
  const { userId, permission, expiresAt, reason, scope } = req.body;
  const grantedBy = req.user?.userId;

  const result = await PermissionService.grantPermission(
    userId,
    permission,
    grantedBy,
    { expiresAt, reason, scope }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permission granted successfully',
    data: result,
  });
});

// Revoke permission from user
const revokePermission = catchAsync(async (req: Request, res: Response) => {
  const { userId, permission, reason, scope } = req.body;
  const revokedBy = req.user?.userId;

  const result = await PermissionService.revokePermission(
    userId,
    permission,
    revokedBy,
    { reason, scope }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permission revoked successfully',
    data: result,
  });
});

// Remove permission override
const removePermissionOverride = catchAsync(async (req: Request, res: Response) => {
  const { userId, permission, scope } = req.body;

  const result = await PermissionService.removePermissionOverride(
    userId,
    permission,
    scope
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permission override removed successfully',
    data: result,
  });
});

// Get all permissions
const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await PermissionService.getAllPermissions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permissions retrieved successfully',
    data: result,
  });
});

// Check if user has permission
const checkUserPermission = catchAsync(async (req: Request, res: Response) => {
  const { userId, permission, resourceId } = req.body;
  const userRole = req.user?.role as UserRole;

  const result = await PermissionService.hasPermission(
    userId,
    userRole,
    permission,
    resourceId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Permission check completed',
    data: result,
  });
});

export const PermissionController = {
  getUserPermissions,
  grantPermission,
  revokePermission,
  removePermissionOverride,
  getAllPermissions,
  checkUserPermission,
};
