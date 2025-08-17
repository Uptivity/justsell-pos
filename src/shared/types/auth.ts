import type { UserRole } from './database'

// JWT Token interfaces
export interface TokenPayload {
  userId: string
  username: string
  role: UserRole
  storeId?: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

// Authentication request/response types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: AuthenticatedUser
  tokens: TokenPair
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthenticatedUser {
  id: string
  username: string
  firstName?: string
  lastName?: string
  role: UserRole
  storeId?: string
  isActive: boolean
  lastLoginAt?: Date
}

// Permission types
export type Permission =
  | 'transaction:create'
  | 'transaction:read'
  | 'transaction:update'
  | 'transaction:delete'
  | 'product:create'
  | 'product:read'
  | 'product:update'
  | 'product:delete'
  | 'customer:create'
  | 'customer:read'
  | 'customer:update'
  | 'customer:delete'
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'store:manage'
  | 'reports:view'
  | 'compliance:manage'
  | 'system:admin'

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CASHIER: [
    'transaction:create',
    'transaction:read',
    'product:read',
    'customer:create',
    'customer:read',
    'customer:update',
  ],
  MANAGER: [
    'transaction:create',
    'transaction:read',
    'transaction:update',
    'transaction:delete',
    'product:create',
    'product:read',
    'product:update',
    'product:delete',
    'customer:create',
    'customer:read',
    'customer:update',
    'customer:delete',
    'user:read',
    'reports:view',
    'compliance:manage',
  ],
  ADMIN: [
    'transaction:create',
    'transaction:read',
    'transaction:update',
    'transaction:delete',
    'product:create',
    'product:read',
    'product:update',
    'product:delete',
    'customer:create',
    'customer:read',
    'customer:update',
    'customer:delete',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'store:manage',
    'reports:view',
    'compliance:manage',
    'system:admin',
  ],
}

// Authentication errors
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// Password validation types
export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}
