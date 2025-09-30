import React from 'react'
import { useAuth, usePermissions } from '../../hooks/useAuth'
import { LoginForm } from './LoginForm'
import type { Permission } from '../../types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: Permission
  requiredPermissions?: Permission[]
  requiredRole?: string
  requireAll?: boolean // For multiple permissions: true = AND, false = OR
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  requireAll = true,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const { hasPermission, hasAllPermissions, hasAnyPermission, hasRole } = usePermissions()

  // Show login form if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoginForm />
      </div>
    )
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <AccessDenied message={`Access denied. Required role: ${requiredRole}`} fallback={fallback} />
    )
  }

  // Check single permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <AccessDenied
        message={`Access denied. Required permission: ${requiredPermission}`}
        fallback={fallback}
      />
    )
  }

  // Check multiple permissions requirement
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions)

    if (!hasAccess) {
      const permissionText = requireAll
        ? requiredPermissions.join(' AND ')
        : requiredPermissions.join(' OR ')

      return (
        <AccessDenied
          message={`Access denied. Required permissions: ${permissionText}`}
          fallback={fallback}
        />
      )
    }
  }

  return <>{children}</>
}

interface AccessDeniedProps {
  message: string
  fallback?: React.ReactNode
}

function AccessDenied({ message, fallback }: AccessDeniedProps) {
  const { logout, user } = useAuth()

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>

          <p className="text-sm text-gray-600 mb-6">{message}</p>

          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900">
                Signed in as: {user.firstName} {user.lastName} ({user.username})
              </p>
              <p className="text-xs text-gray-600 mt-1">Role: {user.role}</p>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in as different user
          </button>
        </div>
      </div>
    </div>
  )
}

// Convenience components for common permission checks
export function AdminRoute({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="ADMIN" fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerRoute({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="MANAGER" fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

export function CashierRoute({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="CASHIER" fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}
