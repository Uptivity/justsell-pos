import type { Request, Response, NextFunction } from 'express'
import {
  authenticate,
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireStoreAccess,
  authErrorHandler
} from '../../../api/middleware/auth'
import {
  verifyAccessToken,
  hasPermission,
  validateStoreAccess,
  createAuthorizationError,
} from '../../../shared/services/auth'
import { AuthenticationError, AuthorizationError } from '../../../shared/types/auth'
import { prisma } from '../../../shared/utils/database'

// Mock all dependencies
jest.mock('../../../shared/services/auth')
jest.mock('../../../shared/utils/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    }
  }
}))

const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>
const mockHasPermission = hasPermission as jest.MockedFunction<typeof hasPermission>
const mockValidateStoreAccess = validateStoreAccess as jest.MockedFunction<typeof validateStoreAccess>
const mockCreateAuthorizationError = createAuthorizationError as jest.MockedFunction<typeof createAuthorizationError>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let mockJson: jest.Mock
  let mockStatus: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn(() => ({ json: mockJson }))
    mockNext = jest.fn()
    mockReq = {
      headers: {},
      params: {},
    }
    mockRes = {
      json: mockJson,
      status: mockStatus,
    }
    jest.clearAllMocks()
  })

  describe('authenticate middleware', () => {
    const mockTokenPayload = { userId: 'user-1' }
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CASHIER',
      storeId: 'store-1',
      isActive: true,
      lastLoginAt: new Date('2024-01-01'),
      lockedUntil: null,
    }

    it('should authenticate valid token and add user to request', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockReturnValue(mockTokenPayload as any)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-token')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          storeId: true,
          isActive: true,
          lastLoginAt: true,
          lockedUntil: true,
        },
      })
      expect(mockReq.user).toEqual({
        id: 'user-1',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CASHIER',
        storeId: 'store-1',
        isActive: true,
        lastLoginAt: new Date('2024-01-01'),
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when authorization header is missing', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic invalid-token' }

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when user is not found', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockReturnValue(mockTokenPayload as any)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when user is not active', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockReturnValue(mockTokenPayload as any)
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when account is locked', async () => {
      const futureDate = new Date(Date.now() + 10000)
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockReturnValue(mockTokenPayload as any)
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: futureDate
      } as any)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle AuthenticationError', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }
      mockVerifyAccessToken.mockImplementation(() => {
        throw new AuthenticationError('Invalid token', 'INVALID_TOKEN')
      })

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle general errors', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle user with null optional fields', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' }
      mockVerifyAccessToken.mockReturnValue(mockTokenPayload as any)
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        firstName: null,
        lastName: null,
        storeId: null,
        lastLoginAt: null,
      } as any)

      await authenticate(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual({
        id: 'user-1',
        username: 'testuser',
        firstName: undefined,
        lastName: undefined,
        role: 'CASHIER',
        storeId: undefined,
        isActive: true,
        lastLoginAt: undefined,
      })
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requirePermission middleware', () => {
    const middleware = requirePermission('CREATE_PRODUCTS')

    beforeEach(() => {
      mockReq.user = {
        id: 'user-1',
        role: 'CASHIER'
      } as any
    })

    it('should allow access when user has required permission', () => {
      mockHasPermission.mockReturnValue(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockHasPermission).toHaveBeenCalledWith('CASHIER', 'CREATE_PRODUCTS')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks required permission', () => {
      mockHasPermission.mockReturnValue(false)
      mockCreateAuthorizationError.mockReturnValue(new AuthorizationError('Insufficient permissions', 'PERMISSION_DENIED'))

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockHasPermission).toHaveBeenCalledWith('CASHIER', 'CREATE_PRODUCTS')
      expect(mockCreateAuthorizationError).toHaveBeenCalledWith('Insufficient permissions', 'CREATE_PRODUCTS')
      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireAnyPermission middleware', () => {
    const middleware = requireAnyPermission(['CREATE_PRODUCTS', 'UPDATE_PRODUCTS'])

    beforeEach(() => {
      mockReq.user = {
        id: 'user-1',
        role: 'CASHIER'
      } as any
    })

    it('should allow access when user has any required permission', () => {
      mockHasPermission.mockReturnValueOnce(false).mockReturnValueOnce(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockHasPermission).toHaveBeenCalledTimes(2)
      expect(mockHasPermission).toHaveBeenNthCalledWith(1, 'CASHIER', 'CREATE_PRODUCTS')
      expect(mockHasPermission).toHaveBeenNthCalledWith(2, 'CASHIER', 'UPDATE_PRODUCTS')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow access when user has first permission', () => {
      mockHasPermission.mockReturnValueOnce(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockHasPermission).toHaveBeenCalledTimes(1)
      expect(mockHasPermission).toHaveBeenCalledWith('CASHIER', 'CREATE_PRODUCTS')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks all required permissions', () => {
      mockHasPermission.mockReturnValue(false)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied. Required permissions: CREATE_PRODUCTS or UPDATE_PRODUCTS',
        code: 'ACCESS_DENIED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireRole middleware', () => {
    const middleware = requireRole('ADMIN', 'MANAGER')

    beforeEach(() => {
      mockReq.user = {
        id: 'user-1',
        role: 'MANAGER'
      } as any
    })

    it('should allow access when user has required role', () => {
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow access when user has any of the required roles', () => {
      mockReq.user!.role = 'ADMIN'

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks required role', () => {
      mockReq.user!.role = 'CASHIER'

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied. Required roles: ADMIN or MANAGER',
        code: 'ROLE_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle single role requirement', () => {
      const singleRoleMiddleware = requireRole('ADMIN')
      mockReq.user!.role = 'CASHIER'

      singleRoleMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied. Required roles: ADMIN',
        code: 'ROLE_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('requireStoreAccess middleware', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-1',
        storeId: 'store-1'
      } as any
    })

    it('should allow access when user has access to store from params', () => {
      const middleware = requireStoreAccess()
      mockReq.params = { storeId: 'store-1' }
      mockValidateStoreAccess.mockReturnValue(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockValidateStoreAccess).toHaveBeenCalledWith(mockReq.user, 'store-1')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow access when user has access to specified store', () => {
      const middleware = requireStoreAccess('store-1')
      mockValidateStoreAccess.mockReturnValue(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockValidateStoreAccess).toHaveBeenCalledWith(mockReq.user, 'store-1')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      const middleware = requireStoreAccess('store-1')
      mockReq.user = undefined

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks store access', () => {
      const middleware = requireStoreAccess('store-2')
      mockValidateStoreAccess.mockReturnValue(false)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockValidateStoreAccess).toHaveBeenCalledWith(mockReq.user, 'store-2')
      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied to this store',
        code: 'STORE_ACCESS_DENIED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow access when no store ID is specified', () => {
      const middleware = requireStoreAccess()
      mockReq.params = {}

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockValidateStoreAccess).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should prefer explicit store ID over params', () => {
      const middleware = requireStoreAccess('explicit-store')
      mockReq.params = { storeId: 'params-store' }
      mockValidateStoreAccess.mockReturnValue(true)

      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockValidateStoreAccess).toHaveBeenCalledWith(mockReq.user, 'explicit-store')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('authErrorHandler middleware', () => {
    const error = new Error('General error')

    it('should handle AuthenticationError', () => {
      const authError = new AuthenticationError('Invalid token', 'INVALID_TOKEN')

      authErrorHandler(authError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle AuthenticationError with default code', () => {
      const authError = new AuthenticationError('Token expired')

      authErrorHandler(authError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(401)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'AUTH_ERROR',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle AuthorizationError', () => {
      const authzError = new AuthorizationError('Insufficient permissions', 'PERMISSION_DENIED')

      authErrorHandler(authzError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle AuthorizationError with default code', () => {
      const authzError = new AuthorizationError('Access denied')

      authErrorHandler(authzError, mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).toHaveBeenCalledWith(403)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should pass through non-auth errors to next middleware', () => {
      authErrorHandler(error, mockReq as Request, mockRes as Response, mockNext)

      expect(mockStatus).not.toHaveBeenCalled()
      expect(mockJson).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })
})