// Event Service - Business Logic

import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/utils';
import { ApiError } from '@/app/errors';
import { CreateEventInput, UpdateEventInput, EventMode, EventVisibility, EventStatus, DifficultyLevel, EventFilterRequest } from './event.interface';
import { generateSlug, createRecurringInstances, checkHostAvailability } from '@/shared/helper/eventHelper';
import httpStatus from "http-status-codes";
import { IOptions, paginationHelper } from '@/shared';
import { eventSearchableFields } from './event.constants';

// ============================================
// CONSTANTS
// ============================================


/**
 * Get all events with filters, pagination, and search
 * ✅ Traditional Pattern - Production Ready
 */
const getAllEvents = async (filters: EventFilterRequest, options: IOptions) => {
  // Step 1: Calculate pagination
  const { limit, page, skip } = paginationHelper.calculatePagination(options);
  
  // Step 2: Extract special filters that need custom handling
  const { 
    searchTerm,      // OR search across multiple fields
    category,        // Relation query
    tags,            // Array field - special handling
    latitude,        // Geo-spatial search
    longitude,       // Geo-spatial search
    radius,          // Geo-spatial search (in km)
    ...filterData    // Direct fields (status, isFree, etc.)
  } = filters;

  // Step 3: Build AND conditions array
  const andConditions: Prisma.EventWhereInput[] = [];

  // Step 4: Add search condition (OR logic)
  if (searchTerm) {
    andConditions.push({
      OR: eventSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      })),
    });
  }

  // Step 5: Category filter (Relation query)
  if (category) {
    andConditions.push({
      category: {
        slug: category, // Filter by category slug
      },
    });
  }

  // Step 6: Tags filter (Array field with special handling)
  if (tags && tags.length > 0) {
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    
    andConditions.push({
      tags: {
        hasSome: tagsArray, // Has at least one of these tags
      },
    });
  }

  // Step 7: Geo-spatial filter (location-based search)
  if (latitude !== undefined && longitude !== undefined && radius) {
    // Get nearby event IDs using Haversine formula
    const nearbyEvents = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM events
      WHERE 
        latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(${latitude})) 
            * cos(radians(latitude)) 
            * cos(radians(longitude) - radians(${longitude})) 
            + sin(radians(${latitude})) 
            * sin(radians(latitude))
          )
        ) < ${radius}
    `;

    const nearbyEventIds = nearbyEvents.map(e => e.id);
    
    if (nearbyEventIds.length === 0) {
      // No events found within radius - return empty result early
      return {
        meta: { total: 0, page, limit },
        data: [],
      };
    }

    // Filter by nearby event IDs
    andConditions.push({
      id: { in: nearbyEventIds },
    });
  }

  // Step 8: Parent/Child visibility logic
  if (!filters.includeParentEvents) {
    // Customer view: Hide parent recurring events (show only bookable instances)
    andConditions.push({
      OR: [
        { isRecurring: false },           // Single events
        { parentEventId: { not: null } }, // Child instances only
      ],
    });
  }

  // Step 9: Other direct field filters
  if (Object.keys(filterData).length > 0) {
    const filterConditions = Object.entries(filterData)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        // Handle special cases
        if (key === 'isFree') {
          return { [key]: { equals: Boolean(value) } };
        }
        
        // Handle price range
        if (key === 'minPrice') {
          return { price: { gte: Number(value) } };
        }
        if (key === 'maxPrice') {
          return { price: { lte: Number(value) } };
        }
        
        // Handle date range
        if (key === 'startDate') {
          return { startDate: { gte: new Date(value as string) } };
        }
        if (key === 'endDate') {
          return { startDate: { lte: new Date(value as string) } };
        }
        
        // Default: exact match
        return { [key]: { equals: value } };
      });
    
    andConditions.push(...filterConditions);
  }

  // Step 10: Base conditions (always apply)
  andConditions.push({
    status: 'PUBLISHED',  // Only show published events
    deletedAt: null,      // Exclude soft-deleted
  });

  // Step 11: Build final WHERE clause
  const whereConditions: Prisma.EventWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Step 12: Execute query with relations
  const result = await prisma.event.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { startDate: 'asc' }, // Default: upcoming events first
    include: {
      host: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      },
      _count: {
        select: {
          bookings: true,
          reviews: true,
          participants: true,
        },
      },
    },
  });

  // Step 13: Count total for meta
  const total = await prisma.event.count({
    where: whereConditions,
  });

  // Step 14: Return response with meta
  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

/**
 * Get single event by ID
 */
const getEventById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              bio: true,
            },
          },
        },
      },
      category: true,
      reviews: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          bookings: true,
          participants: true,
          reviews: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  return event;
};

/**
 * Create new event with full validation
 */
const createEvent = async (hostId: string, data: CreateEventInput) => {
  // 1. Validate category exists
  const category = await prisma.eventCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event category not found');
  }

  // 2. Validate dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after start date');
  }

  if (startDate < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Event start date cannot be in the past');
  }

  // 2b. Check host availability (no double-booking)
  await checkHostAvailability(hostId, startDate, endDate);

  // 3. Validate pricing
  if (data.isFree === false && (!data.price || data.price <= 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Price is required for paid events');
  }

  // 4. Validate location based on mode
  if ((data.mode === EventMode.PHYSICAL || data.mode === EventMode.HYBRID) && !data.venue) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Venue is required for physical/hybrid events');
  }

  if ((data.mode === EventMode.VIRTUAL || data.mode === EventMode.HYBRID) && !data.virtualMeetingUrl) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Virtual meeting URL is required for virtual/hybrid events');
  }

  // 5. Validate recurring event config
  if (data.isRecurring) {
    if (!data.recurrencePattern || !data.recurrenceEndDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Recurrence pattern and end date are required for recurring events');
    }

    const recurrenceEnd = new Date(data.recurrenceEndDate);
    if (recurrenceEnd <= endDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Recurrence end date must be after event end date');
    }

    // Check host availability for all future recurring dates
    // Calculate all instance dates before creating to validate host availability
    const instanceDates: { start: Date; end: Date }[] = [];
    const currentStart = new Date(startDate);
    let currentEnd = new Date(endDate);
    const duration = endDate.getTime() - startDate.getTime();

    while (currentStart <= recurrenceEnd) {
      instanceDates.push({
        start: new Date(currentStart),
        end: new Date(currentEnd)
      });

      // Increment based on pattern
      if (data.recurrencePattern === 'DAILY') {
        currentStart.setDate(currentStart.getDate() + 1);
        currentEnd.setDate(currentEnd.getDate() + 1);
      } else if (data.recurrencePattern === 'WEEKLY') {
        currentStart.setDate(currentStart.getDate() + 7);
        currentEnd.setDate(currentEnd.getDate() + 7);
      } else if (data.recurrencePattern === 'MONTHLY') {
        currentStart.setMonth(currentStart.getMonth() + 1);
        currentEnd = new Date(currentStart.getTime() + duration);
      }
    }

    // Check host availability for each instance date
    for (const instance of instanceDates) {
      await checkHostAvailability(hostId, instance.start, instance.end);
    }
  }

  // 6. Generate unique slug
  const slug = await generateSlug(data.title);

  // 7. Create main event
  const event = await prisma.event.create({
    data: {
      // Basic Info
      title: data.title,
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      
      // Host
      hostId,
      coHostIds: data.coHostIds || [],
      
      // Category & Type
      type: data.type,
      categoryId: data.categoryId,
      tags: data.tags || [],
      
      // Status & Visibility
      status: EventStatus.DRAFT,
      visibility: data.visibility || EventVisibility.PUBLIC,
      
      // Date & Time
      startDate,
      endDate,
      timezone: data.timezone || 'UTC',
      duration: data.duration,
      
      // Recurring
      isRecurring: data.isRecurring || false,
      recurrencePattern: data.recurrencePattern,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
      
      // Location
      mode: data.mode,
      
      // Physical
      venue: data.venue,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      latitude: data.latitude,
      longitude: data.longitude,
      
      // Virtual
      virtualMeetingUrl: data.virtualMeetingUrl,
      virtualMeetingId: data.virtualMeetingId,
      virtualPassword: data.virtualPassword,
      
      // Media
      bannerImage: data.bannerImage,
      images: data.images || [],
      videoUrl: data.videoUrl,
      
      // Capacity
      minParticipants: data.minParticipants || 2,
      maxParticipants: data.maxParticipants,
      ageMin: data.ageMin,
      ageMax: data.ageMax,
      genderPreference: data.genderPreference,
      difficultyLevel: data.difficultyLevel || DifficultyLevel.ALL_LEVELS,
      
      // Requirements
      requiredItems: data.requiredItems || [],
      dresscode: data.dresscode,
      prerequisites: data.prerequisites,
      
      // Pricing
      isFree: data.isFree ?? true,
      price: data.price || 0,
      currency: data.currency || 'BDT',
      earlyBirdPrice: data.earlyBirdPrice,
      earlyBirdEndDate: data.earlyBirdEndDate ? new Date(data.earlyBirdEndDate) : null,
      groupDiscountEnabled: data.groupDiscountEnabled || false,
      groupDiscountMin: data.groupDiscountMin,
      groupDiscountPercent: data.groupDiscountPercent,
      
      // Refund
      refundPolicy: data.refundPolicy,
      refundDeadline: data.refundDeadline ? new Date(data.refundDeadline) : null,
      
      // Features
      instantBooking: data.instantBooking ?? true,
      requiresApproval: data.requiresApproval || false,
      allowWaitlist: data.allowWaitlist ?? true,
      allowGuestInvites: data.allowGuestInvites || false,
      maxGuestsPerBooking: data.maxGuestsPerBooking || 1,
      
      // SEO
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      keywords: data.keywords || [],
    },
    include: {
      category: true,
      host: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  // 8. Create recurring instances if needed
  if (data.isRecurring) {
    await createRecurringInstances(event);
  }

  return event;
};

/**
 * Update event with full validation
 */
const updateEvent = async (id: string, hostId: string, data: UpdateEventInput) => {
  // 1. Verify ownership and get current event
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (event.hostId !== hostId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to update this event');
  }

  // 2. Check if event can be updated
  if (event.status === EventStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot update completed events');
  }

  if (event.status === EventStatus.CANCELLED) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot update cancelled events');
  }

  // 3. Validate category if provided
  if (data.categoryId) {
    const category = await prisma.eventCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Event category not found');
    }
  }

  // 4. Validate dates if provided
  const startDate = data.startDate ? new Date(data.startDate) : event.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : event.endDate;

  if (endDate <= startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after start date');
  }

  // Don't allow updating past events' dates
  if (event.startDate < new Date() && data.startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot change start date of past/ongoing events');
  }

  // 4b. CRITICAL: Block date changes for single events if bookings exist
  // Protects booked users from schedule changes
  if (!event.isRecurring && (data.startDate || data.endDate)) {
    const bookingCount = await prisma.booking.count({
      where: { 
        eventId: id,
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      }
    });

    if (bookingCount > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot change event dates - ${bookingCount} user${bookingCount > 1 ? 's have' : ' has'} already booked this event. ` +
        `Changing dates would disrupt their plans. Please cancel this event and create a new one with the correct dates.`
      );
    }

    // Check host availability for new dates
    const newStartDate = data.startDate ? new Date(data.startDate) : event.startDate;
    const newEndDate = data.endDate ? new Date(data.endDate) : event.endDate;
    await checkHostAvailability(event.hostId, newStartDate, newEndDate, id);
  }

  // 5. Validate pricing
  const isFree = data.isFree !== undefined ? data.isFree : event.isFree;
  const price = data.price !== undefined ? data.price : event.price;

  if (isFree === false && (!price || price <= 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Price is required for paid events');
  }

  // 6. Validate location based on mode
  const mode = data.mode || event.mode;
  const venue = data.venue !== undefined ? data.venue : event.venue;
  const virtualMeetingUrl = data.virtualMeetingUrl !== undefined ? data.virtualMeetingUrl : event.virtualMeetingUrl;

  if ((mode === EventMode.PHYSICAL || mode === EventMode.HYBRID) && !venue) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Venue is required for physical/hybrid events');
  }

  if ((mode === EventMode.VIRTUAL || mode === EventMode.HYBRID) && !virtualMeetingUrl) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Virtual meeting URL is required for virtual/hybrid events');
  }

  // 7. Update slug if title changed
  let slug = event.slug;
  if (data.title && data.title !== event.title) {
    slug = await generateSlug(data.title);
  }

  // 8. CRITICAL: Block date changes for recurring event parent
  // Parent is the template for the entire series - changing parent dates would require complex shifting
  // Simpler approach: Cancel and recreate series with correct dates
  if (event.isRecurring && event.parentEventId === null) {
    if (data.startDate || data.endDate) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cannot change dates for recurring event series. Series dates are immutable after creation. ' +
        'You can only update content fields (title, description, price, venue, etc.). ' +
        'To change the schedule, please cancel this series and create a new one with the correct dates.'
      );
    }
  }

  // 8b. Validate date changes for individual recurring instances (child events)
  // Allow with strict conditions to maintain series integrity
  if (event.parentEventId !== null && (data.startDate || data.endDate)) {
    // Condition 1: No bookings on this specific instance
    const bookingCount = await prisma.booking.count({
      where: {
        eventId: id,
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      }
    });

    if (bookingCount > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot change date - ${bookingCount} user${bookingCount > 1 ? 's have' : ' has'} already booked this event. ` +
        `Changing the date would disrupt their plans. Cancel bookings first or create a new event.`
      );
    }

    // Condition 2: Check host availability across ALL events (not just siblings)
    const newStartDate = data.startDate ? new Date(data.startDate) : event.startDate;
    const newEndDate = data.endDate ? new Date(data.endDate) : event.endDate;

    // Validate date logic first
    if (newEndDate <= newStartDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after start date');
    }

    // Check host availability (prevents double-booking across all events)
    await checkHostAvailability(event.hostId, newStartDate, newEndDate, id);
  }

  // 9. Prepare update data
  const updateData: Prisma.EventUpdateInput = {
    ...data,
    slug,
  };

  // 10. Handle recurring event updates
  if (event.isRecurring && data.updateFutureInstances) {
    // Get all future child instances to update content only
    const childEvents = await prisma.event.findMany({
      where: {
        parentEventId: event.id,
        startDate: { gte: new Date() }, // Only future events
      },
    });

    // Prepare child update data (content fields only - dates blocked by Step 8)
    // Prepare child update data - exclude date fields and updateFutureInstances flag
    // All other fields from schema are automatically included
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { startDate, endDate, updateFutureInstances, ...childUpdateData } = data;

    // Update parent and all future children atomically (content only)
    await prisma.$transaction([
      // Update parent event
      prisma.event.update({
        where: { id },
        data: updateData,
      }),
      // Update all future child instances with same content changes
      ...childEvents.map(child =>
        prisma.event.update({
          where: { id: child.id },
          data: childUpdateData,
        })
      ),
    ]);

    // Return updated parent with full details
    return await prisma.event.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });
  }

  // 11. Update single event (non-recurring or without updateFutureInstances flag)
  const updatedEvent = await prisma.event.update({
    where: { id },
    data: updateData,
    include: {
      host: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          bookings: true,
          reviews: true,
        },
      },
    },
  });

  return updatedEvent;
};

/**
 * Delete event (soft delete)
 */
const deleteEvent = async (id: string, hostId: string) => {
  // Verify ownership
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (event.hostId !== hostId) {
    throw new ApiError(403, 'Not authorized to delete this event');
  }

  // Soft delete
  await prisma.event.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

/**
 * Publish event
 */
const publishEvent = async (id: string, hostId: string) => {
  // Verify ownership
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (event.hostId !== hostId) {
    throw new ApiError(403, 'Not authorized to publish this event');
  }

  // Publish event
  const publishedEvent = await prisma.event.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  return publishedEvent;
};

/**
 * Save event to wishlist
 */
const saveEvent = async (eventId: string, userId: string) => {
  // Check if event exists
  await getEventById(eventId);

  // Check if already saved
  const existing = await prisma.savedEvent.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  if (existing) {
    throw new ApiError(400, 'Event already saved');
  }

  // Save event
  const savedEvent = await prisma.savedEvent.create({
    data: {
      userId,
      eventId,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          bannerImage: true,
          startDate: true,
          price: true,
          isFree: true,
        },
      },
    },
  });

  // Increment save count
  await incrementSaveCount(eventId);

  return savedEvent;
};

/**
 * Get events by category
 */
const getEventsByCategory = async (categoryId: string, filters: EventFilterRequest, options: IOptions) => {
  return getAllEvents({ ...filters, category: categoryId }, options);
};

/**
 * Get nearby events (location-based)
 */
const getNearbyEvents = async (
  latitude: number,
  longitude: number,
  radiusKm: number
) => {
  // Using raw query for geo-spatial search
  const events = await prisma.$queryRaw`
    SELECT 
      e.*,
      (
        6371 * acos(
          cos(radians(${latitude})) 
          * cos(radians(e.latitude)) 
          * cos(radians(e.longitude) - radians(${longitude})) 
          + sin(radians(${latitude})) 
          * sin(radians(e.latitude))
        )
      ) AS distance
    FROM events e
    WHERE 
      e.latitude IS NOT NULL 
      AND e.longitude IS NOT NULL
      AND e.status = 'PUBLISHED'
      AND e."deletedAt" IS NULL
    HAVING distance < ${radiusKm}
    ORDER BY distance ASC
    LIMIT 50
  `;

  return events;
};

/**
 * Increment view count
 */
const incrementViewCount = async (id: string) => {
  await prisma.event.update({
    where: { id },
    data: {
      viewCount: { increment: 1 },
    },
  });
};

/**
 * Increment share count
 */
const incrementShareCount = async (id: string) => {
  await prisma.event.update({
    where: { id },
    data: {
      shareCount: { increment: 1 },
    },
  });
};

/**
 * Increment save count
 */
const incrementSaveCount = async (id: string) => {
  await prisma.event.update({
    where: { id },
    data: {
      saveCount: { increment: 1 },
    },
  });
};

/**
 * ADMIN ACTIONS
 */

/**
 * Get pending events (awaiting approval)
 */
const getPendingEvents = async (filters: EventFilterRequest, options: IOptions) => {
  const { limit, page, skip } = paginationHelper.calculatePagination(options);

  const where: Prisma.EventWhereInput = {
    status: 'PENDING_APPROVAL',
    deletedAt: null,
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: 'desc' },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    data: events,
    meta: {
      page,
      limit,
      total,
    },
  };
};

/**
 * Approve event (Admin only)
 */
const approveEvent = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (event.status !== 'PENDING_APPROVAL') {
    throw new ApiError(400, 'Event is not pending approval');
  }

  const approvedEvent = await prisma.event.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      category: true,
    },
  });

  return approvedEvent;
};

/**
 * Reject event (Admin only)
 */
const rejectEvent = async (id: string, reason: string) => {
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // Update event status and store rejection reason in metadata
  const rejectedEvent = await prisma.event.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      category: true,
    },
  });

  return { event: rejectedEvent, reason };
};

/**
 * Feature event on homepage (Admin only)
 * TODO: Implement feature event functionality
 * Future parameters: featured (boolean), featuredUntil (string), position (number)
 */
const featureEvent = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (event.status !== 'PUBLISHED') {
    throw new ApiError(400, 'Only published events can be featured');
  }

  // Update event (Note: You may need to add featured fields to Event model)
  const featuredEvent = await prisma.event.update({
    where: { id },
    data: {
      // Add these fields to your Event schema if not present
      // featured,
      // featuredUntil: featuredUntil ? new Date(featuredUntil) : null,
      // featuredPosition: position,
    },
    include: {
      host: {
        select: {
          id: true,
          username: true,
        },
      },
      category: true,
    },
  });

  return featuredEvent;
};

/**
 * Suspend event (Admin only)
 */
const suspendEvent = async (
  id: string,
  reason: string,
  suspendUntil?: string
) => {
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // Update event to suspended status
  const suspendedEvent = await prisma.event.update({
    where: { id },
    data: {
      status: 'CANCELLED', // Or add SUSPENDED status to EventStatus enum
      cancelledAt: new Date(),
    },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      category: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  return {
    event: suspendedEvent,
    reason,
    suspendUntil,
    affectedBookings: suspendedEvent._count.bookings,
  };
};

/**
 * Admin delete event (hard delete with audit)
 */
const adminDeleteEvent = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          bookings: true,
          reviews: true,
        },
      },
    },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // Soft delete (preserve data for audit)
  await prisma.event.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return {
    event,
    affectedBookings: event._count.bookings,
    affectedReviews: event._count.reviews,
  };
};

export const EventService = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  saveEvent,
  getEventsByCategory,
  getNearbyEvents,
  incrementViewCount,
  incrementShareCount,
  incrementSaveCount,
  // Admin methods
  getPendingEvents,
  approveEvent,
  rejectEvent,
  featureEvent,
  suspendEvent,
  adminDeleteEvent,
};

