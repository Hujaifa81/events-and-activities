// Event Routes
import express from 'express';
import { EventController } from './event.controller';
import { checkAuth } from '@/app/middlewares';

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

// POST /api/v1/events - Create new event
router.post('/', checkAuth, EventController.createEvent);

// PUT /api/v1/events/:id - Update event
router.put('/:id', checkAuth, EventController.updateEvent);

// DELETE /api/v1/events/:id - Delete event
router.delete('/:id', checkAuth, EventController.deleteEvent);

// POST /api/v1/events/:id/publish - Publish event
router.post('/:id/publish', checkAuth, EventController.publishEvent);

// POST /api/v1/events/:id/save - Save event to wishlist
router.post('/:id/save', checkAuth, EventController.saveEvent);

// POST /api/v1/events/:id/share - Share event
router.post('/:id/share', EventController.shareEvent);

export const EventRoutes = router;
