import type { Request, Response } from 'express'
import {
  generateTokens,
  verifyPassword,
  verifyRefreshToken,
  toAuthenticatedUser,
  hashPassword,
  validatePassword,
} from '../../shared/services/auth'
import type { LoginRequest, RefreshTokenRequest, LoginResponse } from '../../shared/types/auth'
import { AuthenticationError } from '../../shared/types/auth'
import { prisma } from '../../shared/utils/database'

// Track failed login attempts (in production, use Redis or database)
const failedAttempts = new Map<string, { count: number; lockedUntil?: Date }>()

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Login endpoint
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password }: LoginRequest = req.body

    if (!username || !password) {
      res.status(400).json({
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS',
      })
      return
    }

    // Check for rate limiting
    const attempts = failedAttempts.get(username)
    if (attempts?.lockedUntil && attempts.lockedUntil > new Date()) {
      res.status(429).json({
        error: 'Account temporarily locked due to too many failed attempts',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: attempts.lockedUntil,
      })
      return
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { store: true },
    })

    if (!user) {
      // Record failed attempt
      recordFailedAttempt(username)
      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      })
      return
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      })
      return
    }

    // Check if account is locked (database level)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(401).json({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil,
      })
      return
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      // Record failed attempt and increment database counter
      recordFailedAttempt(username)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          lockedUntil:
            user.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_DURATION)
              : null,
        },
      })

      res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      })
      return
    }

    // Successful login - reset failed attempts
    failedAttempts.delete(username)

    // Update user login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // Generate tokens
    const tokens = generateTokens(user)
    const authenticatedUser = toAuthenticatedUser(user)

    const response: LoginResponse = {
      user: authenticatedUser,
      tokens,
    }

    res.json(response)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    })
  }
}

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token }: RefreshTokenRequest = req.body

    if (!token) {
      res.status(400).json({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      })
      return
    }

    // Verify refresh token
    const payload = verifyRefreshToken(token)

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      })
      return
    }

    // Generate new tokens
    const tokens = generateTokens(user)
    const authenticatedUser = toAuthenticatedUser(user)

    const response: LoginResponse = {
      user: authenticatedUser,
      tokens,
    }

    res.json(response)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: error.message,
        code: error.code,
      })
      return
    }

    console.error('Refresh token error:', error)
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    })
  }
}

/**
 * Get current user info
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    // Fetch fresh user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { store: true },
    })

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
      return
    }

    const authenticatedUser = toAuthenticatedUser(user)
    res.json({ user: authenticatedUser })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({
      error: 'Failed to fetch user info',
      code: 'USER_FETCH_ERROR',
    })
  }
}

/**
 * Logout endpoint (client-side token invalidation)
 * POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  // In a full implementation, you might want to maintain a blacklist of tokens
  // For now, we rely on client-side token removal
  res.json({ message: 'Logged out successfully' })
}

/**
 * Change password endpoint
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
      return
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      })
      return
    }

    // Validate new password
    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        code: 'INVALID_PASSWORD',
        details: validation.errors,
      })
      return
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    })

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      })
      return
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      })
      return
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR',
    })
  }
}

/**
 * Helper function to record failed login attempts
 */
function recordFailedAttempt(username: string): void {
  const current = failedAttempts.get(username) || { count: 0 }
  current.count++

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION)
  }

  failedAttempts.set(username, current)
}
