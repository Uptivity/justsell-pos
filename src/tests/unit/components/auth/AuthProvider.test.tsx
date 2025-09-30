/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider } from '../../../../shared/components/auth/AuthProvider'
import { useAuth } from '../../../../shared/hooks/useAuth'

// Mock the useAuth hook
jest.mock('../../../../shared/hooks/useAuth', () => ({
  useAuth: jest.fn()
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock console.warn to avoid noise in tests
const originalConsoleWarn = console.warn
beforeAll(() => {
  console.warn = jest.fn()
})

afterAll(() => {
  console.warn = originalConsoleWarn
})

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should eventually render children after initialization', async () => {
    mockUseAuth.mockReturnValue({
      tokens: null,
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
      login: jest.fn(),
      user: null,
      isLoading: false,
      hasRole: jest.fn(() => false),
      hasAnyRole: jest.fn(() => false),
      hasAllRoles: jest.fn(() => false)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Wait for initialization to complete and render children
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  it('should render children after initialization with no tokens', async () => {
    mockUseAuth.mockReturnValue({
      tokens: null,
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: false,
      login: jest.fn(),
      user: null,
      isLoading: false,
      hasRole: jest.fn(() => false),
      hasAnyRole: jest.fn(() => false),
      hasAllRoles: jest.fn(() => false)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Fast forward past initialization
    await act(async () => {
      jest.runAllTimers()
    })

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  it('should attempt token refresh during initialization if token expires soon', async () => {
    const mockRefreshTokens = jest.fn().mockResolvedValue(undefined)
    const mockLogout = jest.fn()

    // Mock tokens that expire in 2 minutes (less than 5 minute threshold)
    const futureTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Fast forward to complete initialization
    await act(async () => {
      jest.runAllTimers()
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalled()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  it('should logout if token refresh fails during initialization', async () => {
    const mockRefreshTokens = jest.fn().mockRejectedValue(new Error('Refresh failed'))
    const mockLogout = jest.fn()

    // Mock tokens that expire in 2 minutes
    const futureTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    await act(async () => {
      jest.runAllTimers()
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalled()
      expect(mockLogout).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('Failed to refresh tokens on init:', expect.any(Error))
    })
  })

  it('should set up automatic token refresh timer', async () => {
    const mockRefreshTokens = jest.fn().mockResolvedValue(undefined)
    const mockLogout = jest.fn()

    // Mock tokens that expire in 10 minutes (should set up refresh timer)
    const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Complete initialization
    await act(async () => {
      jest.advanceTimersByTime(100)
    })

    // Fast forward to when refresh should occur (5 minutes before expiry)
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalledTimes(1)
    })
  })

  it('should logout if automatic token refresh fails', async () => {
    const mockRefreshTokens = jest.fn().mockRejectedValue(new Error('Auto refresh failed'))
    const mockLogout = jest.fn()

    // Mock tokens that expire in 6 minutes
    const futureTime = new Date(Date.now() + 6 * 60 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Complete initialization
    await act(async () => {
      jest.advanceTimersByTime(100)
    })

    // Fast forward to when auto refresh should occur
    await act(async () => {
      jest.advanceTimersByTime(1 * 60 * 1000) // 1 minute (refresh happens 1 min after render)
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalledTimes(1)
      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith('Automatic token refresh failed:', expect.any(Error))
    })
  })

  it('should not set up refresh timer when not authenticated', async () => {
    const mockRefreshTokens = jest.fn()
    const mockLogout = jest.fn()

    mockUseAuth.mockReturnValue({
      tokens: null,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: false,
      login: jest.fn(),
      user: null,
      isLoading: false,
      hasRole: jest.fn(() => false),
      hasAnyRole: jest.fn(() => false),
      hasAllRoles: jest.fn(() => false)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    await act(async () => {
      jest.runAllTimers()
    })

    expect(mockRefreshTokens).not.toHaveBeenCalled()
  })

  it('should clear refresh timer when component unmounts', async () => {
    const mockRefreshTokens = jest.fn()
    const mockLogout = jest.fn()

    // Mock tokens that expire in 10 minutes
    const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    const { unmount } = render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Complete initialization
    await act(async () => {
      jest.advanceTimersByTime(100)
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it('should handle tokens with past expiry time', async () => {
    const mockRefreshTokens = jest.fn().mockResolvedValue(undefined)
    const mockLogout = jest.fn()

    // Mock tokens that already expired
    const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: pastTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    await act(async () => {
      jest.runAllTimers()
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalled() // Should attempt refresh during init
    })
  })

  it('should handle minimum refresh time correctly', async () => {
    const mockRefreshTokens = jest.fn().mockResolvedValue(undefined)
    const mockLogout = jest.fn()

    // Mock tokens that expire in 30 seconds (less than 1 minute minimum)
    const futureTime = new Date(Date.now() + 30 * 1000).toISOString()
    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: futureTime
    }

    mockUseAuth.mockReturnValue({
      tokens: mockTokens,
      refreshTokens: mockRefreshTokens,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      user: { id: '1', username: 'test', role: 'CASHIER', isActive: true },
      isLoading: false,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      hasAllRoles: jest.fn(() => true)
    })

    render(
      <AuthProvider>
        <div>Test Content</div>
      </AuthProvider>
    )

    // Complete initialization (should trigger immediate refresh due to expiry < 5 min)
    await act(async () => {
      jest.advanceTimersByTime(100)
    })

    // Auto refresh timer should be set to minimum 1 minute
    await act(async () => {
      jest.advanceTimersByTime(60 * 1000) // 1 minute
    })

    await waitFor(() => {
      expect(mockRefreshTokens).toHaveBeenCalledTimes(2) // Once during init, once from timer
    })
  })
})