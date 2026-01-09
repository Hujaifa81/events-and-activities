/**
 * Change Event Status (production-grade, role-aware)
 * PATCH /events/:id/status
 */
const changeEventStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;
  const actorId = user?.userId;
  const actorRole = user?.role as 'ADMIN' | 'HOST' | 'USER';

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  

  // Call service
  const updatedEvent = await EventService.changeEventStatus(
    id,
    status,
    actorId,
    actorRole,
  );

  // Audit log
  await createAuditLogFromRequest(req, {
    userId: actorId,
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Changed event status to ${status}}`,
    oldValues: { status: updatedEvent?.status },
    newValues: { status },
    metadata: {
      
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event status changed to ${status}`,
    data: updatedEvent,
  });
});
// Event Controller - Complete Activity Logging Example
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express';
import httpStatus from "http-status-codes";
import { catchAsync, sendResponse, AuditAction, AuditEntityType, pick } from '@/shared';
import {
  logEventView,
  logSearch,
  logActivity
} from '@/shared/helper/activityLogger';
import { createAuditLogFromRequest } from '@/shared/helper/auditHelper';
import { EventService } from './event.service';
import { ActivityType, EntityType } from '@/types';
import { eventFilterableFields } from '@/app/modules/event/event.constants';
import { ApiError } from '@/app/errors';


/**
 * Get All Events (with Search & Filters)
 * Tracks: Search queries
 */
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const userId = (req as any).user?.userId;

  // 1. Fetch events
  const result = await EventService.getAllEvents(filters, options);

  // 2. Track search activity (if search query exists)
  if (filters.searchTerm) {
    logSearch(
      filters.searchTerm as string,
      result.data.length,
      req,
      userId
    ).catch(err => console.error('Search tracking failed:', err));
  }

  // 3. Track category browsing
  if (filters.category) {
    logActivity({
      activityType: ActivityType.CATEGORY_BROWSE,
      activityName: `Browsed ${filters.category} category`,
      userId,
      entityType: EntityType.EVENT,
      metadata: {
        category: filters.category,
        resultCount: result.data.length,
        filters: { city: filters.city, latitude: filters.latitude, longitude: filters.longitude, radius: filters.radius },
      },
      req,
    }).catch(err => console.error('Category tracking failed:', err));
  }

  // 4. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
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

  // 1. Fetch event details
  const event = await EventService.getEventById(id);

  // 2. Track event view (non-blocking)
  logEventView(id, event.title, req).catch(err =>
    console.error('Event view tracking failed:', err)
  );

  // 3. Increment view count in database (optional)
  EventService.incrementViewCount(id).catch(err =>
    console.error('View count update failed:', err)
  );

  // 4. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event retrieved successfully',
    data: event,
  });
});

/**
 * Create New Event
 * Tracks: Event creation
 * Logs: Audit trail for HOST event creation
 */
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  // 1. Create event with full validation
  const event = await EventService.createEvent(userId, req.body);

  // 2. Track event creation (Activity Log)
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
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern,
    },
    req,
  });

  // 3. Create audit log (HOST creates EVENT)
  await createAuditLogFromRequest(req, {
    userId,
    action: AuditAction.CREATE,
    entityType: AuditEntityType.EVENT,
    entityId: event.id,
    description: `Created event: ${event.title}`,
    newValues: {
      title: event.title,
      type: event.type,
      startDate: event.startDate,
      price: event.price,
      status: event.status,
    },
  });

  // 4. Send response
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: event.isRecurring
      ? 'Recurring event series created successfully'
      : 'Event created successfully',
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
    activityType: ActivityType.EVENT_EDIT,
    activityName: 'Event Updated',
    userId,
    entityType: EntityType.EVENT,
    entityId: id,
    metadata: {
      title: event?.title,
      updatedFields: Object.keys(req.body),
    },
    req,
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
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

  // 4. Create audit log for deletion (HOST initiated)
  await createAuditLogFromRequest(req, {
    userId,
    action: AuditAction.DELETE,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Deleted event: ${event.title}`,
    oldValues: {
      title: event.title,
      status: event.status,
      deletedAt: new Date().toISOString(),
    },
    metadata: {
      hostId: event.host.id,
      deletedBy: userId,
      bookingCount: event.bookingCount ?? 0,
    },
    // severity omitted for auto-calculation
  });

  // 5. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event deleted successfully',
    data: null,
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

/**
 * ADMIN CONTROLLERS
 */

/**
 * Get Pending Events (Admin Only)
 * No audit log needed - just viewing
 */
const getPendingEvents = catchAsync(async (req: Request, res: Response) => {
  // 1. Fetch pending events
  const result = await EventService.getPendingEvents(req.query);

  // 2. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pending events retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Approve Event (Admin Only)
 * Creates audit log with before/after states
 */
const approveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  // 1. Get event before approval (for audit log)
  const eventBefore = await EventService.getEventById(id);

  // 2. Approve event
  const event = await EventService.approveEvent(id);

  // 3. Create audit log
  await createAuditLogFromRequest(req, {
    userId: adminId,
    action: AuditAction.APPROVE,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Approved event: ${event.title}`,
    oldValues: {
      status: eventBefore.status,
      publishedAt: eventBefore.publishedAt,
    },
    newValues: {
      status: event.status,
      publishedAt: event.publishedAt,
    },
    metadata: {
      hostId: event.host.id,
      hostEmail: event.host?.email ?? event.host?.username ?? null,
      eventTitle: event.title,
      category: event.category.name,
    },
    severity: 'INFO',
  });

  // 4. TODO: Send notification to host
  // await sendNotification(event.host.id, 'EVENT_APPROVED', {...})

  // 5. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event approved successfully',
    data: event,
  });
});

/**
 * Reject Event (Admin Only)
 * Creates audit log with rejection reason
 */
const rejectEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, notifyHost = true } = req.body;
  const adminId = (req as any).user.userId;

  // 1. Get event before rejection
  const eventBefore = await EventService.getEventById(id);

  // 2. Reject event
  const result = await EventService.rejectEvent(id, reason);

  // 3. Create audit log
  await createAuditLogFromRequest(req, {
    userId: adminId,
    action: AuditAction.REJECT,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Rejected event: ${result.event.title}`,
    oldValues: {
      status: eventBefore.status,
    },
    newValues: {
      status: result.event.status,
      rejectionReason: reason,
    },
    metadata: {
      hostId: result.event.host.id,
      hostEmail: result.event.host?.email ?? result.event.host?.username ?? null,
      eventTitle: result.event.title,
      reason,
      notifyHost,
    },
    severity: 'WARNING',
  });

  // 4. TODO: Send notification to host if requested
  // if (notifyHost) {
  //   await sendNotification(result.event.host.id, 'EVENT_REJECTED', { reason })
  // }

  // 5. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event rejected successfully',
    data: result,
  });
});

/**
 * Feature Event (Admin Only)
 * Highlights event on homepage
 */
const featureEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { featured, featuredUntil, position } = req.body;
  const adminId = (req as any).user.userId;

  // 1. Feature/unfeature event
  const event = await EventService.featureEvent(
    id,
    featured,
    featuredUntil,
    position
  );

  // 2. Create audit log
  await createAuditLogFromRequest(req, {
    userId: adminId,
    action: featured ? AuditAction.APPROVE : AuditAction.REJECT, // Feature = Approve, Unfeature = Reject
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `${featured ? 'Featured' : 'Unfeatured'} event: ${event.title}`,
    newValues: {
      featured,
      featuredUntil,
      position,
    },
    metadata: {
      eventTitle: event.title,
      hostId: event.host.id,
    },
    severity: 'INFO',
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Event ${featured ? 'featured' : 'unfeatured'} successfully`,
    data: event,
  });
});

/**
 * Suspend Event (Admin Only)
 * Temporarily disables event
 */
const suspendEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, suspendUntil, notifyHost = true } = req.body;
  const adminId = (req as any).user.userId;

  // 1. Get event before suspension
  const eventBefore = await EventService.getEventById(id);

  // 2. Suspend event
  const result = await EventService.suspendEvent(id, reason, suspendUntil);

  // 3. Create audit log
  await createAuditLogFromRequest(req, {
    userId: adminId,
    action: AuditAction.SUSPEND,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Suspended event: ${result.event.title}`,
    oldValues: {
      status: eventBefore.status,
    },
    newValues: {
      status: result.event.status,
      suspensionReason: reason,
      suspendUntil,
    },
    metadata: {
      hostId: result.event.host.id,
      hostEmail: result.event.host?.email ?? result.event.host?.username ?? null,
      eventTitle: result.event.title,
      reason,
      suspendUntil,
      affectedBookings: result.affectedBookings,
      notifyHost,
    },
    severity:
      result.affectedBookings > 0 ? 'CRITICAL' : 'WARNING',
  });

  // 4. TODO: Send notifications
  // - Notify host
  // - Notify customers with bookings

  // 5. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event suspended successfully',
    data: result,
  });
});

/**
 * Admin Delete Event (Admin Only)
 * Permanently removes event with audit trail
 */
const adminDeleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  // 1. Get full event details before deletion
  const eventBefore = await EventService.getEventById(id);

  // 2. Delete event
  const result = await EventService.adminDeleteEvent(id);

  // 3. Create critical audit log (full event snapshot)
  await createAuditLogFromRequest(req, {
    userId: adminId,
    action: AuditAction.DELETE,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Deleted event: ${eventBefore.title}`,
    oldValues: {
      ...eventBefore,
      // Include critical info
      bookingCount: result.affectedBookings,
      reviewCount: result.affectedReviews,
    },
    metadata: {
      hostId: eventBefore.host.id,
      hostEmail: eventBefore.host?.email ?? eventBefore.host?.username ?? null,
      affectedBookings: result.affectedBookings,
      affectedReviews: result.affectedReviews,
      deletedBy: adminId,
    },
    severity: 'CRITICAL',
  });

  // 4. TODO: Handle cascading effects
  // - Cancel all bookings
  // - Process refunds
  // - Send notifications

  // 5. Send response
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Event deleted successfully',
    data: {
      deletedEvent: result.event,
      affectedBookings: result.affectedBookings,
      affectedReviews: result.affectedReviews,
    },
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
  // Admin controllers
  getPendingEvents,
  approveEvent,
  rejectEvent,
  featureEvent,
  suspendEvent,
  adminDeleteEvent,
  changeEventStatus,
};
