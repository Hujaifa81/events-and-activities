/**
 * Event Helper Functions
 * Utilities for event creation, slug generation, and recurring events
 */

import { prisma } from '@/shared/utils';
import { Event } from '@prisma/client';
import { ApiError } from '@/app/errors';
import httpStatus from 'http-status-codes';

/**
 * Generate unique slug from title
 */
export const generateSlug = async (title: string, suffix = ''): Promise<string> => {
  // Convert to lowercase and replace spaces/special chars
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .substring(0, 100);        // Limit length

  if (suffix) {
    slug = `${slug}-${suffix}`;
  }

  // Check if slug exists
  const existing = await prisma.event.findUnique({
    where: { slug },
  });

  // If exists, add random suffix
  if (existing) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return generateSlug(title, randomSuffix);
  }

  return slug;
};

/**
 * Calculate next date based on recurrence pattern
 */
export const calculateNextDate = (
  currentDate: Date,
  pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Date => {
  const nextDate = new Date(currentDate);

  switch (pattern) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }

  return nextDate;
};

/**
 * Create recurring event instances
 */
export const createRecurringInstances = async (
  parentEvent: Event
): Promise<Event[]> => {
  if (!parentEvent.recurrencePattern || !parentEvent.recurrenceEndDate) {
    return [];
  }

  const instances: Event[] = [];
  let currentStartDate = new Date(parentEvent.startDate);
  const endDate = new Date(parentEvent.recurrenceEndDate);
  const eventDuration = new Date(parentEvent.endDate).getTime() - new Date(parentEvent.startDate).getTime();

  // Limit to prevent infinite loops (max 365 instances)
  let instanceCount = 0;
  const MAX_INSTANCES = 365;

  while (instanceCount < MAX_INSTANCES) {
    // Calculate next occurrence
    currentStartDate = calculateNextDate(
      currentStartDate,
      parentEvent.recurrencePattern as 'DAILY' | 'WEEKLY' | 'MONTHLY'
    );

    // Stop if we've passed the end date
    if (currentStartDate > endDate) {
      break;
    }

    const currentEndDate = new Date(currentStartDate.getTime() + eventDuration);

    // Generate unique slug for child event
    const childSlug = await generateSlug(
      parentEvent.title,
      currentStartDate.toISOString().split('T')[0] // Use date as suffix
    );

    // Create child event
    const childEvent = await prisma.event.create({
      data: {
        // Copy all fields from parent
        title: parentEvent.title,
        slug: childSlug,
        description: parentEvent.description,
        shortDescription: parentEvent.shortDescription,
        
        hostId: parentEvent.hostId,
        coHostIds: parentEvent.coHostIds,
        
        type: parentEvent.type,
        categoryId: parentEvent.categoryId,
        tags: parentEvent.tags,
        
        status: parentEvent.status,
        visibility: parentEvent.visibility,
        
        // Updated dates for this instance
        startDate: currentStartDate,
        endDate: currentEndDate,
        timezone: parentEvent.timezone,
        duration: parentEvent.duration,
        
        // Mark as child of recurring series
        isRecurring: false,
        parentEventId: parentEvent.id,
        
        // Location
        mode: parentEvent.mode,
        venue: parentEvent.venue,
        address: parentEvent.address,
        city: parentEvent.city,
        state: parentEvent.state,
        country: parentEvent.country,
        postalCode: parentEvent.postalCode,
        latitude: parentEvent.latitude,
        longitude: parentEvent.longitude,
        
        virtualMeetingUrl: parentEvent.virtualMeetingUrl,
        virtualMeetingId: parentEvent.virtualMeetingId,
        virtualPassword: parentEvent.virtualPassword,
        
        // Media
        bannerImage: parentEvent.bannerImage,
        images: parentEvent.images,
        videoUrl: parentEvent.videoUrl,
        
        // Capacity
        minParticipants: parentEvent.minParticipants,
        maxParticipants: parentEvent.maxParticipants,
        ageMin: parentEvent.ageMin,
        ageMax: parentEvent.ageMax,
        genderPreference: parentEvent.genderPreference,
        difficultyLevel: parentEvent.difficultyLevel,
        
        // Requirements
        requiredItems: parentEvent.requiredItems,
        dresscode: parentEvent.dresscode,
        prerequisites: parentEvent.prerequisites,
        
        // Pricing
        isFree: parentEvent.isFree,
        price: parentEvent.price,
        currency: parentEvent.currency,
        earlyBirdPrice: parentEvent.earlyBirdPrice,
        earlyBirdEndDate: parentEvent.earlyBirdEndDate,
        groupDiscountEnabled: parentEvent.groupDiscountEnabled,
        groupDiscountMin: parentEvent.groupDiscountMin,
        groupDiscountPercent: parentEvent.groupDiscountPercent,
        
        // Refund
        refundPolicy: parentEvent.refundPolicy,
        refundDeadline: parentEvent.refundDeadline,
        
        // Features
        instantBooking: parentEvent.instantBooking,
        requiresApproval: parentEvent.requiresApproval,
        allowWaitlist: parentEvent.allowWaitlist,
        allowGuestInvites: parentEvent.allowGuestInvites,
        maxGuestsPerBooking: parentEvent.maxGuestsPerBooking,
        
        // SEO
        metaTitle: parentEvent.metaTitle,
        metaDescription: parentEvent.metaDescription,
        keywords: parentEvent.keywords,
      },
    });

    instances.push(childEvent);
    instanceCount++;
  }

  console.log(`✅ Created ${instances.length} recurring event instances`);
  return instances;
};

/**
 * Helper: Check host availability (no double-booking)
 */
export const checkHostAvailability = async (
  hostId: string,
  startDate: Date,
  endDate: Date,
  excludeEventId?: string
) => {
  const conflictingEvent = await prisma.event.findFirst({
    where: {
      hostId,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
      id: excludeEventId ? { not: excludeEventId } : undefined,
      OR: [
        {
          // Event starts during our time range
          startDate: { gte: startDate, lt: endDate },
        },
        {
          // Event ends during our time range
          endDate: { gt: startDate, lte: endDate },
        },
        {
          // Event completely encompasses our time range
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
    },
  });

  if (conflictingEvent) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Host is not available during this time. Conflicting event: "${conflictingEvent.title}" ` +
      `(${conflictingEvent.startDate.toLocaleString()} - ${conflictingEvent.endDate.toLocaleString()}). ` +
      `Please choose a different time slot.`
    );
  }
};
