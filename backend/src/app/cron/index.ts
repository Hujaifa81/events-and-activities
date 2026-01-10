// Cron Jobs Index - Centralized Cron Job Setup
/* eslint-disable no-console */


import { setupStatsCronJobs } from './statsCron';
import { startSessionCleanupCron } from './sessionCron';
import { setupEventCronJobs } from './eventCron';

/**
 * Initialize All Cron Jobs
 * Call this function once when server starts
 */
export function initializeCronJobs() {
  console.log('\n🚀 ==========================================');
  console.log('🚀 Starting Cron Jobs Initialization...');
  console.log('🚀 ==========================================\n');


  // Stats generation cron jobs
  setupStatsCronJobs();

  // Session cleanup cron job
  startSessionCleanupCron();

  // Event featured cleanup cron job
  setupEventCronJobs();

  console.log('\n✅ ==========================================');
  console.log('✅ All Cron Jobs Initialized Successfully!');
  console.log('✅ ==========================================\n');
}

// Export individual cron setup functions (if needed separately)
export { setupStatsCronJobs, startSessionCleanupCron, setupEventCronJobs };
