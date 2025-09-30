import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
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

// Enhanced security configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex')
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m' // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

// Enhanced password requirements for financial system
export const ENHANCED_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12, // Increased from 8 for financial security
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  // maxAge: 90, // Password expiry in days - extend interface if needed
  // preventReuse: 5, // Prevent reusing last 5 passwords - extend interface if needed
}

// Token blacklist for logout/revocation
const tokenBlacklist = new Set<string>()

// Track failed login attempts for account lockout
const failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

/**
 * Enhanced JWT token generation with additional security claims
 */
export function generateSecureTokens(user: User, deviceInfo?: any): TokenPair {
  const jti = crypto.randomUUID() // JWT ID for token tracking
  const sessionId = crypto.randomUUID() // Session tracking

  const payload: TokenPayload & {
    jti: string
    sessionId: string
    deviceFingerprint?: string
    iat: number
    iss: string
    aud: string
  } = {
    userId: user.id,
    username: user.username,
    role: user.role,
    storeId: user.storeId || undefined,
    jti,
    sessionId,
    deviceFingerprint: deviceInfo ? crypto.createHash('sha256').update(JSON.stringify(deviceInfo)).digest('hex') : undefined,
    iat: Math.floor(Date.now() / 1000),
    iss: 'justsell-pos-secure',
    aud: 'pos-financial-system'
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'justsell-pos-secure',
    audience: 'pos-financial-system'
  } as jwt.SignOptions)

  const refreshPayload = {
    userId: user.id,
    sessionId,
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    type: 'refresh'
  }

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'justsell-pos-secure',
    audience: 'pos-financial-system'
  } as jwt.SignOptions)

  const decoded = jwt.decode(accessToken) as TokenPayload
  const expiresAt = new Date((decoded.exp || 0) * 1000)

  return {
    accessToken,
    refreshToken,
    expiresAt
    // sessionId - extend TokenPair interface if needed
  }
}

/**
 * Enhanced access token verification with blacklist checking
 */
export function verifySecureAccessToken(token: string, deviceInfo?: any): TokenPayload & { sessionId: string } {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new AuthenticationError('Token has been revoked', 'TOKEN_REVOKED')
    }

    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'justsell-pos-secure',
      audience: 'pos-financial-system',
      algorithms: ['HS256']
    }) as TokenPayload & { jti: string; sessionId: string; deviceFingerprint?: string }

    // Verify device fingerprint if provided
    if (deviceInfo && payload.deviceFingerprint) {
      const currentFingerprint = crypto.createHash('sha256').update(JSON.stringify(deviceInfo)).digest('hex')
      if (payload.deviceFingerprint !== currentFingerprint) {
        throw new AuthenticationError('Device fingerprint mismatch', 'DEVICE_MISMATCH')
      }
    }

    return payload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token expired', 'TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid access token', 'TOKEN_INVALID')
    }
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('Token verification failed', 'TOKEN_ERROR')
  }
}

/**
 * Enhanced refresh token verification
 */
export function verifySecureRefreshToken(token: string): { userId: string; sessionId: string; jti: string } {
  try {
    if (tokenBlacklist.has(token)) {
      throw new AuthenticationError('Refresh token has been revoked', 'REFRESH_TOKEN_REVOKED')
    }

    const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'justsell-pos-secure',
      audience: 'pos-financial-system',
      algorithms: ['HS256']
    }) as { userId: string; sessionId: string; jti: string; type: string }

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type', 'INVALID_TOKEN_TYPE')
    }

    return payload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token', 'REFRESH_TOKEN_INVALID')
    }
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('Refresh token verification failed', 'REFRESH_TOKEN_ERROR')
  }
}

/**
 * Revoke tokens (add to blacklist)
 */
export function revokeToken(token: string): void {
  tokenBlacklist.add(token)

  // Clean up old blacklisted tokens periodically
  if (tokenBlacklist.size > 10000) {
    // In production, implement proper cleanup based on token expiry
    const tokensArray = Array.from(tokenBlacklist)
    const tokensToKeep = tokensArray.slice(-5000) // Keep latest 5000
    tokenBlacklist.clear()
    tokensToKeep.forEach(t => tokenBlacklist.add(t))
  }
}

/**
 * Enhanced password hashing with additional security measures
 */
export async function hashPasswordSecure(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const passwordSalt = salt || await bcrypt.genSalt(14) // Increased rounds for financial security
  const hash = await bcrypt.hash(password, passwordSalt)
  return { hash, salt: passwordSalt }
}

/**
 * Secure password verification with timing attack protection
 */
export async function verifyPasswordSecure(password: string, hash: string): Promise<boolean> {
  try {
    const startTime = process.hrtime.bigint()
    const isValid = await bcrypt.compare(password, hash)
    const endTime = process.hrtime.bigint()

    // Add consistent timing to prevent timing attacks
    const targetTime = 100_000_000n // 100ms in nanoseconds
    const actualTime = endTime - startTime
    if (actualTime < targetTime) {
      await new Promise(resolve => setTimeout(resolve, Number((targetTime - actualTime) / 1_000_000n)))
    }

    return isValid
  } catch (error) {
    // Always take the same amount of time even on error
    await new Promise(resolve => setTimeout(resolve, 100))
    return false
  }
}

/**
 * Enhanced password validation for financial systems
 */
export function validatePasswordSecure(password: string, username?: string): PasswordValidationResult {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  // Enhanced security checks
  if (password.length < ENHANCED_PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${ENHANCED_PASSWORD_REQUIREMENTS.minLength} characters long`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common weak patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns')
      break
    }
  }

  // Check if password contains username
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    errors.push('Password must not contain the username')
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password must not contain more than 2 repeated characters in sequence')
  }

  // Enhanced strength calculation
  const hasLength = password.length >= 16
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  const hasNoCommonPatterns = !commonPatterns.some(pattern => pattern.test(password))
  const hasEntropy = new Set(password).size >= 8 // At least 8 unique characters

  const strengthScore = [
    hasLength, hasUppercase, hasLowercase, hasNumbers,
    hasSpecialChars, hasNoCommonPatterns, hasEntropy
  ].filter(Boolean).length

  if (strengthScore >= 6) {
    strength = 'strong'
  } else if (strengthScore >= 4) {
    strength = 'medium'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Track failed login attempts for account lockout
 */
export function trackFailedLoginAttempt(identifier: string): boolean {
  const now = new Date()
  const attempts = failedAttempts.get(identifier)

  if (attempts) {
    // Reset if enough time has passed
    if (now.getTime() - attempts.lastAttempt.getTime() > LOCKOUT_DURATION) {
      failedAttempts.delete(identifier)
      return false
    }

    attempts.count++
    attempts.lastAttempt = now

    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
      return true // Account should be locked
    }
  } else {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now })
  }

  return false
}

/**
 * Clear failed login attempts on successful login
 */
export function clearFailedLoginAttempts(identifier: string): void {
  failedAttempts.delete(identifier)
}

/**
 * Check if account is currently locked
 */
export function isAccountLocked(identifier: string): boolean {
  const attempts = failedAttempts.get(identifier)
  if (!attempts) return false

  const now = new Date()
  if (now.getTime() - attempts.lastAttempt.getTime() > LOCKOUT_DURATION) {
    failedAttempts.delete(identifier)
    return false
  }

  return attempts.count >= MAX_FAILED_ATTEMPTS
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptSensitiveData(data: string): { encrypted: string; iv: string; tag: string } {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('justsell-pos-financial', 'utf8'))

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 */
export function decryptSensitiveData(encrypted: string, iv: string, tag: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
    decipher.setAAD(Buffer.from('justsell-pos-financial', 'utf8'))
    decipher.setAuthTag(Buffer.from(tag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    throw new Error('Failed to decrypt sensitive data')
  }
}

/**
 * Generate secure session token for CSRF protection
 */
export function generateSecureSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate CSRF token for session
 */
export function generateSecureCSRFToken(sessionToken: string): string {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
  const timestamp = Date.now().toString()

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(sessionToken + timestamp)

  return timestamp + '.' + hmac.digest('hex')
}

/**
 * Validate CSRF token with timestamp checking
 */
export function validateSecureCSRFToken(token: string, sessionToken: string): boolean {
  try {
    const [timestamp, signature] = token.split('.')
    if (!timestamp || !signature) return false

    // Check if token is too old (1 hour)
    const tokenTime = parseInt(timestamp)
    if (Date.now() - tokenTime > 60 * 60 * 1000) return false

    const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
    const expectedHmac = crypto.createHmac('sha256', secret)
    expectedHmac.update(sessionToken + timestamp)
    const expectedSignature = expectedHmac.digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    return false
  }
}

// Re-export existing functions with secure defaults
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  validateStoreAccess,
  createAuthorizationError,
  toAuthenticatedUser
} from './auth'