// Event Service - Business Logic
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/utils';
import { ApiError } from '@/app/errors';

interface IEventFilters {
  search?: string;
  category?: string;
  city?: string;
  type?: string;
  isFree?: boolean;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get all events with filters, pagination, and search
 */
const getAllEvents = async (filters: IEventFilters) => {
  const {
    search,
    category,
    city,
    type,
    isFree,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortOrder = 'asc',
  } = filters;

  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause
  const where: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
    deletedAt: null,
  };

  // Search in title and description
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  // Category filter
  if (category) {
    where.category = { slug: category };
  }

  // Location filter
  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  // Event type filter
  if (type) {
    where.type = type as any;
  }

  // Price filters
  if (isFree !== undefined) {
    where.isFree = isFree === true || isFree === 'true';
  }
  if (minPrice) {
    where.price = { ...where.price, gte: Number(minPrice) };
  }
  if (maxPrice) {
    where.price = { ...where.price, lte: Number(maxPrice) };
  }

  // Date range filter
  if (startDate) {
    where.startDate = { ...where.startDate, gte: new Date(startDate) };
  }
  if (endDate) {
    where.startDate = { ...where.startDate, lte: new Date(endDate) };
  }

  // Execute query
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder },
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
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    data: events,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
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
 * Create new event
 */
const createEvent = async (hostId: string, data: any) => {
  const event = await prisma.event.create({
    data: {
      ...data,
      hostId,
      status: 'DRAFT',
    },
    include: {
      category: true,
    },
  });

  return event;
};

/**
 * Update event
 */
const updateEvent = async (id: string, hostId: string, data: any) => {
  // Verify ownership
  const event = await prisma.event.findUnique({
    where: { id, deletedAt: null },
  });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (event.hostId !== hostId) {
    throw new ApiError(403, 'Not authorized to update this event');
  }

  // Update event
  const updatedEvent = await prisma.event.update({
    where: { id },
    data,
    include: {
      category: true,
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
  const event = await getEventById(eventId);

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
const getEventsByCategory = async (categoryId: string, filters: IEventFilters) => {
  return getAllEvents({ ...filters, category: categoryId });
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
const getPendingEvents = async (filters: IEventFilters) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (Number(page) - 1) * Number(limit);

  const where: Prisma.EventWhereInput = {
    status: 'PENDING_APPROVAL',
    deletedAt: null,
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sortBy]: sortOrder },
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
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
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
 */
const featureEvent = async (
  id: string,
  featured: boolean,
  featuredUntil?: string,
  position?: number
) => {
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

