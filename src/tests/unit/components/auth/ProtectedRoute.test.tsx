import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProtectedRoute, AdminRoute, ManagerRoute, CashierRoute } from '../../../../shared/components/auth/ProtectedRoute'
import { useAuth, usePermissions } from '../../../../shared/hooks/useAuth'
import type { User } from '../../../../shared/types/auth'

// Mock the hooks
jest.mock('../../../../shared/hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock LoginForm component
jest.mock('../../../../shared/components/auth/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>
}))

describe('ProtectedRoute Component', () => {
  const mockLogout = jest.fn()
  const mockHasPermission = jest.fn()
  const mockHasAllPermissions = jest.fn()
  const mockHasAnyPermission = jest.fn()
  const mockHasRole = jest.fn()

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'CASHIER',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      login: jest.fn(),
      logout: mockLogout,
      isLoading: false,
      error: null
    })

    mockUsePermissions.mockReturnValue({
      hasPermission: mockHasPermission,
      hasAllPermissions: mockHasAllPermissions,
      hasAnyPermission: mockHasAnyPermission,
      hasRole: mockHasRole
    })
  })

  describe('Authentication Checks', () => {
    it('should render children when user is authenticated', () => {
      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render login form when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        login: jest.fn(),
        logout: mockLogout,
        isLoading: false,
        error: null
      })

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should render login form when user object is null', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: null,
        login: jest.fn(),
        logout: mockLogout,
        isLoading: false,
        error: null
      })

      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('Role-based Access Control', () => {
    it('should render children when user has required role', () => {
      mockHasRole.mockReturnValue(true)

      render(
        <ProtectedRoute requiredRole="CASHIER">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasRole).toHaveBeenCalledWith('CASHIER')
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render access denied when user lacks required role', () => {
      mockHasRole.mockReturnValue(false)

      render(
        <ProtectedRoute requiredRole="ADMIN">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasRole).toHaveBeenCalledWith('ADMIN')
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Access denied. Required role: ADMIN')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('Permission-based Access Control', () => {
    it('should render children when user has required permission', () => {
      mockHasPermission.mockReturnValue(true)

      render(
        <ProtectedRoute requiredPermission="CREATE_PRODUCTS">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasPermission).toHaveBeenCalledWith('CREATE_PRODUCTS')
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render access denied when user lacks required permission', () => {
      mockHasPermission.mockReturnValue(false)

      render(
        <ProtectedRoute requiredPermission="DELETE_PRODUCTS">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasPermission).toHaveBeenCalledWith('DELETE_PRODUCTS')
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Access denied. Required permission: DELETE_PRODUCTS')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Permissions Access Control', () => {
    it('should render children when user has all required permissions (requireAll=true)', () => {
      mockHasAllPermissions.mockReturnValue(true)

      render(
        <ProtectedRoute
          requiredPermissions={['CREATE_PRODUCTS', 'UPDATE_PRODUCTS']}
          requireAll={true}
        >
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasAllPermissions).toHaveBeenCalledWith(['CREATE_PRODUCTS', 'UPDATE_PRODUCTS'])
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render access denied when user lacks all required permissions (requireAll=true)', () => {
      mockHasAllPermissions.mockReturnValue(false)

      render(
        <ProtectedRoute
          requiredPermissions={['CREATE_PRODUCTS', 'DELETE_PRODUCTS']}
          requireAll={true}
        >
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasAllPermissions).toHaveBeenCalledWith(['CREATE_PRODUCTS', 'DELETE_PRODUCTS'])
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Access denied. Required permissions: CREATE_PRODUCTS AND DELETE_PRODUCTS')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should render children when user has any required permission (requireAll=false)', () => {
      mockHasAnyPermission.mockReturnValue(true)

      render(
        <ProtectedRoute
          requiredPermissions={['CREATE_PRODUCTS', 'UPDATE_PRODUCTS']}
          requireAll={false}
        >
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['CREATE_PRODUCTS', 'UPDATE_PRODUCTS'])
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render access denied when user has none of the required permissions (requireAll=false)', () => {
      mockHasAnyPermission.mockReturnValue(false)

      render(
        <ProtectedRoute
          requiredPermissions={['CREATE_PRODUCTS', 'DELETE_PRODUCTS']}
          requireAll={false}
        >
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['CREATE_PRODUCTS', 'DELETE_PRODUCTS'])
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText('Access denied. Required permissions: CREATE_PRODUCTS OR DELETE_PRODUCTS')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should handle empty permissions array', () => {
      render(
        <ProtectedRoute requiredPermissions={[]}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasAllPermissions).not.toHaveBeenCalled()
      expect(mockHasAnyPermission).not.toHaveBeenCalled()
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })
  })

  describe('Priority and Combination of Requirements', () => {
    it('should check role before permissions', () => {
      mockHasRole.mockReturnValue(false)
      mockHasPermission.mockReturnValue(true)

      render(
        <ProtectedRoute requiredRole="ADMIN" requiredPermission="CREATE_PRODUCTS">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasRole).toHaveBeenCalledWith('ADMIN')
      expect(mockHasPermission).not.toHaveBeenCalled() // Should not check permissions if role fails
      expect(screen.getByText('Access denied. Required role: ADMIN')).toBeInTheDocument()
    })

    it('should check permissions after role passes', () => {
      mockHasRole.mockReturnValue(true)
      mockHasPermission.mockReturnValue(false)

      render(
        <ProtectedRoute requiredRole="ADMIN" requiredPermission="DELETE_PRODUCTS">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasRole).toHaveBeenCalledWith('ADMIN')
      expect(mockHasPermission).toHaveBeenCalledWith('DELETE_PRODUCTS')
      expect(screen.getByText('Access denied. Required permission: DELETE_PRODUCTS')).toBeInTheDocument()
    })
  })

  describe('Access Denied Component', () => {
    it('should display user information in access denied screen', () => {
      mockHasRole.mockReturnValue(false)

      render(
        <ProtectedRoute requiredRole="ADMIN">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByText('Signed in as: Test User (testuser)')).toBeInTheDocument()
      expect(screen.getByText('Role: CASHIER')).toBeInTheDocument()
    })

    it('should call logout when sign in as different user button is clicked', () => {
      mockHasRole.mockReturnValue(false)

      render(
        <ProtectedRoute requiredRole="ADMIN">
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      const signInButton = screen.getByText('Sign in as different user')
      fireEvent.click(signInButton)

      expect(mockLogout).toHaveBeenCalled()
    })

    it('should render custom fallback when provided', () => {
      mockHasRole.mockReturnValue(false)
      const customFallback = <div data-testid="custom-fallback">Custom Access Denied</div>

      render(
        <ProtectedRoute requiredRole="ADMIN" fallback={customFallback}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
    })

    it('should not display user information when user is null in access denied screen', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: null,
        login: jest.fn(),
        logout: mockLogout,
        isLoading: false,
        error: null
      })

      // This scenario shouldn't happen in practice since null user should redirect to login
      // But we test it for completeness
    })
  })

  describe('Convenience Route Components', () => {
    describe('AdminRoute', () => {
      it('should render children when user has ADMIN role', () => {
        mockHasRole.mockReturnValue(true)

        render(
          <AdminRoute>
            <div data-testid="admin-content">Admin Content</div>
          </AdminRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('ADMIN')
        expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      })

      it('should render access denied when user is not ADMIN', () => {
        mockHasRole.mockReturnValue(false)

        render(
          <AdminRoute>
            <div data-testid="admin-content">Admin Content</div>
          </AdminRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('ADMIN')
        expect(screen.getByText('Access denied. Required role: ADMIN')).toBeInTheDocument()
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      })

      it('should render custom fallback for AdminRoute', () => {
        mockHasRole.mockReturnValue(false)
        const customFallback = <div data-testid="admin-fallback">Admin Access Denied</div>

        render(
          <AdminRoute fallback={customFallback}>
            <div data-testid="admin-content">Admin Content</div>
          </AdminRoute>
        )

        expect(screen.getByTestId('admin-fallback')).toBeInTheDocument()
        expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
      })
    })

    describe('ManagerRoute', () => {
      it('should render children when user has MANAGER role', () => {
        mockHasRole.mockReturnValue(true)

        render(
          <ManagerRoute>
            <div data-testid="manager-content">Manager Content</div>
          </ManagerRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('MANAGER')
        expect(screen.getByTestId('manager-content')).toBeInTheDocument()
      })

      it('should render access denied when user is not MANAGER', () => {
        mockHasRole.mockReturnValue(false)

        render(
          <ManagerRoute>
            <div data-testid="manager-content">Manager Content</div>
          </ManagerRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('MANAGER')
        expect(screen.getByText('Access denied. Required role: MANAGER')).toBeInTheDocument()
        expect(screen.queryByTestId('manager-content')).not.toBeInTheDocument()
      })
    })

    describe('CashierRoute', () => {
      it('should render children when user has CASHIER role', () => {
        mockHasRole.mockReturnValue(true)

        render(
          <CashierRoute>
            <div data-testid="cashier-content">Cashier Content</div>
          </CashierRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('CASHIER')
        expect(screen.getByTestId('cashier-content')).toBeInTheDocument()
      })

      it('should render access denied when user is not CASHIER', () => {
        mockHasRole.mockReturnValue(false)

        render(
          <CashierRoute>
            <div data-testid="cashier-content">Cashier Content</div>
          </CashierRoute>
        )

        expect(mockHasRole).toHaveBeenCalledWith('CASHIER')
        expect(screen.getByText('Access denied. Required role: CASHIER')).toBeInTheDocument()
        expect(screen.queryByTestId('cashier-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined requiredPermissions', () => {
      render(
        <ProtectedRoute requiredPermissions={undefined}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not call permission checks when no requirements are specified', () => {
      render(
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )

      expect(mockHasRole).not.toHaveBeenCalled()
      expect(mockHasPermission).not.toHaveBeenCalled()
      expect(mockHasAllPermissions).not.toHaveBeenCalled()
      expect(mockHasAnyPermission).not.toHaveBeenCalled()
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should handle multiple children elements', () => {
      render(
        <ProtectedRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </ProtectedRoute>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })
  })
})