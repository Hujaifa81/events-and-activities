// Audit Controller
import { Request, Response } from 'express';
import { catchAsync, sendResponse } from '@/shared';
import { AuditService } from './audit.service';

/**
 * Get all audit logs with filters
 * Admin only
 */
const getAllAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditService.getAllAuditLogs(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get single audit log by ID
 * Admin only
 */
const getAuditLogById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const log = await AuditService.getAuditLogById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit log retrieved successfully',
    data: log,
  });
});

/**
 * Get audit logs for specific user
 * Admin can view any user, users can view their own
 */
const getUserAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = (req as any).user.userId;
  const currentUserRole = (req as any).user.role;

  // Non-admins can only view their own logs
  if (
    currentUserRole !== 'ADMIN' &&
    currentUserRole !== 'SUPER_ADMIN' &&
    currentUserId !== userId
  ) {
    return sendResponse(res, {
      statusCode: 403,
      success: false,
      message: 'Not authorized to view these audit logs',
    });
  }

  const result = await AuditService.getUserAuditLogs(userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User audit logs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get audit history for specific entity
 * Shows complete timeline of changes
 */
const getEntityAuditHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;

    const result = await AuditService.getEntityAuditHistory(
      entityType,
      entityId,
      req.query
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Entity audit history retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  }
);

/**
 * Get entity timeline (chronological changes)
 */
const getEntityTimeline = catchAsync(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;

  const timeline = await AuditService.getEntityTimeline(entityType, entityId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Entity timeline retrieved successfully',
    data: timeline,
  });
});

/**
 * Get audit statistics
 * Admin only - Dashboard metrics
 */
const getAuditStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await AuditService.getAuditStats(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit statistics retrieved successfully',
    data: stats,
  });
});

/**
 * Search audit logs
 * Admin only
 */
const searchAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: 'Search query is required',
    });
  }

  const result = await AuditService.searchAuditLogs(q, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs search completed',
    meta: result.meta,
    data: result.data,
  });
});

export const AuditController = {
  getAllAuditLogs,
  getAuditLogById,
  getUserAuditLogs,
  getEntityAuditHistory,
  getEntityTimeline,
  getAuditStats,
  searchAuditLogs,
};
