// Audit Routes
import express from 'express';
import { AuditController } from './audit.controller';
import { checkAuth } from '@/app/middlewares';
import { validateRequest } from '@/app/middlewares/validateRequest';
import { AuditValidation } from './audit.validation';

const router = express.Router();

/**
 * All audit routes require admin authentication
 */

// GET /api/v1/audit-logs - Get all audit logs with filters
router.get(
  '/',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AuditValidation.getAuditLogs),
  AuditController.getAllAuditLogs
);

// GET /api/v1/audit-logs/search - Search audit logs
router.get(
  '/search',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AuditValidation.searchAuditLogs),
  AuditController.searchAuditLogs
);

// GET /api/v1/audit-logs/stats - Get audit statistics
router.get(
  '/stats',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  validateRequest(AuditValidation.getAuditStats),
  AuditController.getAuditStats
);

// GET /api/v1/audit-logs/user/:userId - Get user's audit logs
router.get(
  '/user/:userId',
  checkAuth('ADMIN', 'SUPER_ADMIN', 'USER'), // Users can view their own
  AuditController.getUserAuditLogs
);

// GET /api/v1/audit-logs/entity/:entityType/:entityId - Get entity audit history
router.get(
  '/entity/:entityType/:entityId',
  checkAuth('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AuditController.getEntityAuditHistory
);

// GET /api/v1/audit-logs/timeline/:entityType/:entityId - Get entity timeline
router.get(
  '/timeline/:entityType/:entityId',
  checkAuth('ADMIN', 'SUPER_ADMIN', 'MODERATOR'),
  AuditController.getEntityTimeline
);

// GET /api/v1/audit-logs/:id - Get single audit log
router.get(
  '/:id',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  AuditController.getAuditLogById
);

export const AuditRoutes = router;
