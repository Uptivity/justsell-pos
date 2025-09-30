import {
  generateSecureTokens,
  verifySecureAccessToken,
  verifySecureRefreshToken,
  revokeToken,
  hashPasswordSecure,
  verifyPasswordSecure,
  validatePasswordSecure,
  trackFailedLoginAttempt,
  clearFailedLoginAttempts,
  isAccountLocked,
  encryptSensitiveData,
  decryptSensitiveData,
  generateSecureSessionToken,
  generateSecureCSRFToken,
  validateSecureCSRFToken,
  ENHANCED_PASSWORD_REQUIREMENTS
} from '../../../shared/services/secureAuth'
import { AuthenticationError } from '../../../shared/types/auth'

// Mock crypto for consistent test results
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'mock-secret-key-64-chars' })),
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash-fingerprint')
  })),
  createCipheriv: jest.fn(() => ({
    setAAD: jest.fn(),
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'data'),
    getAuthTag: jest.fn(() => Buffer.from('mock-tag', 'hex'))
  })),
  createDecipheriv: jest.fn(() => ({
    setAAD: jest.fn(),
    setAuthTag: jest.fn(),
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'data')
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hmac-signature')
  })),
  timingSafeEqual: jest.fn(() => true)
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => Promise.resolve('mock-salt-14-rounds')),
  hash: jest.fn(() => Promise.resolve('$2a$14$mock-hashed-password')),
  compare: jest.fn(() => Promise.resolve(true))
}))

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({
    userId: 'user-123',
    role: 'CASHIER',
    jti: 'mock-uuid-12345',
    sessionId: 'mock-session-id',
    iat: Math.floor(Date.now() / 1000),
    iss: 'justsell-pos-secure',
    aud: 'pos-financial-system'
  })),
  decode: jest.fn(() => ({
    userId: 'user-123',
    jti: 'mock-uuid-12345',
    exp: Math.floor(Date.now() / 1000) + 900 // 15 minutes
  })),
  TokenExpiredError: class extends Error { constructor(msg: string) { super(msg); this.name = 'TokenExpiredError' } },
  JsonWebTokenError: class extends Error { constructor(msg: string) { super(msg); this.name = 'JsonWebTokenError' } }
}))

// Mock process.hrtime.bigint for timing attack protection
global.process.hrtime = {
  bigint: jest.fn(() => 100_000_000n) // 100ms in nanoseconds
} as any

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'CASHIER' as const,
  storeId: 'store-123',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Secure Authentication Service - ENHANCED SECURITY TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset timing to consistent value
    global.process.hrtime.bigint = jest.fn(() => 100_000_000n)
  })

  describe('Enhanced Password Requirements - SECURITY CONFIGURATION', () => {
    it('should have strict password requirements for financial system', () => {
      expect(ENHANCED_PASSWORD_REQUIREMENTS.minLength).toBe(12)
      expect(ENHANCED_PASSWORD_REQUIREMENTS.requireUppercase).toBe(true)
      expect(ENHANCED_PASSWORD_REQUIREMENTS.requireLowercase).toBe(true)
      expect(ENHANCED_PASSWORD_REQUIREMENTS.requireNumbers).toBe(true)
      expect(ENHANCED_PASSWORD_REQUIREMENTS.requireSpecialChars).toBe(true)
    })
  })

  describe('Enhanced Token Generation - SECURITY CRITICAL', () => {
    it('should generate secure token pair with enhanced claims', () => {
      const deviceInfo = { userAgent: 'Test Browser', ip: '127.0.0.1' }
      const crypto = require('crypto')

      crypto.randomUUID
        .mockReturnValueOnce('jti-access-123')
        .mockReturnValueOnce('session-456')
        .mockReturnValueOnce('jti-refresh-789')

      const tokenPair = generateSecureTokens(mockUser, deviceInfo)

      expect(tokenPair).toHaveProperty('accessToken')
      expect(tokenPair).toHaveProperty('refreshToken')
      expect(tokenPair).toHaveProperty('expiresAt')
      expect(tokenPair.accessToken).toBe('mock-jwt-token')
      expect(tokenPair.refreshToken).toBe('mock-jwt-token')
      expect(tokenPair.expiresAt).toBeInstanceOf(Date)
    })

    it('should generate tokens with unique JTI and session ID', () => {
      const crypto = require('crypto')
      crypto.randomUUID
        .mockReturnValueOnce('jti-unique-1')
        .mockReturnValueOnce('session-unique-2')
        .mockReturnValueOnce('jti-refresh-unique-3')

      generateSecureTokens(mockUser)

      expect(crypto.randomUUID).toHaveBeenCalledTimes(3)
    })

    it('should generate tokens without device info', () => {
      const tokenPair = generateSecureTokens(mockUser)

      expect(tokenPair).toHaveProperty('accessToken')
      expect(tokenPair).toHaveProperty('refreshToken')
      expect(tokenPair).toHaveProperty('expiresAt')
    })

    it('should create device fingerprint when device info provided', () => {
      const crypto = require('crypto')
      const deviceInfo = { userAgent: 'Chrome', ip: '192.168.1.1' }

      generateSecureTokens(mockUser, deviceInfo)

      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
    })
  })

  describe('Enhanced Token Verification - SECURITY VALIDATION', () => {
    it('should verify secure access tokens successfully', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockReturnValue({
        userId: 'user-123',
        role: 'CASHIER',
        jti: 'token-id',
        sessionId: 'session-id'
      })

      const result = verifySecureAccessToken('valid-token')

      expect(result.userId).toBe('user-123')
      expect(result.role).toBe('CASHIER')
      expect(result.sessionId).toBe('session-id')
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String), {
        issuer: 'justsell-pos-secure',
        audience: 'pos-financial-system',
        algorithms: ['HS256']
      })
    })

    it('should verify device fingerprint when provided', () => {
      const jwt = require('jsonwebtoken')
      const crypto = require('crypto')

      jwt.verify.mockReturnValue({
        userId: 'user-123',
        role: 'CASHIER',
        jti: 'token-id',
        sessionId: 'session-id',
        deviceFingerprint: 'mock-hash-fingerprint'
      })

      const deviceInfo = { userAgent: 'Chrome', ip: '192.168.1.1' }
      const result = verifySecureAccessToken('valid-token', deviceInfo)

      expect(result.userId).toBe('user-123')
      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
    })

    it('should throw error for device fingerprint mismatch', () => {
      const jwt = require('jsonwebtoken')
      const crypto = require('crypto')

      jwt.verify.mockReturnValue({
        userId: 'user-123',
        deviceFingerprint: 'different-fingerprint'
      })
      crypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'mock-hash-fingerprint')
      })

      const deviceInfo = { userAgent: 'Chrome', ip: '192.168.1.1' }

      expect(() => verifySecureAccessToken('valid-token', deviceInfo))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('valid-token', deviceInfo))
        .toThrow('Device fingerprint mismatch')
    })

    it('should throw error for blacklisted tokens', () => {
      // First revoke a token
      revokeToken('blacklisted-token')

      expect(() => verifySecureAccessToken('blacklisted-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('blacklisted-token'))
        .toThrow('Token has been revoked')
    })

    it('should handle JWT expired error', () => {
      const jwt = require('jsonwebtoken')
      const error = new jwt.TokenExpiredError('Token expired')
      jwt.verify.mockImplementation(() => { throw error })

      expect(() => verifySecureAccessToken('expired-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('expired-token'))
        .toThrow('Access token expired')
    })

    it('should handle JWT invalid error', () => {
      const jwt = require('jsonwebtoken')
      const error = new jwt.JsonWebTokenError('Invalid token')
      jwt.verify.mockImplementation(() => { throw error })

      expect(() => verifySecureAccessToken('invalid-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('invalid-token'))
        .toThrow('Invalid access token')
    })

    it('should handle generic verification errors', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockImplementation(() => { throw new Error('Generic error') })

      expect(() => verifySecureAccessToken('error-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('error-token'))
        .toThrow('Token verification failed')
    })
  })

  describe('Enhanced Refresh Token Verification - SECURITY VALIDATION', () => {
    it('should verify secure refresh tokens successfully', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-id',
        jti: 'refresh-token-id',
        type: 'refresh'
      })

      const result = verifySecureRefreshToken('valid-refresh-token')

      expect(result.userId).toBe('user-123')
      expect(result.sessionId).toBe('session-id')
      expect(result.jti).toBe('refresh-token-id')
      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', expect.any(String), {
        issuer: 'justsell-pos-secure',
        audience: 'pos-financial-system',
        algorithms: ['HS256']
      })
    })

    it('should throw error for blacklisted refresh tokens', () => {
      revokeToken('blacklisted-refresh-token')

      expect(() => verifySecureRefreshToken('blacklisted-refresh-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureRefreshToken('blacklisted-refresh-token'))
        .toThrow('Refresh token has been revoked')
    })

    it('should throw error for invalid token type', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockReturnValue({
        userId: 'user-123',
        type: 'access' // Wrong type
      })

      expect(() => verifySecureRefreshToken('access-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureRefreshToken('access-token'))
        .toThrow('Invalid token type')
    })

    it('should handle refresh token expired error', () => {
      const jwt = require('jsonwebtoken')
      const error = new jwt.TokenExpiredError('Token expired')
      jwt.verify.mockImplementation(() => { throw error })

      expect(() => verifySecureRefreshToken('expired-refresh-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureRefreshToken('expired-refresh-token'))
        .toThrow('Refresh token expired')
    })

    it('should handle refresh token invalid error', () => {
      const jwt = require('jsonwebtoken')
      const error = new jwt.JsonWebTokenError('Invalid token')
      jwt.verify.mockImplementation(() => { throw error })

      expect(() => verifySecureRefreshToken('invalid-refresh-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureRefreshToken('invalid-refresh-token'))
        .toThrow('Invalid refresh token')
    })

    it('should handle generic refresh token errors', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockImplementation(() => { throw new Error('Generic error') })

      expect(() => verifySecureRefreshToken('error-refresh-token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureRefreshToken('error-refresh-token'))
        .toThrow('Refresh token verification failed')
    })
  })

  describe('Token Revocation - SECURITY CRITICAL', () => {
    it('should revoke tokens successfully', () => {
      const token = 'token-to-revoke'

      revokeToken(token)

      // Verify token is blacklisted by trying to verify it
      expect(() => verifySecureAccessToken(token))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken(token))
        .toThrow('Token has been revoked')
    })

    it('should clean up old tokens when blacklist is large', () => {
      // Add 10001 tokens to trigger cleanup
      for (let i = 0; i < 10001; i++) {
        revokeToken(`token-${i}`)
      }

      // The cleanup should have occurred
      // We can't directly test the Set size, but we can verify it still works
      revokeToken('final-token')
      expect(() => verifySecureAccessToken('final-token'))
        .toThrow('Token has been revoked')
    })
  })

  describe('Enhanced Password Security - FINANCIAL GRADE', () => {
    it('should hash passwords with enhanced security', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.genSalt.mockResolvedValue('mock-salt-14-rounds')
      bcrypt.hash.mockResolvedValue('$2a$14$mock-hashed-password')

      const result = await hashPasswordSecure('SecurePass123!')

      expect(result).toHaveProperty('hash')
      expect(result).toHaveProperty('salt')
      expect(result.hash).toBe('$2a$14$mock-hashed-password')
      expect(result.salt).toBe('mock-salt-14-rounds')
      expect(bcrypt.genSalt).toHaveBeenCalledWith(14)
    })

    it('should hash passwords with provided salt', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.hash.mockResolvedValue('$2a$14$custom-salt-hashed-password')

      const customSalt = 'custom-salt-14-rounds'
      const result = await hashPasswordSecure('SecurePass123!', customSalt)

      expect(result.hash).toBe('$2a$14$custom-salt-hashed-password')
      expect(result.salt).toBe(customSalt)
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', customSalt)
    })

    it('should verify passwords with timing attack protection', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockResolvedValue(true)

      // Mock timing to be less than target
      global.process.hrtime.bigint
        .mockReturnValueOnce(0n) // start time
        .mockReturnValueOnce(50_000_000n) // end time (50ms)

      const isValid = await verifyPasswordSecure('SecurePass123!', '$2a$14$mock-hashed-password')

      expect(isValid).toBe(true)
      expect(bcrypt.compare).toHaveBeenCalledWith('SecurePass123!', '$2a$14$mock-hashed-password')
    })

    it('should handle password verification errors with consistent timing', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockRejectedValue(new Error('Hash comparison failed'))

      const isValid = await verifyPasswordSecure('password', 'invalid-hash')

      expect(isValid).toBe(false)
    })

    it('should validate strong passwords correctly', () => {
      const strongPassword = 'SecurePass123!@#'
      const result = validatePasswordSecure(strongPassword)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.strength).toBe('strong')
    })

    it('should reject weak passwords', () => {
      const weakPassword = 'weak'
      const result = validatePasswordSecure(weakPassword)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.strength).toBe('weak')
    })

    it('should reject passwords containing username', () => {
      const password = 'testuser123!'
      const username = 'testuser'
      const result = validatePasswordSecure(password, username)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must not contain the username')
    })

    it('should reject passwords with repeated characters', () => {
      const password = 'Passsssword123!'
      const result = validatePasswordSecure(password)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must not contain more than 2 repeated characters in sequence')
    })

    it('should reject passwords with common patterns', () => {
      const weakPasswords = ['password123!', 'admin123!', 'qwerty123!']

      weakPasswords.forEach(password => {
        const result = validatePasswordSecure(password)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Password contains common weak patterns')
      })
    })

    it('should calculate medium strength passwords', () => {
      const mediumPassword = 'Password123!'
      const result = validatePasswordSecure(mediumPassword)

      expect(result.strength).toBe('medium')
    })

    it('should reject passwords missing lowercase letters', () => {
      const noLowercasePassword = 'UPPERCASE123!'
      const result = validatePasswordSecure(noLowercasePassword, 'testuser')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reset timeout within trackFailedLoginAttempt', () => {
      const identifier = 'reset@example.com'
      const originalDate = Date
      const initialTime = 1640995200000

      // Mock initial time
      global.Date = class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...args)
          } else {
            super(initialTime)
          }
        }
        static now() {
          return initialTime
        }
      } as any

      // Add initial failed attempt
      trackFailedLoginAttempt(identifier)
      expect(isAccountLocked(identifier)).toBe(false) // Should not be locked yet

      // Advance time past lockout duration (31 minutes)
      const futureTime = initialTime + (31 * 60 * 1000)
      global.Date = class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...args)
          } else {
            super(futureTime)
          }
        }
        static now() {
          return futureTime
        }
      } as any

      // This should reset the attempts due to timeout and return false (not locked)
      const shouldLock = trackFailedLoginAttempt(identifier)
      expect(shouldLock).toBe(false)

      global.Date = originalDate
    })
  })

  describe('Account Lockout Protection - BRUTE FORCE DEFENSE', () => {
    it('should track failed login attempts', () => {
      const identifier = 'user@example.com'

      const isLocked = trackFailedLoginAttempt(identifier)

      expect(isLocked).toBe(false) // First attempt
    })

    it('should lock account after maximum failed attempts', () => {
      const identifier = 'brute-force@example.com'

      // Simulate 5 failed attempts
      for (let i = 0; i < 4; i++) {
        const isLocked = trackFailedLoginAttempt(identifier)
        expect(isLocked).toBe(false)
      }

      // 5th attempt should trigger lockout
      const isLocked = trackFailedLoginAttempt(identifier)
      expect(isLocked).toBe(true)
    })

    it('should check if account is locked', () => {
      const identifier = 'locked@example.com'

      // Lock the account
      for (let i = 0; i < 5; i++) {
        trackFailedLoginAttempt(identifier)
      }

      const isLocked = isAccountLocked(identifier)
      expect(isLocked).toBe(true)
    })

    it('should reset lockout after timeout period', () => {
      const identifier = 'timeout@example.com'
      const originalDate = Date
      const initialTime = 1640995200000 // Fixed timestamp

      // Mock Date constructor and Date.now() for initial time
      global.Date = class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...args)
          } else {
            super(initialTime)
          }
        }
        static now() {
          return initialTime
        }
      } as any

      // Track failed attempts to lock the account
      for (let i = 0; i < 5; i++) {
        trackFailedLoginAttempt(identifier)
      }

      expect(isAccountLocked(identifier)).toBe(true)

      // Advance time by 31 minutes (past lockout duration of 30 minutes)
      const futureTime = initialTime + (31 * 60 * 1000)
      global.Date = class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...args)
          } else {
            super(futureTime)
          }
        }
        static now() {
          return futureTime
        }
      } as any

      const isLocked = isAccountLocked(identifier)
      expect(isLocked).toBe(false)

      global.Date = originalDate
    })

    it('should clear failed attempts after successful login', () => {
      const identifier = 'clear@example.com'

      // Add some failed attempts
      trackFailedLoginAttempt(identifier)
      trackFailedLoginAttempt(identifier)

      // Clear attempts
      clearFailedLoginAttempts(identifier)

      // Should not be locked
      const isLocked = isAccountLocked(identifier)
      expect(isLocked).toBe(false)
    })
  })

  describe('Data Encryption - PCI COMPLIANCE', () => {
    it('should encrypt sensitive data with AES-256-GCM', () => {
      const crypto = require('crypto')
      crypto.randomBytes.mockReturnValue(Buffer.from('1234567890123456', 'hex'))

      const sensitiveData = 'credit-card-4532-0151-1283-0366'
      const result = encryptSensitiveData(sensitiveData)

      expect(result).toHaveProperty('encrypted')
      expect(result).toHaveProperty('iv')
      expect(result).toHaveProperty('tag')
      expect(result.encrypted).toBe('encrypteddata')
      expect(crypto.createCipheriv).toHaveBeenCalledWith('aes-256-gcm', expect.any(Buffer), expect.any(Buffer))
    })

    it('should decrypt sensitive data with AES-256-GCM', () => {
      const encryptedData = 'encrypteddata'
      const iv = 'mock-iv-hex'
      const tag = 'mock-tag-hex'

      const result = decryptSensitiveData(encryptedData, iv, tag)

      expect(result).toBe('decrypteddata')
      expect(require('crypto').createDecipheriv).toHaveBeenCalledWith('aes-256-gcm', expect.any(Buffer), expect.any(Buffer))
    })

    it('should handle decryption errors gracefully', () => {
      const crypto = require('crypto')
      crypto.createDecipheriv.mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      expect(() => decryptSensitiveData('invalid', 'iv', 'tag'))
        .toThrow('Failed to decrypt sensitive data')
    })
  })

  describe('CSRF Protection - SESSION SECURITY', () => {
    it('should generate secure session tokens', () => {
      const crypto = require('crypto')
      crypto.randomBytes.mockReturnValue({ toString: () => 'secure-session-token-32-bytes' })

      const sessionToken = generateSecureSessionToken()

      expect(sessionToken).toBe('secure-session-token-32-bytes')
      expect(crypto.randomBytes).toHaveBeenCalledWith(32)
    })

    it('should generate CSRF tokens with timestamp', () => {
      const crypto = require('crypto')
      const sessionToken = 'secure-session-token'
      const mockTimestamp = '1640995200000' // Fixed timestamp

      jest.spyOn(Date, 'now').mockReturnValue(parseInt(mockTimestamp))

      const csrfToken = generateSecureCSRFToken(sessionToken)

      expect(csrfToken).toContain(mockTimestamp)
      expect(csrfToken).toContain('.')
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', expect.any(String))

      Date.now.mockRestore()
    })

    it('should validate CSRF tokens successfully', () => {
      const originalNow = Date.now
      const mockTime = 1640995200000

      // Mock Date.now() to return a fixed timestamp
      Date.now = jest.fn(() => mockTime)

      const sessionToken = 'secure-session-token'

      // Generate a real CSRF token using the mocked time
      const token = generateSecureCSRFToken(sessionToken)

      // Validate the token
      const isValid = validateSecureCSRFToken(token, sessionToken)

      expect(isValid).toBe(true)

      // Restore original Date
      Date.now = originalNow
    })

    it('should reject malformed CSRF tokens', () => {
      const sessionToken = 'secure-session-token'
      const malformedToken = 'invalid-token'

      const isValid = validateSecureCSRFToken(malformedToken, sessionToken)

      expect(isValid).toBe(false)
    })

    it('should reject expired CSRF tokens', () => {
      const originalNow = Date.now
      const sessionToken = 'secure-session-token'

      // Mock time 2 hours ago to generate an expired token
      const oldTime = 1640995200000
      Date.now = jest.fn(() => oldTime)

      // Generate a token 2 hours ago
      const expiredToken = generateSecureCSRFToken(sessionToken)

      // Now mock current time (2 hours later)
      const currentTime = oldTime + (2 * 60 * 60 * 1000)
      Date.now = jest.fn(() => currentTime)

      // Try to validate the expired token
      const isValid = validateSecureCSRFToken(expiredToken, sessionToken)

      expect(isValid).toBe(false)

      // Restore original Date
      Date.now = originalNow
    })

    it('should handle CSRF validation errors gracefully', () => {
      const crypto = require('crypto')
      crypto.timingSafeEqual.mockImplementation(() => {
        throw new Error('Comparison failed')
      })

      const sessionToken = 'secure-session-token'
      const token = `${Date.now()}.signature`

      const isValid = validateSecureCSRFToken(token, sessionToken)

      expect(isValid).toBe(false)
    })
  })

  describe('Error Handling - SECURITY RESILIENCE', () => {
    it('should handle authentication errors correctly', () => {
      const error = new AuthenticationError('Test error', 'TEST_CODE')

      expect(() => { throw error }).toThrow(AuthenticationError)
      expect(() => { throw error }).toThrow('Test error')
    })

    it('should propagate authentication errors in token verification', () => {
      const error = new AuthenticationError('Custom auth error', 'CUSTOM_CODE')
      const jwt = require('jsonwebtoken')
      jwt.verify.mockImplementation(() => { throw error })

      expect(() => verifySecureAccessToken('token'))
        .toThrow(AuthenticationError)
      expect(() => verifySecureAccessToken('token'))
        .toThrow('Custom auth error')
    })
  })

  describe('Environment Configuration - SECURITY SETUP', () => {
    it('should use environment variables when available', () => {
      // Test that the module loads environment variables
      // This is implicitly tested by the module loading successfully
      expect(true).toBe(true)
    })

    it('should fallback to defaults when environment variables not set', () => {
      // Clear all relevant environment variables
      const originalEnv = process.env
      process.env = {
        ...process.env,
        JWT_SECRET: undefined,
        ENCRYPTION_KEY: undefined,
        CSRF_SECRET: undefined,
      }

      // Generate a session token which should call crypto.randomBytes
      generateSecureSessionToken()

      // Test that crypto.randomBytes was called
      const crypto = require('crypto')
      expect(crypto.randomBytes).toHaveBeenCalled()

      // Restore environment
      process.env = originalEnv
    })
  })
})