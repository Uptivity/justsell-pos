import type { Request, Response } from 'express'
import { login, refreshToken, getCurrentUser, logout, changePassword } from '../../../api/controllers/auth'
import {
  generateTokens,
  verifyPassword,
  verifyRefreshToken,
  toAuthenticatedUser,
  hashPassword,
  validatePassword,
} from '../../../shared/services/auth'
import { AuthenticationError } from '../../../shared/types/auth'
import { prisma } from '../../../shared/utils/database'

// Mock all dependencies
jest.mock('../../../shared/services/auth')
jest.mock('../../../shared/utils/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}))

const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>
const mockVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>
const mockToAuthenticatedUser = toAuthenticatedUser as jest.MockedFunction<typeof toAuthenticatedUser>
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>
const mockValidatePassword = validatePassword as jest.MockedFunction<typeof validatePassword>

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Auth Controller', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn(() => ({ json: mockJson }))
    mockReq = {}
    mockRes = {
      json: mockJson,
      status: mockStatus,
    }
    jest.clearAllMocks()
  })

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      store: null
    }

    const mockTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    }

    const mockAuthenticatedUser = {
      id: 'user-1',
      username: 'testuser',
      role: 'CASHIER'
    }

    beforeEach(() => {
      mockReq.body = { username: 'testuser', password: 'password123' }
      mockGenerateTokens.mockReturnValue(mockTokens)
      mockToAuthenticatedUser.mockReturnValue(mockAuthenticatedUser as any)
    })

    it('should successfully log in with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: { store: true },
      })
      expect(mockVerifyPassword).toHaveBeenCalledWith('password123', 'hashedpassword')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          lastLoginAt: expect.any(Date),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockAuthenticatedUser,
        tokens: mockTokens,
      })
    })

    it('should return 400 when username is missing', async () => {
      mockReq.body = { password: 'password123' }

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      })
    })

    it('should return 400 when password is missing', async () => {
      mockReq.body = { username: 'testuser' }

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      })
    })

    it('should return 401 when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('should return 401 when user is not active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      })
    })

    it('should return 401 when account is locked', async () => {
      const futureDate = new Date(Date.now() + 10000)
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: futureDate
      } as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: futureDate,
      })
    })

    it('should return 401 with invalid password and update failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(false)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          failedLoginAttempts: 1,
          lockedUntil: null,
        },
      })
    })

    it('should lock account after max failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4
      } as any)
      mockVerifyPassword.mockResolvedValue(false)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      await login(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Login failed',
        code: 'LOGIN_ERROR',
      })
    })

    it('should convert username to lowercase', async () => {
      mockReq.body = { username: 'TESTUSER', password: 'password123' }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      await login(mockReq as Request, mockRes as Response)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: { store: true },
      })
    })
  })

  describe('refreshToken', () => {
    const mockTokenPayload = { userId: 'user-1' }
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      isActive: true
    }
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token'
    }
    const mockAuthenticatedUser = {
      id: 'user-1',
      username: 'testuser'
    }

    beforeEach(() => {
      mockReq.body = { refreshToken: 'valid-refresh-token' }
      mockVerifyRefreshToken.mockReturnValue(mockTokenPayload as any)
      mockGenerateTokens.mockReturnValue(mockTokens)
      mockToAuthenticatedUser.mockReturnValue(mockAuthenticatedUser as any)
    })

    it('should successfully refresh tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockVerifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockAuthenticatedUser,
        tokens: mockTokens,
      })
    })

    it('should return 400 when refresh token is missing', async () => {
      mockReq.body = {}

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      })
    })

    it('should return 401 when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      })
    })

    it('should return 401 when user is not active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any)

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      })
    })

    it('should handle AuthenticationError', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED')
      })

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      })
    })

    it('should handle general errors', async () => {
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await refreshToken(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR',
      })
    })
  })

  describe('getCurrentUser', () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      store: null
    }
    const mockAuthenticatedUser = {
      id: 'user-1',
      username: 'testuser'
    }

    beforeEach(() => {
      mockReq.user = { id: 'user-1' } as any
      mockToAuthenticatedUser.mockReturnValue(mockAuthenticatedUser as any)
    })

    it('should return current user info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      await getCurrentUser(mockReq as Request, mockRes as Response)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { store: true },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockAuthenticatedUser
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined

      await getCurrentUser(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    })

    it('should return 404 when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await getCurrentUser(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      await getCurrentUser(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch user info',
        code: 'USER_FETCH_ERROR',
      })
    })
  })

  describe('logout', () => {
    it('should return success message', () => {
      logout(mockReq as Request, mockRes as Response)

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Logged out successfully'
      })
    })
  })

  describe('changePassword', () => {
    const mockUser = {
      id: 'user-1',
      passwordHash: 'current-hash'
    }

    beforeEach(() => {
      mockReq.user = { id: 'user-1' } as any
      mockReq.body = {
        currentPassword: 'currentpass',
        newPassword: 'newpass123'
      }
    })

    it('should successfully change password', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(true)
      mockHashPassword.mockResolvedValue('new-hash')
      mockPrisma.user.update.mockResolvedValue(mockUser as any)

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockValidatePassword).toHaveBeenCalledWith('newpass123')
      expect(mockVerifyPassword).toHaveBeenCalledWith('currentpass', 'current-hash')
      expect(mockHashPassword).toHaveBeenCalledWith('newpass123')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordHash: 'new-hash',
          passwordChangedAt: expect.any(Date),
        },
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Password changed successfully'
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    })

    it('should return 400 when current password is missing', async () => {
      mockReq.body = { newPassword: 'newpass123' }

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      })
    })

    it('should return 400 when new password is missing', async () => {
      mockReq.body = { currentPassword: 'currentpass' }

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      })
    })

    it('should return 400 when new password is invalid', async () => {
      mockValidatePassword.mockReturnValue({
        isValid: false,
        errors: ['Too short', 'Missing special characters']
      })

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Password does not meet requirements',
        code: 'INVALID_PASSWORD',
        details: ['Too short', 'Missing special characters'],
      })
    })

    it('should return 404 when user is not found', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
    })

    it('should return 401 when current password is incorrect', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockVerifyPassword.mockResolvedValue(false)

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      })
    })

    it('should handle database errors', async () => {
      mockValidatePassword.mockReturnValue({ isValid: true, errors: [] })
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      await changePassword(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_ERROR',
      })
    })
  })
})