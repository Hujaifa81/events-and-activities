// Activity Types Constants - User Activity Tracking

/**
 * Activity Type Enum
 * Defines all possible user activity types for analytics
 */
export enum ActivityType {
  // ============================================
  // PAGE NAVIGATION
  // ============================================
  PAGE_VIEW = 'PAGE_VIEW',
  PAGE_EXIT = 'PAGE_EXIT',

  // ============================================
  // SEARCH & DISCOVERY
  // ============================================
  SEARCH = 'SEARCH',
  FILTER_APPLY = 'FILTER_APPLY',
  SORT_APPLY = 'SORT_APPLY',
  CATEGORY_BROWSE = 'CATEGORY_BROWSE',

  // ============================================
  // EVENT ACTIONS
  // ============================================
  EVENT_VIEW = 'EVENT_VIEW',
  EVENT_CREATE = 'EVENT_CREATE',
  EVENT_UPDATE = 'EVENT_UPDATE',
  EVENT_DELETE = 'EVENT_DELETE',
  EVENT_PUBLISH = 'EVENT_PUBLISH',
  EVENT_UNPUBLISH = 'EVENT_UNPUBLISH',
  EVENT_SHARE = 'EVENT_SHARE',
  EVENT_FAVORITE = 'EVENT_FAVORITE',
  EVENT_UNFAVORITE = 'EVENT_UNFAVORITE',
  EVENT_SAVE = 'EVENT_SAVE',
  EVENT_UNSAVE = 'EVENT_UNSAVE',
  EVENT_REPORT = 'EVENT_REPORT',

  // ============================================
  // BOOKING ACTIONS
  // ============================================
  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_VIEW = 'BOOKING_VIEW',
  BOOKING_EDIT = 'BOOKING_EDIT',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  BOOKING_CONFIRM = 'BOOKING_CONFIRM',
  BOOKING_REVIEW = 'BOOKING_REVIEW',

  // ============================================
  // PAYMENT ACTIONS
  // ============================================
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUND_REQUEST = 'PAYMENT_REFUND_REQUEST',
  PAYMENT_REFUND_COMPLETED = 'PAYMENT_REFUND_COMPLETED',

  // ============================================
  // USER AUTHENTICATION
  // ============================================
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SIGNUP = 'SIGNUP',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  EMAIL_VERIFY = 'EMAIL_VERIFY',

  // ============================================
  // PROFILE ACTIONS
  // ============================================
  PROFILE_VIEW = 'PROFILE_VIEW',
  PROFILE_EDIT = 'PROFILE_EDIT',
  PROFILE_PHOTO_UPLOAD = 'PROFILE_PHOTO_UPLOAD',
  PROFILE_DELETE = 'PROFILE_DELETE',

  // ============================================
  // SOCIAL ACTIONS
  // ============================================
  REVIEW_CREATE = 'REVIEW_CREATE',
  REVIEW_EDIT = 'REVIEW_EDIT',
  REVIEW_DELETE = 'REVIEW_DELETE',
  RATING_SUBMIT = 'RATING_SUBMIT',
  COMMENT_CREATE = 'COMMENT_CREATE',
  MESSAGE_SEND = 'MESSAGE_SEND',
  FRIEND_REQUEST_SEND = 'FRIEND_REQUEST_SEND',
  FRIEND_REQUEST_ACCEPT = 'FRIEND_REQUEST_ACCEPT',
  FOLLOW = 'FOLLOW',
  UNFOLLOW = 'UNFOLLOW',

  // ============================================
  // NOTIFICATION ACTIONS
  // ============================================
  NOTIFICATION_VIEW = 'NOTIFICATION_VIEW',
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  NOTIFICATION_SETTINGS_UPDATE = 'NOTIFICATION_SETTINGS_UPDATE',

  // ============================================
  // CONTENT ACTIONS
  // ============================================
  DOWNLOAD = 'DOWNLOAD',
  EXPORT = 'EXPORT',
  PRINT = 'PRINT',
  SHARE = 'SHARE',

  // ============================================
  // ADMIN ACTIONS
  // ============================================
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SYSTEM_SETTINGS_UPDATE = 'SYSTEM_SETTINGS_UPDATE',

  // ============================================
  // ERROR TRACKING
  // ============================================
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  ERROR_REPORTED = 'ERROR_REPORTED',
}

/**
 * Entity Type Enum
 * Defines all possible entity types for activity tracking
 */
export enum EntityType {
  USER = 'USER',
  EVENT = 'EVENT',
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  REVIEW = 'REVIEW',
  MESSAGE = 'MESSAGE',
  NOTIFICATION = 'NOTIFICATION',
  CATEGORY = 'CATEGORY',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

/**
 * Activity Categories
 * Groups activities by functional area
 */
export const ActivityCategories = {
  NAVIGATION: [
    ActivityType.PAGE_VIEW,
    ActivityType.PAGE_EXIT,
  ],
  DISCOVERY: [
    ActivityType.SEARCH,
    ActivityType.FILTER_APPLY,
    ActivityType.SORT_APPLY,
    ActivityType.CATEGORY_BROWSE,
  ],
  EVENT: [
    ActivityType.EVENT_VIEW,
    ActivityType.EVENT_CREATE,
    ActivityType.EVENT_UPDATE,
    ActivityType.EVENT_DELETE,
    ActivityType.EVENT_PUBLISH,
    ActivityType.EVENT_SHARE,
    ActivityType.EVENT_FAVORITE,
  ],
  BOOKING: [
    ActivityType.BOOKING_CREATE,
    ActivityType.BOOKING_VIEW,
    ActivityType.BOOKING_CANCEL,
    ActivityType.BOOKING_CONFIRM,
  ],
  PAYMENT: [
    ActivityType.PAYMENT_INITIATED,
    ActivityType.PAYMENT_COMPLETED,
    ActivityType.PAYMENT_FAILED,
    ActivityType.PAYMENT_REFUND_REQUEST,
  ],
  AUTH: [
    ActivityType.LOGIN,
    ActivityType.LOGOUT,
    ActivityType.SIGNUP,
    ActivityType.PASSWORD_RESET,
  ],
  SOCIAL: [
    ActivityType.REVIEW_CREATE,
    ActivityType.MESSAGE_SEND,
    ActivityType.FOLLOW,
    ActivityType.FRIEND_REQUEST_SEND,
  ],
} as const;
