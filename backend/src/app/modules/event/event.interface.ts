/**
 * Event Module - TypeScript Interfaces
 * Production-ready type definitions matching Prisma schema
 */

// ============================================
// ENUMS (Manually defined for module use)
// ============================================

export enum EventType {
  MUSIC_CONCERT = 'MUSIC_CONCERT',
  SPORTS_FITNESS = 'SPORTS_FITNESS',
  ARTS_CRAFTS = 'ARTS_CRAFTS',
  FOOD_DINING = 'FOOD_DINING',
  GAMING_ESPORTS = 'GAMING_ESPORTS',
  BOOKS_LEARNING = 'BOOKS_LEARNING',
  WELLNESS_YOGA = 'WELLNESS_YOGA',
  OUTDOOR_ADVENTURE = 'OUTDOOR_ADVENTURE',
  NETWORKING_BUSINESS = 'NETWORKING_BUSINESS',
  ENTERTAINMENT_SHOWS = 'ENTERTAINMENT_SHOWS',
  TECH_INNOVATION = 'TECH_INNOVATION',
  PET_ACTIVITIES = 'PET_ACTIVITIES',
  TRAVEL_TOURS = 'TRAVEL_TOURS',
  BOARD_GAMES_HOBBIES = 'BOARD_GAMES_HOBBIES',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  CYCLING_BIKING = 'CYCLING_BIKING',
  SWIMMING_WATER_SPORTS = 'SWIMMING_WATER_SPORTS',
  ROCK_CLIMBING = 'ROCK_CLIMBING',
  KARAOKE_OPEN_MIC = 'KARAOKE_OPEN_MIC',
  VOLUNTEERING_SOCIAL_CAUSES = 'VOLUNTEERING_SOCIAL_CAUSES',
  OTHER = 'OTHER',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  OPEN = 'OPEN',
  FULL = 'FULL',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
  FOLLOWERS_ONLY = 'FOLLOWERS_ONLY',
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
  ALL_LEVELS = 'ALL_LEVELS',
}

export enum EventMode {
  PHYSICAL = 'PHYSICAL',
  VIRTUAL = 'VIRTUAL',
  HYBRID = 'HYBRID',
}

export enum GenderPreference {
  MIXED = 'MIXED',
  MALE_ONLY = 'MALE_ONLY',
  FEMALE_ONLY = 'FEMALE_ONLY',
}

export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// ============================================
// CREATE EVENT INPUT
// ============================================

export interface CreateEventInput {
  // Basic Info (Required)
  title: string;
  description: string;
  shortDescription?: string;
  
  // Category & Type (Required)
  type: EventType;
  categoryId: string;
  tags?: string[];
  
  // Host (Will be set from auth)
  coHostIds?: string[];
  
  // Status & Visibility
  visibility?: EventVisibility;
  
  // Date & Time (Required)
  startDate: Date | string;
  endDate: Date | string;
  timezone?: string;
  duration?: number;
  
  // Recurring Events
  isRecurring?: boolean;
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrenceEndDate?: Date | string;
  
  // Location (Required for mode)
  mode: EventMode;
  
  // Physical Location
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  
  // Virtual Location
  virtualMeetingUrl?: string;
  virtualMeetingId?: string;
  virtualPassword?: string;
  
  // Media
  bannerImage?: string;
  images?: string[];
  videoUrl?: string;
  
  // Capacity & Restrictions
  minParticipants?: number;
  maxParticipants?: number;
  ageMin?: number;
  ageMax?: number;
  genderPreference?: string;
  difficultyLevel?: DifficultyLevel;
  
  // Requirements
  requiredItems?: string[];
  dresscode?: string;
  prerequisites?: string;
  
  // Pricing
  isFree?: boolean;
  price?: number;
  currency?: string;
  earlyBirdPrice?: number;
  earlyBirdEndDate?: Date | string;
  groupDiscountEnabled?: boolean;
  groupDiscountMin?: number;
  groupDiscountPercent?: number;
  
  // Refund Policy
  refundPolicy?: string;
  refundDeadline?: Date | string;
  
  // Features
  instantBooking?: boolean;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
  allowGuestInvites?: boolean;
  maxGuestsPerBooking?: number;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

// ============================================
// UPDATE EVENT INPUT
// ============================================

export interface UpdateEventInput {
  // All fields optional for updates
  title?: string;
  description?: string;
  shortDescription?: string;
  
  type?: EventType;
  categoryId?: string;
  tags?: string[];
  
  coHostIds?: string[];
  visibility?: EventVisibility;
  
  startDate?: Date | string;
  endDate?: Date | string;
  timezone?: string;
  duration?: number;
  
  mode?: EventMode;
  
  // Location fields
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  
  virtualMeetingUrl?: string;
  virtualMeetingId?: string;
  virtualPassword?: string;
  
  bannerImage?: string;
  images?: string[];
  videoUrl?: string;
  
  minParticipants?: number;
  maxParticipants?: number;
  ageMin?: number;
  ageMax?: number;
  genderPreference?: string;
  difficultyLevel?: DifficultyLevel;
  
  requiredItems?: string[];
  dresscode?: string;
  prerequisites?: string;
  
  isFree?: boolean;
  price?: number;
  currency?: string;
  earlyBirdPrice?: number;
  earlyBirdEndDate?: Date | string;
  groupDiscountEnabled?: boolean;
  groupDiscountMin?: number;
  groupDiscountPercent?: number;
  
  refundPolicy?: string;
  refundDeadline?: Date | string;
  
  instantBooking?: boolean;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
  allowGuestInvites?: boolean;
  maxGuestsPerBooking?: number;
  
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  
  // Special flag for recurring updates
  updateFutureInstances?: boolean;
}

// ============================================
// QUERY FILTERS
// ============================================

export interface EventFilterRequest {
  searchTerm?: string;
  category?: string;
  city?: string;
  country?: string;
  type?: EventType;
  mode?: EventMode;
  status?: EventStatus;
  visibility?: EventVisibility;
  
  isFree?: boolean;
  minPrice?: number;
  maxPrice?: number;
  
  startDate?: string;
  endDate?: string;
  
  hostId?: string;
  tags?: string[];
  
  difficultyLevel?: DifficultyLevel;
  
  latitude?: number;
  longitude?: number;
  radius?: number; // For location-based search (in km)
  
  includeParentEvents?: boolean; // For host dashboard to show parent events
  
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// ADMIN ACTIONS
// ============================================

export interface RejectEventInput {
  reason: string;
  notifyHost?: boolean;
}

export interface FeatureEventInput {
  featured: boolean;
  featuredUntil?: Date | string;
  position?: number;
}

export interface SuspendEventInput {
  reason: string;
  suspendUntil?: Date | string;
  notifyHost?: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

export interface RecurringEventConfig {
  pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  endDate: Date;
  parentEventData: Partial<CreateEventInput>;
}

export interface SlugGenerationOptions {
  title: string;
  suffix?: string;
}
