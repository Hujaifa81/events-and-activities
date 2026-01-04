// Stats Controller - Dashboard Statistics Management

import { Request, Response } from 'express';
import { StatsService } from './stats.service';
import { catchAsync, sendResponse } from '@/shared';
import { StatsPeriod } from './stats.interface';
import { startOfWeek, startOfMonth, startOfYear, startOfDay } from 'date-fns';

/**
 * Get Dashboard Stats by Period
 * GET /api/stats/:period
 * @access Admin only
 */
const getStatsByPeriod = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.params;
  const { startDate, endDate, limit } = req.query;

  const stats = await StatsService.getStatsByPeriod(period as StatsPeriod, {
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${period} stats retrieved successfully`,
    data: stats,
  });
});

/**
 * Get Latest Stats (All Periods)
 * GET /api/stats/latest
 * @access Admin only
 */
const getLatestStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await StatsService.getLatestStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Latest stats retrieved successfully',
    data: stats,
  });
});

/**
 * Compare Stats Between Periods
 * GET /api/stats/compare/:period
 * @access Admin only
 */
const compareStats = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.params;
  const { date } = req.query;

  let currentDate = date ? new Date(date as string) : new Date();

  // Auto-convert to period start date for accurate comparison
  if (period === 'DAILY') {
    currentDate = startOfDay(currentDate); // Convert to start of day (midnight)
  } else if (period === 'WEEKLY') {
    currentDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // Convert to Sunday
  } else if (period === 'MONTHLY') {
    currentDate = startOfMonth(currentDate); // Convert to 1st of month
  } else if (period === 'YEARLY') {
    currentDate = startOfYear(currentDate); // Convert to Jan 1st
  }

  const comparison = await StatsService.compareStats(
    period as StatsPeriod,
    currentDate
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Stats comparison retrieved successfully',
    data: comparison,
  });
});

/**
 * Get Real-time Stats
 * GET /api/stats/realtime
 * @access Admin only
 */
const getRealTimeStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await StatsService.getRealTimeStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Real-time stats retrieved successfully',
    data: stats,
  });
});

/**
 * Generate Stats Manually (for testing or regeneration)
 * POST /api/stats/generate
 * @access Super Admin only
 */
const generateStats = catchAsync(async (req: Request, res: Response) => {
  const { period, date, forceRegenerate } = req.body;

  let result;

  switch (period) {
    case StatsPeriod.DAILY:
      result = await StatsService.generateDailyStats(
        date ? new Date(date) : undefined,
        forceRegenerate
      );
      break;
    case StatsPeriod.WEEKLY:
      result = await StatsService.generateWeeklyStats(
        date ? new Date(date) : undefined,
        forceRegenerate
      );
      break;
    case StatsPeriod.MONTHLY:
      result = await StatsService.generateMonthlyStats(
        date ? new Date(date) : undefined,
        forceRegenerate
      );
      break;
    case StatsPeriod.YEARLY:
      result = await StatsService.generateYearlyStats(
        date ? new Date(date) : undefined,
        forceRegenerate
      );
      break;
    default:
      throw new Error('Invalid period specified');
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `${period} stats generated successfully`,
    data: result,
  });
});

export const StatsController = {
  getStatsByPeriod,
  getLatestStats,
  compareStats,
  getRealTimeStats,
  generateStats,
};
