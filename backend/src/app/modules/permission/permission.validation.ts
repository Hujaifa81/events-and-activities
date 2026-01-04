// Permission Validation

import { z } from 'zod';

const grantPermission = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
    permission: z.string({
      message: 'Permission is required',
    }),
    reason: z.string().optional(),
    scope: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

const revokePermission = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
    permission: z.string({
      message: 'Permission is required',
    }),
    reason: z.string().optional(),
    scope: z.string().optional(),
  }),
});

const removePermissionOverride = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
    permission: z.string({
      message: 'Permission is required',
    }),
    scope: z.string().optional(),
  }),
});

const checkPermission = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
    permission: z.string({
      message: 'Permission is required',
    }),
    resourceId: z.string().optional(),
  }),
});

export const PermissionValidation = {
  grantPermission,
  revokePermission,
  removePermissionOverride,
  checkPermission,
};
