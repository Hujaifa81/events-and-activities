// Event Controller - Complete Activity Logging Example
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express';
import { catchAsync, sendResponse } from '@/shared';
import { 
  logEventView, 
  logSearch, 
  logActivity 
} from '@/shared/helper/activityLogger';
import { ActivityType, EntityType } from '@/shared/constants/activityTypes';
import { EventService } from './event.service';

/**
 * Get All Events (with Search & Filters)
 * Tracks: Search queries
 */
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const { search, category, city } = req.query;
  const userId = (req as any).user?.userId;

  // 1. Fetch events
  const result = await EventService.getAllEvents(req.query);

  // 2. Track search activity (if search query exists)
  if (search) {
    logSearch(
      search as string,
      result.data.length,
      req,
      userId
    ).catch(err => console.error('Search tracking failed:', err));
  }

  // 3. Track category browsing
  if (category) {
    logActivity({
      activityType: ActivityType.CATEGORY_VIEW,
      activityName: `Browsed ${category} category`,
      userId,
      entityType: EntityType.EVENT,
      metadata: {
        category,
        resultCount: result.data.length,
        filters: { city },
      },
      req,
    }).catch(err => console.error('Category tracking failed:', err));
  }

  // 4. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get Single Event Details
 * Tracks: Event views
 */
const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user?.userId;

  // 1. Fetch event details
  const event = await EventService.getEventById(id);

  // 2. Track event view (non-blocking)
  logEventView(id, event.title, req, userId).catch(err => 
    console.error('Event view tracking failed:', err)
  );

  // 3. Increment view count in database (optional)
  EventService.incrementViewCount(id).catch(err =>
    console.error('View count update failed:', err)
  );

  // 4. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event retrieved successfully',
    data: event,
  });
});

/**
 * Create New Event
 * Tracks: Event creation
 */
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId; // Required (authenticated)

  // 1. Create event
  const event = await EventService.createEvent(userId, req.body);

  // 2. Track event creation
  await logActivity({
    activityType: ActivityType.EVENT_CREATE,
    activityName: 'Event Created',
    userId,
    entityType: EntityType.EVENT,
    entityId: event.id,
    metadata: {
      title: event.title,
      type: event.type,
      categoryId: event.categoryId,
      startDate: event.startDate,
      isFree: event.isFree,
      price: event.price,
    },
    req,
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Event created successfully',
    data: event,
  });
});

/**
 * Update Event
 * Tracks: Event updates
 */
const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  // 1. Update event
  const event = await EventService.updateEvent(id, userId, req.body);

  // 2. Track event update
  await logActivity({
    activityType: ActivityType.EVENT_UPDATE,
    activityName: 'Event Updated',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event.title,
      updatedFields: Object.keys(req.body),
    },
    req,
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event updated successfully',
    data: event,
  });
});

/**
 * Delete Event
 * Tracks: Event deletion
 */
const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  // 1. Get event details before deletion
  const event = await EventService.getEventById(id);

  // 2. Delete event
  await EventService.deleteEvent(id, userId);

  // 3. Track event deletion
  await logActivity({
    activityType: ActivityType.EVENT_DELETE,
    activityName: 'Event Deleted',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event.title,
      deletedAt: new Date().toISOString(),
    },
    req,
  });

  // 4. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event deleted successfully',
  });
});

/**
 * Publish Event (Draft → Published)
 * Tracks: Event publishing
 */
const publishEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  // 1. Publish event
  const event = await EventService.publishEvent(id, userId);

  // 2. Track event publishing
  await logActivity({
    activityType: ActivityType.EVENT_PUBLISH,
    activityName: 'Event Published',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event.title,
      publishedAt: event.publishedAt,
    },
    req,
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event published successfully',
    data: event,
  });
});

/**
 * Save Event to Wishlist
 * Tracks: Event saves
 */
const saveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  // 1. Save event
  const savedEvent = await EventService.saveEvent(id, userId);

  // 2. Track save action
  await logActivity({
    activityType: ActivityType.EVENT_SAVE,
    activityName: 'Event Saved',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: savedEvent.event.title,
    },
    req,
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event saved to wishlist',
    data: savedEvent,
  });
});

/**
 * Share Event
 * Tracks: Event shares
 */
const shareEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { platform } = req.body; // facebook, twitter, whatsapp, etc.
  const userId = (req as any).user?.userId;

  // 1. Get event details
  const event = await EventService.getEventById(id);

  // 2. Track share action
  await logActivity({
    activityType: ActivityType.SHARE,
    activityName: 'Event Shared',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event.title,
      platform,
      shareUrl: `${process.env.FRONTEND_URL}/events/${id}`,
    },
    req,
  });

  // 3. Increment share count
  EventService.incrementShareCount(id).catch(err =>
    console.error('Share count update failed:', err)
  );

  // 4. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event shared successfully',
    data: {
      shareUrl: `${process.env.FRONTEND_URL}/events/${id}`,
    },
  });
});

/**
 * Get Events by Category
 * Tracks: Category browsing
 */
const getEventsByCategory = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const userId = (req as any).user?.userId;

  // 1. Fetch events
  const result = await EventService.getEventsByCategory(categoryId, req.query);

  // 2. Track category view
  logActivity({
    activityType: ActivityType.CATEGORY_VIEW,
    activityName: 'Category Browsed',
    userId,
    entityType: EntityType.EVENT,
    metadata: {
      categoryId,
      resultCount: result.data.length,
    },
    req,
  }).catch(err => console.error('Category tracking failed:', err));

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Events retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Get Nearby Events (Location-based)
 * Tracks: Location searches
 */
const getNearbyEvents = catchAsync(async (req: Request, res: Response) => {
  const { latitude, longitude, radius } = req.query;
  const userId = (req as any).user?.userId;

  // 1. Fetch nearby events
  const result = await EventService.getNearbyEvents(
    Number(latitude),
    Number(longitude),
    Number(radius) || 10 // Default 10km
  );

  // 2. Track location-based search
  logActivity({
    activityType: ActivityType.SEARCH,
    activityName: 'Nearby Events Search',
    userId,
    entityType: EntityType.EVENT,
    metadata: {
      searchType: 'location',
      coordinates: { latitude, longitude },
      radius,
      resultCount: result.length,
    },
    req,
  }).catch(err => console.error('Location search tracking failed:', err));

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Nearby events retrieved successfully',
    data: result,
  });
});

export const EventController = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  saveEvent,
  shareEvent,
  getEventsByCategory,
  getNearbyEvents,
};
