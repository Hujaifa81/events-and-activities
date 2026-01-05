// Stats Routes - Dashboard Statistics API Endpoints

import { Router } from 'express';
import { StatsController } from './stats.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { StatsValidation } from './stats.validation';
import { checkAuth } from '../../middlewares/checkAuth';
import { checkPermission } from '../../middlewares/checkPermission';

const router = Router();

/**
 * @route   GET /api/stats/latest
 * @desc    Get latest stats for all periods (daily, weekly, monthly, yearly)
 * @access  Admin
 */
router.get(
  '/latest',
  checkAuth(),
  checkPermission('analytics:view_all'),
  StatsController.getLatestStats
);

/**
 * @route   GET /api/stats/realtime
 * @desc    Get real-time stats (not cached)
 * @access  Admin
 */
router.get(
  '/realtime',
  checkAuth(),
  checkPermission('analytics:view_all'),
  StatsController.getRealTimeStats
);

/**
 * @route   GET /api/stats/sessions/active
 * @desc    Get all currently active user sessions
 * @access  Admin
 */
router.get(
  '/sessions/active',
  checkAuth(),
  checkPermission('analytics:view_all'),
  StatsController.getActiveSessions
);

/**
 * @route   GET /api/stats/system/metrics
 * @desc    Get system health and session analytics
 * @access  Admin
 */
router.get(
  '/system/metrics',
  checkAuth(),
  checkPermission('analytics:view_all'),
  StatsController.getSystemMetrics
);

/**
 * @route   GET /api/stats/user/:userId/activity
 * @desc    Get detailed activity report for a specific user
 * @access  Admin
 */
router.get(
  '/user/:userId/activity',
  checkAuth(),
  checkPermission('analytics:view_all'),
  StatsController.getUserActivityReport
);

/**
 * @route   GET /api/stats/compare/:period
 * @desc    Compare stats between current and previous period
 * @access  Admin
 * @params  period - DAILY | WEEKLY | MONTHLY | YEARLY
 * @query   date - Optional date for comparison
 */
router.get(
  '/compare/:period',
  checkAuth(),
  checkPermission('analytics:view_all'),
  validateRequest(StatsValidation.compareStats),
  StatsController.compareStats
);

/**
 * @route   GET /api/stats/:period
 * @desc    Get stats by period
 * @access  Admin
 * @params  period - DAILY | WEEKLY | MONTHLY | YEARLY
 * @query   startDate, endDate, limit (optional)
 */
router.get(
  '/:period',
  checkAuth(),
  checkPermission('analytics:view_all'),
  validateRequest(StatsValidation.getStatsByPeriod),
  StatsController.getStatsByPeriod
);

/**
 * @route   POST /api/stats/generate
 * @desc    Manually generate stats for a specific period
 * @access  Super Admin only
 * @body    { period: string, date?: string, forceRegenerate?: boolean }
 */
router.post(
  '/generate',
  checkAuth(),
  checkPermission('admin:manage_all'),
  validateRequest(StatsValidation.generateStats),
  StatsController.generateStats
);

export const StatsRoutes = router;
