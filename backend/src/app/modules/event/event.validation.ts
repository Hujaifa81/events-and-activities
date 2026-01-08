// Event Validation Schemas
import { z } from 'zod';
import { EventType, EventMode, EventVisibility, DifficultyLevel, GenderPreference, RecurrencePattern } from './event.interface';


// Helper for URL validation (Zod v4 deprecated .url())
const urlSchema = () => z.string().refine((val) => {
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}, { message: 'Invalid URL format' });

// Helper for UUID validation (Zod v4 deprecated .uuid())
const uuidSchema = () => z.string().refine((val) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
}, { message: 'Invalid UUID format' });

// Enum values for validation

/**
 * Create Event Validation
 */
export const createEventSchema = z.object({
  // Basic Info (Required)
  title: z.string({ message: 'Event title is required' }).min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string({ message: 'Event description is required' }).min(20, 'Description must be at least 20 characters').max(5000, 'Description must not exceed 5000 characters'),
  shortDescription: z.string().max(300, 'Short description must not exceed 300 characters').optional(),
    
    // Category & Type (Required)
    type: z.enum(Object.values(EventType), { message: 'Invalid event type' }),
    categoryId: z.string({ message: 'Category is required' }).refine((val) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(val);
    }, { message: 'Invalid category ID' }),
    tags: z.array(z.string()).optional(),
    
    // Host
    coHostIds: z.array(uuidSchema()).optional(),
    
    // Visibility
    visibility: z.enum(Object.values(EventVisibility), { message: 'Invalid visibility option' }).optional(),
    
    // Date & Time (Required)
    startDate: z.iso.datetime({ message: 'Start date is required' }),
    endDate: z.iso.datetime({ message: 'End date is required' }), // When THIS instance ends (duration)
    timezone: z.string().optional(),
    duration: z.number().int().positive('Duration must be positive').optional(),
    
    // Recurring Events
    isRecurring: z.boolean().optional(),
    recurrencePattern: z.enum(Object.values(RecurrencePattern), { message: 'Invalid recurrence pattern' }).optional(),
    recurrenceEndDate: z.iso.datetime().optional(), // When to STOP creating new instances (series end)
    
    // Location (Required based on mode)
    mode: z.enum(Object.values(EventMode), { message: 'Event mode is required' }),
    
    // Physical Location
    venue: z.string().max(200, 'Venue name must not exceed 200 characters').optional(),
    address: z.string().max(500, 'Address must not exceed 500 characters').optional(),
    city: z.string().max(100, 'City name must not exceed 100 characters').optional(),
    state: z.string().max(100, 'State name must not exceed 100 characters').optional(),
    country: z.string().max(100, 'Country name must not exceed 100 characters').optional(),
    postalCode: z.string().max(20, 'Postal code must not exceed 20 characters').optional(),
    latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    
    // Virtual Location
    virtualMeetingUrl: urlSchema().optional(),
    virtualMeetingId: z.string().max(100, 'Meeting ID must not exceed 100 characters').optional(),
    virtualPassword: z.string().max(50, 'Password must not exceed 50 characters').optional(),
    
    // Media
    bannerImage: urlSchema().optional(),
    images: z.array(urlSchema()).optional(),
    videoUrl: urlSchema().optional(),
    
    // Capacity
    minParticipants: z.number().int().positive().optional(),
    maxParticipants: z.number().int().positive().optional(),
    ageMin: z.number().int().min(0).max(100).optional(),
    ageMax: z.number().int().min(0).max(100).optional(),
    genderPreference: z.enum(Object.values(GenderPreference), { message: 'Invalid gender preference' }).optional(),
    difficultyLevel: z.enum(Object.values(DifficultyLevel), { message: 'Invalid difficulty level' }).optional(),
    
    // Requirements
    requiredItems: z.array(z.string()).optional(),
    dresscode: z.string().max(200).optional(),
    prerequisites: z.string().max(1000).optional(),
    
    // Pricing
    isFree: z.boolean().optional(),
    price: z.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    earlyBirdPrice: z.number().min(0).optional(),
    earlyBirdEndDate: z.iso.datetime().optional(),
    groupDiscountEnabled: z.boolean().optional(),
    groupDiscountMin: z.number().int().positive().optional(),
    groupDiscountPercent: z.number().min(0).max(100).optional(),
    
    // Refund Policy
    refundPolicy: z.string().max(1000).optional(),
    refundDeadline: z.iso.datetime().optional(),
    
    // Features
    instantBooking: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    allowWaitlist: z.boolean().optional(),
    allowGuestInvites: z.boolean().optional(),
    maxGuestsPerBooking: z.number().int().positive().optional(),
    
    // SEO
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional(),
  }).refine((data) => {
    // Validate: endDate must be after startDate
    return new Date(data.endDate) > new Date(data.startDate);
  }, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }).refine((data) => {
    // Validate: if not free, price must be provided
    if (data.isFree === false && !data.price) {
      return false;
    }
    return true;
  }, {
    message: 'Price is required for paid events',
    path: ['price'],
  }).refine((data) => {
    // Validate: if recurring, pattern and endDate required
    if (data.isRecurring && (!data.recurrencePattern || !data.recurrenceEndDate)) {
      return false;
    }
    return true;
  }, {
    message: 'Recurrence pattern and end date required for recurring events',
    path: ['recurrencePattern'],
  }).refine((data) => {
    // Validate: recurrenceEndDate must be after startDate (not endDate - it's when to stop creating instances)
    if (data.isRecurring && data.recurrenceEndDate) {
      return new Date(data.recurrenceEndDate) > new Date(data.startDate);
    }
    return true;
  }, {
    message: 'Recurrence end date must be after event start date',
    path: ['recurrenceEndDate'],
  }).refine((data) => {
    // Validate: recurrenceEndDate must be at least equal to endDate (first instance should complete)
    if (data.isRecurring && data.recurrenceEndDate) {
      return new Date(data.recurrenceEndDate) >= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Recurrence end date must be at or after the first event instance end date',
    path: ['recurrenceEndDate'],
  }).refine((data) => {
    // Validate: recurrenceEndDate must have minimum gap based on pattern
    if (data.isRecurring && data.recurrencePattern && data.recurrenceEndDate) {
      const startDate = new Date(data.startDate);
      const recurrenceEndDate = new Date(data.recurrenceEndDate);
      const daysDiff = Math.floor((recurrenceEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (data.recurrencePattern === 'DAILY' && daysDiff < 1) {
        return false;
      }
      if (data.recurrencePattern === 'WEEKLY' && daysDiff < 7) {
        return false;
      }
      if (data.recurrencePattern === 'MONTHLY' && daysDiff < 30) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Recurrence end date must be at least 1 day (DAILY), 7 days (WEEKLY), or 30 days (MONTHLY) after start date',
    path: ['recurrenceEndDate'],
  }).refine((data) => {
    // Validate: physical/hybrid events need location
    if ((data.mode === 'PHYSICAL' || data.mode === 'HYBRID') && !data.venue) {
      return false;
    }
    return true;
  }, {
    message: 'Venue is required for physical/hybrid events',
    path: ['venue'],
  }).refine((data) => {
    // Validate: virtual/hybrid events need meeting URL
    if ((data.mode === 'VIRTUAL' || data.mode === 'HYBRID') && !data.virtualMeetingUrl) {
      return false;
    }
    return true;
  }, {
    message: 'Virtual meeting URL is required for virtual/hybrid events',
    path: ['virtualMeetingUrl'],
  });

/**
 * Update Event Validation
 */
export const updateEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters').optional(),
    description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description must not exceed 5000 characters').optional(),
    shortDescription: z.string().max(300, 'Short description must not exceed 300 characters').optional(),
    
    type: z.enum(Object.values(EventType), { message: 'Invalid event type' }).optional(),
    categoryId: uuidSchema().optional(),
    tags: z.array(z.string()).optional(),
    
    coHostIds: z.array(uuidSchema()).optional(),
    visibility: z.enum(Object.values(EventVisibility), { message: 'Invalid visibility option' }).optional(),
    
    startDate: z.iso.datetime().optional(),
    endDate: z.iso.datetime().optional(),
    timezone: z.string().optional(),
    duration: z.number().int().positive('Duration must be positive').optional(),
    
    mode: z.enum(Object.values(EventMode), { message: 'Invalid event mode' }).optional(),
    
    venue: z.string().max(200, 'Venue name must not exceed 200 characters').optional(),
    address: z.string().max(500, 'Address must not exceed 500 characters').optional(),
    city: z.string().max(100, 'City name must not exceed 100 characters').optional(),
    state: z.string().max(100, 'State name must not exceed 100 characters').optional(),
    country: z.string().max(100, 'Country name must not exceed 100 characters').optional(),
    postalCode: z.string().max(20, 'Postal code must not exceed 20 characters').optional(),
    latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    
    virtualMeetingUrl: urlSchema().optional(),
    virtualMeetingId: z.string().max(100, 'Meeting ID must not exceed 100 characters').optional(),
    virtualPassword: z.string().max(50, 'Password must not exceed 50 characters').optional(),
    
    bannerImage: urlSchema().optional(),
    images: z.array(urlSchema()).optional(),
    videoUrl: urlSchema().optional(),
    
    minParticipants: z.number().int().positive('Minimum participants must be positive').optional(),
    maxParticipants: z.number().int().positive('Maximum participants must be positive').optional(),
    ageMin: z.number().int().min(0, 'Minimum age cannot be negative').max(100, 'Minimum age must not exceed 100').optional(),
    ageMax: z.number().int().min(0, 'Maximum age cannot be negative').max(100, 'Maximum age must not exceed 100').optional(),
    genderPreference: z.enum(Object.values(GenderPreference), { message: 'Invalid gender preference' }).optional(),
    difficultyLevel: z.enum(Object.values(DifficultyLevel), { message: 'Invalid difficulty level' }).optional(),
    
    requiredItems: z.array(z.string()).optional(),
    dresscode: z.string().max(200, 'Dress code must not exceed 200 characters').optional(),
    prerequisites: z.string().max(1000, 'Prerequisites must not exceed 1000 characters').optional(),
    
    isFree: z.boolean().optional(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    currency: z.string().length(3, 'Currency code must be 3 characters').optional(),
    earlyBirdPrice: z.number().min(0, 'Early bird price cannot be negative').optional(),
    earlyBirdEndDate: z.iso.datetime().optional(),
    groupDiscountEnabled: z.boolean().optional(),
    groupDiscountMin: z.number().int().positive('Group discount minimum must be positive').optional(),
    groupDiscountPercent: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').optional(),
    
    refundPolicy: z.string().max(1000, 'Refund policy must not exceed 1000 characters').optional(),
    refundDeadline: z.iso.datetime().optional(),
    
    instantBooking: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    allowWaitlist: z.boolean().optional(),
    allowGuestInvites: z.boolean().optional(),
    maxGuestsPerBooking: z.number().int().positive('Maximum guests must be positive').optional(),
    
    metaTitle: z.string().max(60, 'Meta title must not exceed 60 characters').optional(),
    metaDescription: z.string().max(160, 'Meta description must not exceed 160 characters').optional(),
    keywords: z.array(z.string()).optional(),
    
    updateFutureInstances: z.boolean().optional(),
  }).refine((data) => {
    // Validate: if both dates provided, endDate must be after startDate
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  }, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }).refine((data) => {
    // Validate: if explicitly set to not free, price must be provided
    if (data.isFree === false && !data.price) {
      return false;
    }
    return true;
  }, {
    message: 'Price is required for paid events',
    path: ['price'],
  }).refine((data) => {
    // Validate: if mode is physical/hybrid, venue should be provided
    if ((data.mode === 'PHYSICAL' || data.mode === 'HYBRID') && data.venue === null) {
      return false;
    }
    return true;
  }, {
    message: 'Venue is required for physical/hybrid events',
    path: ['venue'],
  }).refine((data) => {
    // Validate: if mode is virtual/hybrid, meeting URL should be provided
    if ((data.mode === 'VIRTUAL' || data.mode === 'HYBRID') && data.virtualMeetingUrl === null) {
      return false;
    }
    return true;
  }, {
    message: 'Virtual meeting URL is required for virtual/hybrid events',
    path: ['virtualMeetingUrl'],
  });

/**
 * Publish Event Validation
 */
export const publishEventSchema = z.object({
  params: z.object({
    id: uuidSchema(),
  }),
});

/**
 * Reject Event Validation
 */
export const rejectEventSchema = z.object({
  reason: z
    .string({ message: 'Rejection reason is required' })
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  
  notifyHost: z.boolean().optional().default(true),
});

/**
 * Feature Event Validation
 */
export const featureEventSchema = z.object({
  featured: z.boolean({ message: 'Featured status is required' }),
  
  featuredUntil: z.string().optional(),
  
  position: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),
});

/**
 * Suspend Event Validation
 */
export const suspendEventSchema = z.object({
  reason: z
    .string({ message: 'Suspension reason is required' })
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  
  suspendUntil: z.string().optional(),
  
  notifyHost: z.boolean().optional().default(true),
});

/**
 * Query/Filter Validation (for getAllEvents)
 */
export const filterEventSchema = z.object({
  searchTerm: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  type: z.enum(Object.values(EventType) as [string, ...string[]]).optional(),
  mode: z.enum(Object.values(EventMode) as [string, ...string[]]).optional(),
  status: z.string().optional(),
  visibility: z.enum(Object.values(EventVisibility) as [string, ...string[]]).optional(),
  
  isFree: z.string().optional(), // Query params are strings, converted in service
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  
  hostId: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string
  
  difficultyLevel: z.enum(Object.values(DifficultyLevel) as [string, ...string[]]).optional(),
  
  // Geo-spatial search
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  radius: z.string().optional(),
  
  includeParentEvents: z.string().optional(),
  
  // Pagination
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const EventValidation = {
  createEvent: createEventSchema,
  updateEvent: updateEventSchema,
  publishEvent: publishEventSchema,
  rejectEvent: rejectEventSchema,
  featureEvent: featureEventSchema,
  suspendEvent: suspendEventSchema,
  filterEvent: filterEventSchema,
};
