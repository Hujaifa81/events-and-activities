// Event Routes
import express from 'express';
import { EventController } from './event.controller';
import { checkAuth } from '@/app/middlewares';
import { validateRequest } from '@/app/middlewares/validateRequest';
import { EventValidation } from './event.validation';

const router = express.Router();

/**
 * Public Routes (No authentication required)
 */

// GET /api/v1/events - Get all events with filters
router.get('/', EventController.getAllEvents);

// GET /api/v1/events/nearby - Get nearby events
router.get('/nearby', EventController.getNearbyEvents);

// GET /api/v1/events/category/:categoryId - Get events by category
router.get('/category/:categoryId', EventController.getEventsByCategory);

// GET /api/v1/events/:id - Get single event
router.get('/:id', EventController.getEventById);

/**
 * Protected Routes (Authentication required)
 */

// POST /api/v1/events - Create new event (with validation)
router.post(
  '/',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.createEvent),
  EventController.createEvent
);

// PUT /api/v1/events/:id - Update event (with validation)
router.put(
  '/:id',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.updateEvent),
  EventController.updateEvent
);

// DELETE /api/v1/events/:id - Delete event
router.delete('/:id', checkAuth('HOST', 'ADMIN'), EventController.deleteEvent);

// POST /api/v1/events/:id/publish - Publish event (with validation)
router.post(
  '/:id/publish',
  checkAuth('HOST', 'ADMIN'),
  validateRequest(EventValidation.publishEvent),
  EventController.publishEvent
);

// POST /api/v1/events/:id/save - Save event to wishlist
router.post('/:id/save', checkAuth('USER', 'HOST', 'ADMIN'), EventController.saveEvent);

// POST /api/v1/events/:id/share - Share event
router.post('/:id/share', EventController.shareEvent);

/**
 * Admin Routes (Admin/Moderator only)
 */

// GET /api/v1/events/admin/pending - Get pending events
router.get(
  '/admin/pending',
  checkAuth('ADMIN', 'MODERATOR'),
  EventController.getPendingEvents
);

// PUT /api/v1/events/:id/approve - Approve event
router.put(
  '/:id/approve',
  checkAuth('ADMIN', 'MODERATOR'),
  EventController.approveEvent
);

// PUT /api/v1/events/:id/reject - Reject event
router.put(
  '/:id/reject',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(EventValidation.rejectEvent),
  EventController.rejectEvent
);

// PUT /api/v1/events/:id/feature - Feature/unfeature event
router.put(
  '/:id/feature',
  checkAuth('ADMIN'),
  validateRequest(EventValidation.featureEvent),
  EventController.featureEvent
);

// PUT /api/v1/events/:id/suspend - Suspend event
router.put(
  '/:id/suspend',
  checkAuth('ADMIN', 'MODERATOR'),
  validateRequest(EventValidation.suspendEvent),
  EventController.suspendEvent
);

// DELETE /api/v1/events/:id/admin - Admin delete (permanent)
router.delete(
  '/:id/admin',
  checkAuth('ADMIN', 'SUPER_ADMIN'),
  EventController.adminDeleteEvent
);

export const EventRoutes = router;
