// Permission Service - Hybrid RBAC Implementation

import { UserRole } from '../user/user.interface';
import { prisma } from '@/shared';
import {
  PlatformPermission,
  ROLE_PERMISSIONS,
  IPermissionCheckResult,
  IGrantPermissionOptions,
  IRevokePermissionOptions,
  IUserPermissionsResponse,
} from './permission.interface';


// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Main permission check function (Hybrid approach)
 * 1. First checks base role permissions (fast)
 * 2. Then checks user-specific overrides (flexible)
 */
const hasPermission = async (
  userId: string,
  userRole: UserRole,
  permission: PlatformPermission,
  resourceId?: string
): Promise<IPermissionCheckResult> => {
  // Step 1: Check base role permissions (hardcoded - fast)
  const basePermissions = ROLE_PERMISSIONS[userRole];
  if (basePermissions?.includes(permission)) {
    return {
      granted: true,
      source: 'role',
      reason: `Base role ${userRole} has permission`,
    };
  }

  // Step 2: Check user-specific permission overrides (database)
  const userOverride = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: {
        name: permission,
        isActive: true,
      },
      type: 'GRANT',
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
      ...(resourceId && { scope: resourceId }),
    },
    include: {
      permission: true,
    },
  });

  if (userOverride) {
    return {
      granted: true,
      source: 'user_override',
      reason: 'User has explicit permission grant',
    };
  }

  // Step 3: Check if permission is explicitly revoked
  const revokedPermission = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: {
        name: permission,
        isActive: true,
      },
      type: 'REVOKE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
  });

  if (revokedPermission) {
    return {
      granted: false,
      source: 'denied',
      reason: 'Permission explicitly revoked',
    };
  }

  return {
    granted: false,
    source: 'denied',
    reason: 'Permission not granted',
  };
};

/**
 * Check multiple permissions (user must have ALL)
 */
const hasAllPermissions = async (
  userId: string,
  userRole: UserRole,
  permissions: PlatformPermission[]
): Promise<boolean> => {
  const checks = await Promise.all(
    permissions.map((perm) => hasPermission(userId, userRole, perm))
  );
  return checks.every((result) => result.granted);
};

/**
 * Check multiple permissions (user must have ANY)
 */
const hasAnyPermission = async (
  userId: string,
  userRole: UserRole,
  permissions: PlatformPermission[]
): Promise<boolean> => {
  const checks = await Promise.all(
    permissions.map((perm) => hasPermission(userId, userRole, perm))
  );
  return checks.some((result) => result.granted);
};

/**
 * Get all effective permissions for a user
 */
const getUserPermissions = async (
  userId: string,
  userRole: UserRole
): Promise<IUserPermissionsResponse> => {
  // Base role permissions
  const basePermissions = ROLE_PERMISSIONS[userRole] || [];
  const effectivePermissions = new Set(basePermissions);

  // Get user-specific overrides
  const overrides = await prisma.userPermission.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    include: {
      permission: true,
    },
  });

  const grantedPermissions: PlatformPermission[] = [];
  const revokedPermissions: PlatformPermission[] = [];

  // Apply overrides
  for (const override of overrides) {
    if (override.permission && override.permission.isActive) {
      const permName = override.permission.name as PlatformPermission;
      if (override.type === 'GRANT') {
        effectivePermissions.add(permName);
        grantedPermissions.push(permName);
      } else if (override.type === 'REVOKE') {
        effectivePermissions.delete(permName);
        revokedPermissions.push(permName);
      }
    }
  }

  return {
    basePermissions,
    grantedPermissions,
    revokedPermissions,
    effectivePermissions: Array.from(effectivePermissions),
  };
};

// ============================================
// PERMISSION MANAGEMENT FUNCTIONS
// ============================================

/**
 * Grant permission to a user
 */
const grantPermission = async (
  userId: string,
  permissionName: PlatformPermission,
  grantedBy: string,
  options?: IGrantPermissionOptions
) => {
  const permission = await prisma.permission.findUnique({
    where: { name: permissionName },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionName} not found`);
  }

  return prisma.userPermission.upsert({
    where: {
      userId_permissionId_scope: {
        userId,
        permissionId: permission.id,
        scope: (options?.scope ?? null) as string,
      },
    },
    create: {
      userId,
      permissionId: permission.id,
      type: 'GRANT',
      grantedBy,
      grantedAt: new Date(),
      expiresAt: options?.expiresAt,
      reason: options?.reason,
      scope: options?.scope,
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
    },
    update: {
      type: 'GRANT',
      grantedBy,
      grantedAt: new Date(),
      expiresAt: options?.expiresAt,
      reason: options?.reason,
      revokedBy: null,
      revokedAt: null,
      metadata: options?.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
    },
  });
};

/**
 * Revoke permission from a user
 */
const revokePermission = async (
  userId: string,
  permissionName: PlatformPermission,
  revokedBy: string,
  options?: IRevokePermissionOptions
) => {
  const permission = await prisma.permission.findUnique({
    where: { name: permissionName },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionName} not found`);
  }

  return prisma.userPermission.upsert({
    where: {
      userId_permissionId_scope: {
        userId,
        permissionId: permission.id,
        scope: (options?.scope ?? null) as string,
      },
    },
    create: {
      userId,
      permissionId: permission.id,
      type: 'REVOKE',
      revokedBy,
      revokedAt: new Date(),
      reason: options?.reason,
      scope: options?.scope,
    },
    update: {
      type: 'REVOKE',
      revokedBy,
      revokedAt: new Date(),
      reason: options?.reason,
    },
  });
};

/**
 * Remove permission override (revert to base role permissions)
 */
const removePermissionOverride = async (
  userId: string,
  permissionName: PlatformPermission,
  scope?: string
) => {
  const permission = await prisma.permission.findUnique({
    where: { name: permissionName },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionName} not found`);
  }

  return prisma.userPermission.deleteMany({
    where: {
      userId,
      permissionId: permission.id,
      scope: scope || null,
    },
  });
};

/**
 * Get all available permissions
 */
const getAllPermissions = async () => {
  return prisma.permission.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { action: 'asc' }],
  });
};

/**
 * Get role base permissions
 */
const getRolePermissions = (role: UserRole): PlatformPermission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

export const PermissionService = {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getUserPermissions,
  grantPermission,
  revokePermission,
  removePermissionOverride,
  getAllPermissions,
  getRolePermissions,
};
