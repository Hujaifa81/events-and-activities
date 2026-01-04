// Activity Controller - Activity Log Management

import { Request, Response } from 'express';
import { ActivityService } from './activity.service';
import { catchAsync, sendResponse } from '@/shared';

/**
 * Get Activities with Filters
 * GET /api/activity
 * @access Admin only
 */
const getActivities = catchAsync(async (req: Request, res: Response) => {
  const {
    userId,
    activityType,
    entityType,
    entityId,
    sessionId,
    startDate,
    endDate,
    device,
    browser,
    os,
    page,
    limit,
  } = req.query;

  const result = await ActivityService.getActivities({
    userId: userId as string,
    activityType: activityType as string,
    entityType: entityType as string,
    entityId: entityId as string,
    sessionId: sessionId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    device: device as string,
    browser: browser as string,
    os: os as string,
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Activities retrieved successfully',
    data: result.data,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
    },
  });
});

/**
 * Get User Activity Timeline
 * GET /api/activity/timeline/:userId
 * @access Admin only (or own timeline if user)
 */
const getUserActivityTimeline = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { days } = req.query;

    // Check permission: Admin or own data
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.userId !== userId) {
      return sendResponse(res, {
        statusCode: 403,
        success: false,
        message: 'Access denied',
        data: null,
      });
    }

    const timeline = await ActivityService.getUserActivityTimeline(
      userId,
      days ? parseInt(days as string) : undefined
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User activity timeline retrieved successfully',
      data: timeline,
    });
  }
);

/**
 * Get Popular Items
 * GET /api/activity/popular/:entityType
 * @access Admin only
 */
const getPopularItems = catchAsync(async (req: Request, res: Response) => {
  const { entityType } = req.params;
  const { limit, days } = req.query;

  const items = await ActivityService.getPopularItems(
    entityType,
    limit ? parseInt(limit as string) : undefined,
    days ? parseInt(days as string) : undefined
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Popular ${entityType}s retrieved successfully`,
    data: items,
  });
});

/**
 * Get Activity Analytics
 * GET /api/activity/analytics
 * @access Admin only
 */
const getActivityAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analytics = await ActivityService.getActivityAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Activity analytics retrieved successfully',
      data: analytics,
    });
  }
);

/**
 * Get Session Details
 * GET /api/activity/session/:sessionId
 * @access Admin only
 */
const getSessionDetails = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await ActivityService.getSessionDetails(sessionId);

  if (!session) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Session not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Session details retrieved successfully',
    data: session,
  });
});

/**
 * Get Activity Heatmap
 * GET /api/activity/heatmap
 * @access Admin only
 */
const getActivityHeatmap = catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;

  const heatmap = await ActivityService.getActivityHeatmap(
    days ? parseInt(days as string) : undefined
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Activity heatmap retrieved successfully',
    data: heatmap,
  });
});

/**
 * Get User Behavior Pattern
 * GET /api/activity/behavior/:userId
 * @access Admin only
 */
const getUserBehaviorPattern = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const pattern = await ActivityService.getUserBehaviorPattern(userId);

    if (!pattern) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: 'No activity data found for user',
        data: null,
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User behavior pattern retrieved successfully',
      data: pattern,
    });
  }
);

/**
 * Delete Old Activities (Admin Only)
 * DELETE /api/activity/cleanup
 * @access Super Admin only
 */
const deleteOldActivities = catchAsync(async (req: Request, res: Response) => {
  const { days } = req.query;

  const count = await ActivityService.deleteOldActivities(
    days ? parseInt(days as string) : undefined
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Successfully deleted ${count} old activity logs`,
    data: { deletedCount: count },
  });
});

export const ActivityController = {
  getActivities,
  getUserActivityTimeline,
  getPopularItems,
  getActivityAnalytics,
  getSessionDetails,
  getActivityHeatmap,
  getUserBehaviorPattern,
  deleteOldActivities,
};
