// Event Controller - Complete Activity Logging Example
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express';
import httpStatus from "http-status-codes";
import { catchAsync, sendResponse, AuditEntityType, pick, AuditAction } from '@/shared';
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
import { UserRole } from '@/app/modules/user/user.interface';


/**
 * Get All Events (with Search & Filters)
 * Tracks: Search queries
 */
const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const user = (req as any).user;
  const userId = user?.userId;
  const userRole = user?.role;

  // Restrict status and visibility for non-admins
  if (userRole !== (UserRole.ADMIN || UserRole.MODERATOR)) {
    // Exclude restricted statuses
    const restrictedStatuses = [
      'DRAFT',
      'PENDING_APPROVAL',
      'CANCELLED',
      'POSTPONED',
      'ARCHIVED',
    ];
    if (!filters.status) {
      filters.status = 'PUBLISHED'; // Default for users
    } else if (restrictedStatuses.includes(filters.status as string)) {
      filters.status = 'PUBLISHED';
    }
    // Exclude restricted visibilities
    const restrictedVisibilities = [
      'PRIVATE',
      'INVITE_ONLY',
      'FOLLOWERS_ONLY',
    ];
    if (filters.visibility && restrictedVisibilities.includes(filters.visibility as string)) {
      filters.visibility = 'PUBLIC';
    }
  }

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

  
  

  // 5. Send response
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

  // 1. Get event details before update
  const eventBefore = await EventService.getEventById(id);

  // 2. Update event
  const event = await EventService.updateEvent(id, userId, req.body);

  // 3. Track event update (activity log)
  await logActivity({
    activityType: ActivityType.EVENT_UPDATE,
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

  // 4. Audit log for update (only JSON-serializable fields)
  const flattenEvent = (ev: any) => {
    if (!ev) return {};
    // Only include primitive fields, not relations or objects
    const {
      id,
      title,
      description,
      shortDescription,
      type,
      categoryId,
      tags,
      visibility,
      startDate,
      endDate,
      timezone,
      duration,
      mode,
      venue,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      bannerImage,
      images,
      videoUrl,
      minParticipants,
      maxParticipants,
      ageMin,
      ageMax,
      genderPreference,
      difficultyLevel,
      requiredItems,
      dresscode,
      prerequisites,
      isFree,
      price,
      currency,
      earlyBirdPrice,
      earlyBirdEndDate,
      groupDiscountEnabled,
      groupDiscountMin,
      groupDiscountPercent,
      refundPolicy,
      refundDeadline,
      instantBooking,
      requiresApproval,
      allowWaitlist,
      allowGuestInvites,
      maxGuestsPerBooking,
      metaTitle,
      metaDescription,
      keywords,
      status,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
      createdAt,
      updatedAt,
    } = ev;
    return {
      id,
      title,
      description,
      shortDescription,
      type,
      categoryId,
      tags,
      visibility,
      startDate,
      endDate,
      timezone,
      duration,
      mode,
      venue,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      bannerImage,
      images,
      videoUrl,
      minParticipants,
      maxParticipants,
      ageMin,
      ageMax,
      genderPreference,
      difficultyLevel,
      requiredItems,
      dresscode,
      prerequisites,
      isFree,
      price,
      currency,
      earlyBirdPrice,
      earlyBirdEndDate,
      groupDiscountEnabled,
      groupDiscountMin,
      groupDiscountPercent,
      refundPolicy,
      refundDeadline,
      instantBooking,
      requiresApproval,
      allowWaitlist,
      allowGuestInvites,
      maxGuestsPerBooking,
      metaTitle,
      metaDescription,
      keywords,
      status,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
      createdAt,
      updatedAt,
    };
  };

  await createAuditLogFromRequest(req, {
    userId,
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `Updated event: ${event?.title}`,
    oldValues: flattenEvent(eventBefore),
    newValues: flattenEvent(event),
    metadata: {
      updatedFields: Object.keys(req.body),
      hostId: event?.host?.id,
      hostEmail: event?.host?.email,
    },
  });

  // 5. Send response
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
 * Change Event Status (production-grade, role-aware)
 * PATCH /events/:id/status
 */
const changeEventStatus = catchAsync(async (req: Request, res: Response) => {

  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;
  const actorId = user?.userId;
  const actorRole = user?.role as UserRole;

  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status is required');
  }

  // Fetch event before change for audit
  const eventBefore = await EventService.getEventById(id);

  const updatedEvent = await EventService.changeEventStatus(
    id,
    status,
    actorId,
    actorRole,
  );

  // Determine audit action based on transition
  let auditAction = AuditAction.UPDATE;
  if (status === 'PUBLISHED' && eventBefore.status === 'PENDING_APPROVAL') {
    auditAction = AuditAction.PUBLISHED;
  } else if (status === 'CANCELLED') {
    auditAction = AuditAction.CANCELLED;
  } else if (status === 'POSTPONED') {
    auditAction = AuditAction.POSTPONED;
  }

  // Audit log with production-grade metadata
  await createAuditLogFromRequest(req, {
    userId: actorId,
    action: auditAction,
    entityType: AuditEntityType.EVENT,
    entityId: id,
    description: `${auditAction === AuditAction.UPDATE ? 'Changed' : auditAction.toLowerCase()} event status from ${eventBefore.status} to ${status}${reason ? `: ${reason}` : ''}`,
    oldValues: { status: eventBefore.status },
    newValues: { status: updatedEvent.status },
    metadata: {
      eventId: id,
      eventTitle: eventBefore.title,
      category: eventBefore.category?.name,
      previousStatus: eventBefore.status,
      newStatus: status,
      actorId,
      actorRole,
      actorEmail: user?.email,
      affectedBookings: updatedEvent._count?.bookings,
      affectedParticipants: updatedEvent._count?.participants,
      
    },
  });

  // TODO: Implement notification later
  // if (actorRole === 'ADMIN' && notifyHost) {
  //   await sendNotification(eventBefore.host.id, 'EVENT_STATUS_CHANGED', { ... });
  // }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event status changed to ${status}`,
    data: updatedEvent,
  });
});

/**
 * Toggle Save/Unsave Event to Wishlist
 * POST /api/v1/events/:id/save-toggle
 */
const toggleSaveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const result = await EventService.toggleSaveEvent(id, userId);

  if (result.status === 'saved') {
    await logActivity({
      activityType: ActivityType.EVENT_SAVE,
      activityName: 'Event Saved',
      userId,
      entityType: EntityType.EVENT,
      entityId: id,
      metadata: {
        title: result?.savedEvent?.event.title,
      },
      req,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Event saved to wishlist',
      data: result.savedEvent,
    });
  } else {
    await logActivity({
      activityType: ActivityType.EVENT_UNSAVE,
      activityName: 'Event Unsaved',
      userId,
      entityType: EntityType.EVENT,
      entityId: id,
      metadata: {},
      req,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Event removed from wishlist',
      data: null,
    });
  }
});

/**
 * Share Event
 * Tracks: Event shares
 */
const shareEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { platform } = req.body; // facebook, twitter, whatsapp, etc.
  const userId = req.user?.userId;

  // 1. Get event details
  const event = await EventService.getEventById(id);

  // 2. Restrict sharing to public & published events only
  if (event.status !== 'PUBLISHED' || event.visibility !== 'PUBLIC') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only public and published events can be shared');
  }

  // 3. Track share action
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

  // 4. Increment share count
  EventService.incrementShareCount(id).catch(err =>
    console.error('Share count update failed:', err)
  );

  // 5. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event shared successfully',
    data: {
      shareUrl: `${process.env.FRONTEND_URL}/events/${id}`,
    },
  });
});


/**
 * ADMIN CONTROLLERS
 */


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
    action: featured ? AuditAction.FEATURED : AuditAction.NOT_FEATURED, // Feature = Approve, Unfeature = Reject
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
  });

  // 3. Send response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event ${featured ? 'featured' : 'unfeatured'} successfully`,
    data: event,
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
      hostEmail: eventBefore?.host?.email ?? eventBefore.host?.username ?? null,
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
  toggleSaveEvent,
  shareEvent,
  // Admin controllers
  featureEvent,
  adminDeleteEvent,
  changeEventStatus,
};
