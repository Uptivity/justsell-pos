import type { Request, Response, NextFunction } from 'express'
import {
  verifyAccessToken,
  hasPermission,
  validateStoreAccess,
  createAuthorizationError,
} from '../../shared/services/auth'
import type { Permission, AuthenticatedUser } from '../../shared/types/auth'
import { AuthenticationError, AuthorizationError } from '../../shared/types/auth'
import { prisma } from '../../shared/utils/database'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 * Adds user information to req.user if token is valid
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token)

    // Fetch fresh user data to ensure user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
      return
    }

    if (!user.isActive) {
      res.status(401).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      })
      return
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(401).json({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
      })
      return
    }

    // Add user to request
    req.user = {
      id: user.id,
      username: user.username,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role,
      storeId: user.storeId || undefined,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || undefined,
    }

    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      })
      return
    }

    console.error('Authentication middleware error:', error)
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    })
  }
}

/**
 * Middleware factory to require specific permissions
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    if (!hasPermission(req.user.role, permission)) {
      const error = createAuthorizationError('Insufficient permissions', permission)
      res.status(403).json({
        error: error.message,
        code: error.code,
      })
      return
    }

    next()
  }
}

/**
 * Middleware factory to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    const hasAnyPermission = permissions.some((permission) =>
      hasPermission(req.user!.role, permission),
    )

    if (!hasAnyPermission) {
      res.status(403).json({
        error: `Access denied. Required permissions: ${permissions.join(' or ')}`,
        code: 'ACCESS_DENIED',
      })
      return
    }

    next()
  }
}

/**
 * Middleware factory to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(' or ')}`,
        code: 'ROLE_REQUIRED',
      })
      return
    }

    next()
  }
}

/**
 * Middleware to validate store access
 * Can be used with a static store ID or extract from request params
 */
export function requireStoreAccess(storeIdParam?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    // Get store ID from parameter or request params
    const requiredStoreId = storeIdParam || req.params.storeId

    if (requiredStoreId && !validateStoreAccess(req.user, requiredStoreId)) {
      res.status(403).json({
        error: 'Access denied to this store',
        code: 'STORE_ACCESS_DENIED',
      })
      return
    }

    next()
  }
}

/**
 * Error handler for authentication/authorization errors
 */
export function authErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof AuthenticationError) {
    res.status(401).json({
      error: error.message,
      code: error.code || 'AUTH_ERROR',
    })
    return
  }

  if (error instanceof AuthorizationError) {
    res.status(403).json({
      error: error.message,
      code: error.code || 'ACCESS_DENIED',
    })
    return
  }

  next(error)
}
