// Event Routes
import express from 'express';
import { EventController } from './event.controller';
import { checkAuth } from '@/app/middlewares';
import { validateRequest } from '@/app/middlewares/validateRequest';
import { EventValidation } from './event.validation';

const router = express.Router();

/**
 * ============================================
 * PUBLIC ROUTES (No Authentication)
 * ============================================
 */

// GET /api/v1/events - Get all events with filters (search, location, category, etc.)
router.get('/', EventController.getAllEvents);

// GET /api/v1/events/:id - Get single event by ID
router.get('/:id', EventController.getEventById);

// POST /api/v1/events/:id/share - Track event share (no auth required)
router.post('/:id/share', EventController.shareEvent);

/**
 * ============================================
 * PROTECTED ROUTES (Authentication Required)
 * ============================================
 */

// POST /api/v1/events - Create new event (HOST/ADMIN only)
router.post(
  '/',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.createEvent),
  EventController.createEvent
);

// PUT /api/v1/events/:id - Update event (HOST/ADMIN only)
router.put(
  '/:id',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.updateEvent),
  EventController.updateEvent
);

// DELETE /api/v1/events/:id - Soft delete event (HOST/ADMIN only)
router.delete(
  '/:id',
  checkAuth('HOST', 'ADMIN'),
  EventController.deleteEvent
);

// PATCH /api/v1/events/:id/status - Change event status (role-aware)
router.patch(
  '/:id/status',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.changeEventStatus),
  EventController.changeEventStatus
);

// POST /api/v1/events/:id/save - Save event to wishlist (USER/HOST/ADMIN)
// router.post(
//   '/:id/save',
//   checkAuth('USER', 'HOST', 'ADMIN'),
//   EventController.saveEvent
// );

// DELETE /api/v1/events/:id/unsave - Remove from wishlist (USER/HOST/ADMIN)
// TODO: Implement EventController.unsaveEvent
// router.delete(
//   '/:id/unsave',
//   checkAuth('USER', 'HOST', 'ADMIN'),
//   EventController.unsaveEvent
// );

// POST /api/v1/events/:id/save-toggle - Save or unsave event to wishlist (USER/HOST/ADMIN)
router.post(
  '/:id/save-toggle',
  checkAuth('USER', 'HOST', 'ADMIN'),
  EventController.toggleSaveEvent
);

// GET /api/v1/events/saved/my - Get user's saved events (USER/HOST/ADMIN)
// TODO: Implement EventController.getMySavedEvents
// router.get(
//   '/saved/my',
//   checkAuth('USER', 'HOST', 'ADMIN'),
//   EventController.getMySavedEvents
// );

// GET /api/v1/events/host/my - Get host's own events (HOST/ADMIN)
// TODO: Implement EventController.getMyEvents
// router.get(
//   '/host/my',
//   checkAuth('HOST', 'ADMIN'),
//   EventController.getMyEvents
// );

// POST /api/v1/events/:id/cancel - Cancel event (HOST/ADMIN)
// TODO: Implement EventController.cancelEvent
// router.post(
//   '/:id/cancel',
//   checkAuth('HOST', 'ADMIN'),
//   EventController.cancelEvent
// );

// POST /api/v1/events/:id/duplicate - Duplicate event for reuse (HOST/ADMIN)
// TODO: Implement EventController.duplicateEvent
// router.post(
//   '/:id/duplicate',
//   checkAuth('HOST', 'ADMIN'),
//   EventController.duplicateEvent
// );

/**
 * ============================================
 * ADMIN ROUTES (Admin/Moderator Only)
 * ============================================
 */

// GET /api/v1/events/admin/pending - Get pending approval events
router.get(
  '/admin/pending',
  checkAuth('ADMIN', 'MODERATOR'),
  EventController.getPendingEvents
);

// PUT /api/v1/events/admin/:id/approve - Approve event (DEPRECATED: Use PATCH /events/:id/status)
// router.put(
//   '/admin/:id/approve',
//   checkAuth('ADMIN', 'MODERATOR'),
//   EventController.approveEvent
// );

// PUT /api/v1/events/admin/:id/reject - Reject event (DEPRECATED: Use PATCH /events/:id/status)
// router.put(
//   '/admin/:id/reject',
//   checkAuth('ADMIN', 'MODERATOR'),
//   validateRequest(EventValidation.rejectEvent),
//   EventController.rejectEvent
// );

// PUT /api/v1/events/admin/:id/feature - Feature/unfeature event
router.put(
  '/admin/:id/feature',
  checkAuth('ADMIN'),
  validateRequest(EventValidation.featureEvent),
  EventController.featureEvent
);

// PUT /api/v1/events/admin/:id/suspend - Suspend event (DEPRECATED: Use PATCH /events/:id/status)
// router.put(
//   '/admin/:id/suspend',
//   checkAuth('ADMIN', 'MODERATOR'),
//   validateRequest(EventValidation.suspendEvent),
//   EventController.suspendEvent
// );

// DELETE /api/v1/events/admin/:id - Admin hard delete
router.delete(
  '/admin/:id',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  EventController.adminDeleteEvent
);

export const EventRoutes = router;
