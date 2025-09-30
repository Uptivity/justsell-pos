import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AuthenticatedUser,
  TokenPair,
  LoginRequest,
  LoginResponse,
  Permission,
} from '../types/auth'
import { hasPermission, hasAllPermissions, hasAnyPermission } from '../services/auth'

interface AuthState {
  // State
  user: AuthenticatedUser | null
  tokens: TokenPair | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (credentials: LoginRequest) => Promise<LoginResponse>
  logout: () => void
  refreshTokens: () => Promise<void>
  updateUser: (user: AuthenticatedUser) => void

  // Permission helpers
  hasPermission: (permission: Permission) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasRole: (role: string) => boolean
}

// API base URL - would normally come from environment
const API_BASE_URL = '/api'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        set({ isLoading: true })

        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Login failed')
          }

          const data: LoginResponse = await response.json()

          set({
            user: data.user,
            tokens: data.tokens,
            isAuthenticated: true,
            isLoading: false,
          })

          return data
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // Logout action
      logout: () => {
        // Call logout endpoint (fire and forget)
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${get().tokens?.accessToken}`,
          },
        }).catch(() => {
          // Ignore errors - we're logging out anyway
        })

        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        })
      },

      // Refresh tokens action
      refreshTokens: async (): Promise<void> => {
        const { tokens } = get()

        if (!tokens?.refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          })

          if (!response.ok) {
            const error = await response.json()
            // If refresh fails, logout user
            get().logout()
            throw new Error(error.error || 'Token refresh failed')
          }

          const data: LoginResponse = await response.json()

          set({
            user: data.user,
            tokens: data.tokens,
            isAuthenticated: true,
          })
        } catch (error) {
          get().logout()
          throw error
        }
      },

      // Update user action
      updateUser: (user: AuthenticatedUser) => {
        set({ user, isAuthenticated: true })
      },

      // Permission helpers
      hasPermission: (permission: Permission): boolean => {
        const { user } = get()
        return user ? hasPermission(user.role, permission) : false
      },

      hasAllPermissions: (permissions: Permission[]): boolean => {
        const { user } = get()
        return user ? hasAllPermissions(user.role, permissions) : false
      },

      hasAnyPermission: (permissions: Permission[]): boolean => {
        const { user } = get()
        return user ? hasAnyPermission(user.role, permissions) : false
      },

      hasRole: (role: string): boolean => {
        const { user } = get()
        return user ? user.role === role : false
      },
    }),
    {
      name: 'auth-store',
      // Only persist essential data
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// Hook for using auth store
export function useAuth() {
  return useAuthStore()
}

// Separate hook for just checking authentication status
export function useAuthStatus() {
  return useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
  }))
}

// Hook for permission checking
export function usePermissions() {
  return useAuthStore((state) => ({
    hasPermission: state.hasPermission,
    hasAllPermissions: state.hasAllPermissions,
    hasAnyPermission: state.hasAnyPermission,
    hasRole: state.hasRole,
  }))
}
