import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  verifyPassword,
  validatePassword,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  toAuthenticatedUser,
} from '../../../shared/services/auth'
import type { User, UserRole } from '../../../shared/types/database'

// Mock JWT for testing
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload: unknown, _secret: string, _options: unknown) => {
    return `mock.${JSON.stringify(payload)}.token`
  }),
  verify: jest.fn((token: string, _secret: string, _options: unknown) => {
    if (token.includes('expired')) {
      const error = new Error('Token expired')
      error.name = 'TokenExpiredError'
      throw error
    }
    if (token.includes('invalid')) {
      const error = new Error('Invalid token')  
      error.name = 'JsonWebTokenError'
      throw error
    }
    return JSON.parse(token.split('.')[1])
  }),
  decode: jest.fn((_token: string) => ({
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  })),
  TokenExpiredError: class TokenExpiredError extends Error {
    name = 'TokenExpiredError'
  },
  JsonWebTokenError: class JsonWebTokenError extends Error {
    name = 'JsonWebTokenError'
  },
}))

// Mock bcrypt for testing
jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (password: string, saltRounds: number) => {
    return `hashed_${password}_${saltRounds}`
  }),
  compare: jest.fn(async (password: string, hash: string) => {
    return hash === `hashed_${password}_12`
  }),
}))

describe('Authentication Service', () => {
  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    passwordHash: 'hashed_password123_12',
    firstName: 'Test',
    lastName: 'User',
    role: 'CASHIER' as UserRole,
    storeId: 'store-456',
    isActive: true,
    lastLoginAt: new Date('2024-01-01T10:00:00Z'),
    passwordChangedAt: new Date('2024-01-01T00:00:00Z'),
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  describe('Token Operations', () => {
    test('generateTokens creates valid token pair', () => {
      const tokens = generateTokens(mockUser)

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(tokens).toHaveProperty('expiresAt')
      expect(tokens.expiresAt).toBeInstanceOf(Date)
    })

    test('verifyAccessToken validates valid tokens', () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        role: 'CASHIER' as UserRole,
        storeId: 'store-456',
      }

      const token = `mock.${JSON.stringify(mockPayload)}.token`
      const decoded = verifyAccessToken(token)

      expect(decoded).toEqual(mockPayload)
    })

    test('verifyAccessToken throws on expired token', () => {
      const token = 'expired.token.here'

      expect(() => verifyAccessToken(token)).toThrow('Access token expired')
    })

    test('verifyAccessToken throws on invalid token', () => {
      const token = 'invalid.token.here'

      expect(() => verifyAccessToken(token)).toThrow('Invalid access token')
    })

    test('verifyRefreshToken validates valid refresh tokens', () => {
      const mockPayload = { userId: 'user-123' }
      const token = `mock.${JSON.stringify(mockPayload)}.token`

      const decoded = verifyRefreshToken(token)
      expect(decoded).toEqual(mockPayload)
    })
  })

  describe('Password Operations', () => {
    test('hashPassword creates bcrypt hash', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBe('hashed_testPassword123_12')
    })

    test('verifyPassword validates correct password', async () => {
      const password = 'password123'
      const hash = 'hashed_password123_12'

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    test('verifyPassword rejects incorrect password', async () => {
      const password = 'wrongPassword'
      const hash = 'hashed_password123_12'

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(false)
    })

    test('validatePassword enforces all requirements', () => {
      const validPassword = 'Test123!@#'
      const result = validatePassword(validPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.strength).toBe('strong')
    })

    test('validatePassword rejects weak passwords', () => {
      const weakPassword = 'weak'
      const result = validatePassword(weakPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.strength).toBe('weak')
    })

    test('validatePassword identifies strong passwords', () => {
      const strongPassword = 'VerySecure123!@#$%'
      const result = validatePassword(strongPassword)

      expect(result.isValid).toBe(true)
      expect(result.strength).toBe('strong')
    })
  })

  describe('Permission System', () => {
    test('hasPermission correctly checks CASHIER permissions', () => {
      expect(hasPermission('CASHIER', 'transaction:create')).toBe(true)
      expect(hasPermission('CASHIER', 'transaction:read')).toBe(true)
      expect(hasPermission('CASHIER', 'user:delete')).toBe(false)
      expect(hasPermission('CASHIER', 'system:admin')).toBe(false)
    })

    test('hasPermission correctly checks MANAGER permissions', () => {
      expect(hasPermission('MANAGER', 'transaction:create')).toBe(true)
      expect(hasPermission('MANAGER', 'product:update')).toBe(true)
      expect(hasPermission('MANAGER', 'reports:view')).toBe(true)
      expect(hasPermission('MANAGER', 'user:create')).toBe(false)
      expect(hasPermission('MANAGER', 'system:admin')).toBe(false)
    })

    test('hasPermission correctly checks ADMIN permissions', () => {
      expect(hasPermission('ADMIN', 'transaction:create')).toBe(true)
      expect(hasPermission('ADMIN', 'user:delete')).toBe(true)
      expect(hasPermission('ADMIN', 'system:admin')).toBe(true)
    })

    test('hasAllPermissions requires all permissions', () => {
      const permissions: import('../../../shared/types/auth').Permission[] = ['transaction:read', 'product:read']

      expect(hasAllPermissions('CASHIER', permissions)).toBe(true)
      expect(hasAllPermissions('CASHIER', ['user:delete', 'product:read'])).toBe(false)
    })

    test('hasAnyPermission requires only one permission', () => {
      const permissions: import('../../../shared/types/auth').Permission[] = ['user:delete', 'transaction:read']

      expect(hasAnyPermission('CASHIER', permissions)).toBe(true)
      expect(hasAnyPermission('CASHIER', ['user:delete', 'system:admin'])).toBe(false)
    })
  })

  describe('User Conversion', () => {
    test('toAuthenticatedUser converts database user correctly', () => {
      const authUser = toAuthenticatedUser(mockUser)

      expect(authUser).toEqual({
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'CASHIER',
        storeId: 'store-456',
        isActive: true,
        lastLoginAt: new Date('2024-01-01T10:00:00Z'),
      })
    })

    test('toAuthenticatedUser handles optional fields', () => {
      const userWithoutOptionals: User = {
        ...mockUser,
        firstName: null,
        lastName: null,
        storeId: null,
        lastLoginAt: null,
      }

      const authUser = toAuthenticatedUser(userWithoutOptionals)

      expect(authUser.firstName).toBeUndefined()
      expect(authUser.lastName).toBeUndefined()
      expect(authUser.storeId).toBeUndefined()
      expect(authUser.lastLoginAt).toBeUndefined()
    })
  })
})
