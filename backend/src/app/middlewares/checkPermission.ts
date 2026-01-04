// ============================================
// PERMISSION CHECK MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/app/errors';
import { catchAsync } from '@/shared';
import { PermissionService } from '@/app/modules/permission/permission.service';
import { PlatformPermission } from '@/app/modules/permission/permission.interface';


// ============================================
// MIDDLEWARE
// ============================================

/**
 * Check if user has required permission
 * Usage: router.post('/events', checkAuth, checkPermission('event:create'), createEvent)
 */
export const checkPermission = (
  permission: PlatformPermission,
  options?: {
    resourceIdParam?: string; // Request param name for resource ID
    throwError?: boolean; // Default: true
  }
) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Assuming checkAuth middleware sets req.user

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Extract resource ID if specified
    const resourceId = options?.resourceIdParam
      ? req.params[options.resourceIdParam]
      : undefined;

    // Check permission
    const result = await PermissionService.hasPermission(
      user.userId,
      user.role,
      permission,
      resourceId
    );

    if (!result.granted) {
      if (options?.throwError !== false) {
        throw new ApiError(
          403,
          `Access denied: ${result.reason || 'Insufficient permissions'}`
        );
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        reason: result.reason,
      });
    }

    // Permission granted
    next();
  });
};

/**
 * Check if user has ANY of the required permissions
 * Usage: router.get('/admin', checkAuth, checkAnyPermission(['admin:view', 'system:settings']), handler)
 */
export const checkAnyPermission = (permissions: PlatformPermission[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check each permission
    let granted = false;
    let lastReason = '';

    for (const permission of permissions) {
      const result = await PermissionService.hasPermission(user.userId, user.role, permission);
      if (result.granted) {
        granted = true;
        break;
      }
      lastReason = result.reason || 'Permission denied';
    }

    if (!granted) {
      throw new ApiError(403, `Access denied: ${lastReason}`);
    }

    next();
  });
};

/**
 * Check if user has ALL of the required permissions
 * Usage: router.post('/events', checkAuth, checkAllPermissions(['event:create', 'payment:create']), handler)
 */
export const checkAllPermissions = (permissions: PlatformPermission[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check each permission
    for (const permission of permissions) {
      const result = await PermissionService.hasPermission(user.userId, user.role, permission);
      if (!result.granted) {
        throw new ApiError(
          403,
          `Access denied: ${result.reason || 'Insufficient permissions'}`
        );
      }
    }

    next();
  });
};

/**
 * Attach user permissions to request object
 * Usage: router.get('/me', checkAuth, attachPermissions, handler)
 */
export const attachPermissions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Unauthorized');
    }

    // This will be implemented in permission.service
    // const permissions = await getUserPermissions(user.userId, user.role);
    // req.permissions = permissions;

    next();
  }
);

export default {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  attachPermissions,
};
