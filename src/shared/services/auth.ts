import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type {
  TokenPayload,
  TokenPair,
  AuthenticatedUser,
  Permission,
  PasswordRequirements,
  PasswordValidationResult,
} from '../types/auth'
import type { User, UserRole } from '../types/database'
import { ROLE_PERMISSIONS, AuthenticationError, AuthorizationError } from '../types/auth'

// Environment configuration with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Salt rounds for bcrypt
const BCRYPT_SALT_ROUNDS = 12

// Password requirements
export const PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

/**
 * Generates JWT access and refresh tokens for a user
 */
export function generateTokens(user: User): TokenPair {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    storeId: user.storeId || undefined,
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'justsell-pos',
    audience: 'pos-app',
  } as jwt.SignOptions)

  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'justsell-pos',
    audience: 'pos-app',
  } as jwt.SignOptions)

  // Calculate expiration time
  const decoded = jwt.decode(accessToken) as TokenPayload
  const expiresAt = new Date((decoded.exp || 0) * 1000)

  return {
    accessToken,
    refreshToken,
    expiresAt,
  }
}

/**
 * Verifies and decodes a JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'justsell-pos',
      audience: 'pos-app',
    }) as TokenPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || (error as Error).name === 'TokenExpiredError') {
      throw new AuthenticationError('Access token expired', 'TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError || (error as Error).name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid access token', 'TOKEN_INVALID')
    }
    throw new AuthenticationError('Token verification failed', 'TOKEN_ERROR')
  }
}

/**
 * Verifies and decodes a JWT refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'justsell-pos',
      audience: 'pos-app',
    }) as { userId: string }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || (error as Error).name === 'TokenExpiredError') {
      throw new AuthenticationError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError || (error as Error).name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid refresh token', 'REFRESH_TOKEN_INVALID')
    }
    throw new AuthenticationError('Refresh token verification failed', 'REFRESH_TOKEN_ERROR')
  }
}

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verifies a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validates a password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`)
  }

  // Check for uppercase
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for lowercase
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check for numbers
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special characters
  if (
    PASSWORD_REQUIREMENTS.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character')
  }

  // Determine strength
  const hasLength = password.length >= 12
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  const strengthScore = [hasLength, hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(
    Boolean,
  ).length

  if (strengthScore >= 4) {
    strength = 'strong'
  } else if (strengthScore >= 3) {
    strength = 'medium'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Converts a User database model to AuthenticatedUser type
 */
export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    role: user.role,
    storeId: user.storeId || undefined,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt || undefined,
  }
}

/**
 * Checks if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole]
  return rolePermissions.includes(permission)
}

/**
 * Checks if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission))
}

/**
 * Checks if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission))
}

/**
 * Gets all permissions for a user role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[userRole]]
}

/**
 * Validates user access to a store (if store-specific access is required)
 */
export function validateStoreAccess(user: AuthenticatedUser, requiredStoreId?: string): boolean {
  // ADMIN users have access to all stores
  if (user.role === 'ADMIN') {
    return true
  }

  // If no specific store is required, allow access
  if (!requiredStoreId) {
    return true
  }

  // Check if user's store matches required store
  return user.storeId === requiredStoreId
}

/**
 * Creates an authorization error with consistent messaging
 */
export function createAuthorizationError(
  message: string = 'Access denied',
  requiredPermission?: Permission,
): AuthorizationError {
  const fullMessage = requiredPermission
    ? `${message}. Required permission: ${requiredPermission}`
    : message

  return new AuthorizationError(fullMessage, 'ACCESS_DENIED')
}
