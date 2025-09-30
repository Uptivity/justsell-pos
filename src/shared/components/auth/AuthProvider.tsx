import React, { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Auth provider component that handles token refresh and authentication state
 * Should wrap the entire app
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { tokens, refreshTokens, logout, isAuthenticated } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize auth state on app start
    const initAuth = async () => {
      if (isAuthenticated && tokens) {
        // Check if access token is expired or expiring soon
        const expiresAt = new Date(tokens.expiresAt)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        const fiveMinutes = 5 * 60 * 1000

        // If token expires in less than 5 minutes, try to refresh
        if (timeUntilExpiry < fiveMinutes) {
          try {
            await refreshTokens()
          } catch (error) {
            console.warn('Failed to refresh tokens on init:', error)
            logout()
          }
        }
      }
      setIsInitialized(true)
    }

    void initAuth()
  }, [isAuthenticated, tokens, refreshTokens, logout]) // Only run on mount

  useEffect(() => {
    // Set up automatic token refresh
    if (!isAuthenticated || !tokens) return

    const expiresAt = new Date(tokens.expiresAt)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000) // Refresh 5 min before expiry, but at least in 1 min

    const refreshTimer = setTimeout(() => {
      void (async () => {
        try {
          await refreshTokens()
        } catch (error) {
          console.warn('Automatic token refresh failed:', error)
          logout()
        }
      })()
    }, refreshTime)

    return () => clearTimeout(refreshTimer)
  }, [tokens, isAuthenticated, refreshTokens, logout])

  // Show loading spinner while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
