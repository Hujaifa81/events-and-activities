// User Module Interfaces

// ============================================
// ENUMS & TYPES
// ============================================

export enum UserRole {
  USER = 'USER',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DEACTIVATED = 'DEACTIVATED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
  OTHER = 'OTHER',
}

// ============================================
// USER INTERFACES
// ============================================

export interface IUserProfile {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  isVerified: boolean;
  profile?: IUserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
  profile?: Partial<IUserProfile>;
}

export interface IUserUpdate {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<IUserProfile>;
}

export interface IUserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  city?: string;
  country?: string;
  isVerified?: boolean;
}

export interface IUserResponse {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  isVerified: boolean;
  profile?: IUserProfile;
  createdAt: Date;
  updatedAt: Date;
}
