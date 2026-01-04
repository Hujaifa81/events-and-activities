// Permission Module Interface

import { UserRole } from '../user/user.interface';

// ============================================
// PERMISSION TYPES
// ============================================

export type PlatformPermission =
  // Event Permissions
  | 'event:create'
  | 'event:read'
  | 'event:update'
  | 'event:delete'
  | 'event:publish'
  | 'event:unpublish'
  | 'event:manage_all'
  | 'event:approve'
  | 'event:reject'
  
  // User Permissions
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage'
  | 'user:view_all'
  | 'user:suspend'
  | 'user:ban'
  
  // Payment Permissions
  | 'payment:read'
  | 'payment:create'
  | 'payment:refund'
  | 'payment:manage'
  | 'payment:view_all'
  
  // Social Permissions
  | 'social:read'
  | 'social:create'
  | 'social:update'
  | 'social:delete'
  | 'social:manage'
  
  // Review Permissions
  | 'review:read'
  | 'review:create'
  | 'review:update'
  | 'review:delete'
  | 'review:moderate'
  
  // Moderation Permissions
  | 'moderation:view_reports'
  | 'moderation:resolve_reports'
  | 'moderation:ban_users'
  | 'moderation:delete_content'
  
  // Analytics Permissions
  | 'analytics:view'
  | 'analytics:export'
  | 'analytics:view_all'
  
  // System/Admin Permissions
  | 'system:settings'
  | 'system:feature_flags'
  | 'system:api_keys'
  | 'system:webhooks'
  | 'system:audit_logs'
  | 'admin:manage_all';

// ============================================
// ROLE-BASED PERMISSIONS (Hard-coded)
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, PlatformPermission[]> = {
  USER: [
    'event:read',
    'social:read',
    'social:create',
    'social:update',
    'social:delete',
    'review:read',
    'review:create',
    'payment:read',
    'payment:create',
  ],
  
  HOST: [
    'event:read',
    'event:create',
    'event:update',
    'event:delete',
    'event:publish',
    'event:unpublish',
    'social:read',
    'social:create',
    'social:update',
    'social:delete',
    'review:read',
    'review:create',
    'payment:read',
    'payment:create',
    'payment:manage',
    'analytics:view',
  ],
  
  MODERATOR: [
    'event:read',
    'event:approve',
    'event:reject',
    'user:read',
    'user:view_all',
    'social:read',
    'social:manage',
    'review:read',
    'review:moderate',
    'moderation:view_reports',
    'moderation:resolve_reports',
    'moderation:delete_content',
    'analytics:view',
  ],
  
  ADMIN: [
    'event:read',
    'event:create',
    'event:update',
    'event:delete',
    'event:manage_all',
    'event:approve',
    'event:reject',
    'user:read',
    'user:update',
    'user:manage',
    'user:view_all',
    'user:suspend',
    'payment:read',
    'payment:manage',
    'payment:view_all',
    'payment:refund',
    'social:read',
    'social:manage',
    'review:read',
    'review:moderate',
    'moderation:view_reports',
    'moderation:resolve_reports',
    'moderation:ban_users',
    'moderation:delete_content',
    'analytics:view',
    'analytics:view_all',
    'analytics:export',
    'system:audit_logs',
  ],
  
  SUPER_ADMIN: [
    'event:read',
    'event:create',
    'event:update',
    'event:delete',
    'event:manage_all',
    'event:approve',
    'event:reject',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage',
    'user:view_all',
    'user:suspend',
    'user:ban',
    'payment:read',
    'payment:create',
    'payment:manage',
    'payment:view_all',
    'payment:refund',
    'social:read',
    'social:manage',
    'review:read',
    'review:moderate',
    'moderation:view_reports',
    'moderation:resolve_reports',
    'moderation:ban_users',
    'moderation:delete_content',
    'analytics:view',
    'analytics:view_all',
    'analytics:export',
    'system:settings',
    'system:feature_flags',
    'system:api_keys',
    'system:webhooks',
    'system:audit_logs',
    'admin:manage_all',
  ],
};

// ============================================
// INTERFACES
// ============================================

export interface IPermissionCheckOptions {
  userId: string;
  permission: PlatformPermission;
  resourceId?: string;
  throwError?: boolean;
}

export interface IPermissionCheckResult {
  granted: boolean;
  source: 'role' | 'user_override' | 'denied';
  reason?: string;
}

export interface IGrantPermissionOptions {
  expiresAt?: Date;
  reason?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface IRevokePermissionOptions {
  reason?: string;
  scope?: string;
}

export interface IUserPermissionsResponse {
  basePermissions: PlatformPermission[];
  grantedPermissions: PlatformPermission[];
  revokedPermissions: PlatformPermission[];
  effectivePermissions: PlatformPermission[];
}
