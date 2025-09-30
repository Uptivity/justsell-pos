import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../../../shared/hooks/useAuth'

// Mock the auth service
jest.mock('../../../shared/services/auth', () => ({
  hasPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
  hasAnyPermission: jest.fn()
}))

// Mock global fetch
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response))

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false
    })

    // Clear fetch mock
    jest.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.user).toBeNull()
    expect(result.current.tokens).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should update user', () => {
    const { result } = renderHook(() => useAuthStore())

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'CASHIER',
      permissions: ['READ_PRODUCTS']
    }

    act(() => {
      result.current.updateUser(mockUser as any)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should logout and clear state', () => {
    const { result } = renderHook(() => useAuthStore())

    // First set some state
    act(() => {
      result.current.updateUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'CASHIER',
        permissions: ['READ_PRODUCTS']
      } as any)
    })

    expect(result.current.isAuthenticated).toBe(true)

    // Then logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.tokens).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should check role', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.updateUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'MANAGER',
        permissions: ['READ_PRODUCTS']
      } as any)
    })

    expect(result.current.hasRole('MANAGER')).toBe(true)
    expect(result.current.hasRole('ADMIN')).toBe(false)
  })

  it('should handle loading state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.isLoading).toBe(false)

    // Test loading state management would require access to internal state setters
    // This is a basic test to ensure the property exists and is accessible
  })
})
