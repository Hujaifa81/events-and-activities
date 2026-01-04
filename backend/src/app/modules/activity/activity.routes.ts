// Activity Routes - Activity Log Management Endpoints

import express from 'express';
import { ActivityController } from './activity.controller';
import { checkAuth, validateRequest } from '@/app/middlewares';
import {
  getActivitiesQuerySchema,
  getUserTimelineQuerySchema,
  getPopularItemsQuerySchema,
  getAnalyticsQuerySchema,
  getSessionDetailsParamsSchema,
  getHeatmapQuerySchema,
  getUserBehaviorParamsSchema,
  deleteOldActivitiesQuerySchema,
} from './activity.validation';

const router = express.Router();

/**
 * @route   GET /api/activity
 * @desc    Get activity logs with filters
 * @access  Admin
 */
router.get(
  '/',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getActivitiesQuerySchema),
  ActivityController.getActivities
);

/**
 * @route   GET /api/activity/timeline/:userId
 * @desc    Get user activity timeline
 * @access  Admin or Own data
 */
router.get(
  '/timeline/:userId',
  checkAuth('SUPER_ADMIN', 'ADMIN', 'HOST', 'USER'),
  validateRequest(getUserTimelineQuerySchema),
  ActivityController.getUserActivityTimeline
);

/**
 * @route   GET /api/activity/popular/:entityType
 * @desc    Get popular items (events, pages, etc.)
 * @access  Admin
 */
router.get(
  '/popular/:entityType',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getPopularItemsQuerySchema),
  ActivityController.getPopularItems
);

/**
 * @route   GET /api/activity/analytics
 * @desc    Get activity analytics dashboard
 * @access  Admin
 */
router.get(
  '/analytics',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getAnalyticsQuerySchema),
  ActivityController.getActivityAnalytics
);

/**
 * @route   GET /api/activity/session/:sessionId
 * @desc    Get detailed session information
 * @access  Admin
 */
router.get(
  '/session/:sessionId',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getSessionDetailsParamsSchema),
  ActivityController.getSessionDetails
);

/**
 * @route   GET /api/activity/heatmap
 * @desc    Get activity heatmap (date x hour)
 * @access  Admin
 */
router.get(
  '/heatmap',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getHeatmapQuerySchema),
  ActivityController.getActivityHeatmap
);

/**
 * @route   GET /api/activity/behavior/:userId
 * @desc    Get user behavior patterns and insights
 * @access  Admin
 */
router.get(
  '/behavior/:userId',
  checkAuth('SUPER_ADMIN', 'ADMIN'),
  validateRequest(getUserBehaviorParamsSchema),
  ActivityController.getUserBehaviorPattern
);

/**
 * @route   DELETE /api/activity/cleanup
 * @desc    Delete old activity logs (retention policy)
 * @access  Super Admin only
 */
router.delete(
  '/cleanup',
  checkAuth('SUPER_ADMIN'),
  validateRequest(deleteOldActivitiesQuerySchema),
  ActivityController.deleteOldActivities
);

export const ActivityRoutes = router;
