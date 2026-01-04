// Stats Cron Jobs - Automated Statistics Generation
/* eslint-disable no-console */

import cron from 'node-cron';
import { StatsService } from './stats.service';

/**
 * Setup Cron Jobs for Automatic Stats Generation
 * Initializes all scheduled tasks for stats generation
 */
export function setupStatsCronJobs() {
  console.log('🔄 Initializing stats cron jobs...');

  /**
   * Daily Stats Generation
   * Runs every day at 12:05 AM
   * Cron: 5 0 * * * (minute hour day month weekday)
   */
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ [CRON] Running daily stats generation...');
    try {
      await StatsService.generateDailyStats();
      console.log('✅ [CRON] Daily stats generated successfully');
    } catch (error) {
      console.error('❌ [CRON] Daily stats generation failed:', error);
    }
  });

  /**
   * Weekly Stats Generation
   * Runs every Sunday at 12:10 AM
   * Cron: 10 0 * * 0 (0 = Sunday)
   */
  cron.schedule('10 0 * * 0', async () => {
    console.log('⏰ [CRON] Running weekly stats generation...');
    try {
      await StatsService.generateWeeklyStats();
      console.log('✅ [CRON] Weekly stats generated successfully');
    } catch (error) {
      console.error('❌ [CRON] Weekly stats generation failed:', error);
    }
  });

  /**
   * Monthly Stats Generation
   * Runs on the 1st of every month at 12:15 AM
   * Cron: 15 0 1 * *
   */
  cron.schedule('15 0 1 * *', async () => {
    console.log('⏰ [CRON] Running monthly stats generation...');
    try {
      await StatsService.generateMonthlyStats();
      console.log('✅ [CRON] Monthly stats generated successfully');
    } catch (error) {
      console.error('❌ [CRON] Monthly stats generation failed:', error);
    }
  });

  /**
   * Yearly Stats Generation
   * Runs on January 1st at 12:20 AM
   * Cron: 20 0 1 1 *
   */
  cron.schedule('20 0 1 1 *', async () => {
    console.log('⏰ [CRON] Running yearly stats generation...');
    try {
      await StatsService.generateYearlyStats();
      console.log('✅ [CRON] Yearly stats generated successfully');
    } catch (error) {
      console.error('❌ [CRON] Yearly stats generation failed:', error);
    }
  });

  console.log('✅ Stats cron jobs initialized successfully');
  console.log('📅 Schedule:');
  console.log('   - Daily:   Every day at 12:05 AM');
  console.log('   - Weekly:  Every Sunday at 12:10 AM');
  console.log('   - Monthly: 1st of every month at 12:15 AM');
  console.log('   - Yearly:  January 1st at 12:20 AM');
}
