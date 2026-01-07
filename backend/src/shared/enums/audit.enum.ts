/**
 * Audit Action Enum
 * Synced with Prisma AuditAction enum
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VERIFY = 'VERIFY',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  BAN = 'BAN',
  RESTORE = 'RESTORE',
}

/**
 * Audit Entity Type Enum
 * Synced with Prisma AuditEntityType enum
 */
export enum AuditEntityType {
  USER = 'USER',
  EVENT = 'EVENT',
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  REVIEW = 'REVIEW',
  REPORT = 'REPORT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  SYSTEM_SETTING = 'SYSTEM_SETTING',
  PAYOUT_ACCOUNT = 'PAYOUT_ACCOUNT',
}
