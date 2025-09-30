import React from 'react'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserMenu } from '../../../../shared/components/auth/UserMenu'
import { useAuth } from '../../../../shared/hooks/useAuth'
import type { User } from '../../../../shared/types/auth'

// Mock the useAuth hook
jest.mock('../../../../shared/hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('UserMenu Component', () => {
  const mockLogout = jest.fn()

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'CASHIER',
    storeId: 'store-12345',
    lastLoginAt: new Date('2024-01-01T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isAuthenticated: true,
      login: jest.fn(),
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('should render user menu button when user is provided', () => {
      render(<UserMenu />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('CASHIER')).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument() // Avatar initial
    })

    it('should return null when user is not provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isAuthenticated: false,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      const { container } = render(<UserMenu />)
      expect(container.firstChild).toBeNull()
    })

    it('should apply custom className when provided', () => {
      const { container } = render(<UserMenu className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should display store ID when available', () => {
      render(<UserMenu />)
      expect(screen.getByText('Store: 2345')).toBeInTheDocument() // Last 4 digits
    })

    it('should not display store ID when not available', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, storeId: undefined },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.queryByText(/Store:/)).not.toBeInTheDocument()
    })
  })

  describe('Display Name Logic', () => {
    it('should display full name when firstName and lastName are available', () => {
      render(<UserMenu />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display username when firstName is not available', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, firstName: '' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should display username when lastName is not available', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, lastName: '' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should display username when both firstName and lastName are not available', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, firstName: '', lastName: '' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })
  })

  describe('Role Colors', () => {
    it('should display ADMIN role with red styling', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'ADMIN' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      const roleElement = screen.getByText('ADMIN')
      expect(roleElement).toHaveClass('bg-red-100', 'text-red-800')
    })

    it('should display MANAGER role with blue styling', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'MANAGER' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      const roleElement = screen.getByText('MANAGER')
      expect(roleElement).toHaveClass('bg-blue-100', 'text-blue-800')
    })

    it('should display CASHIER role with green styling', () => {
      render(<UserMenu />)
      const roleElement = screen.getByText('CASHIER')
      expect(roleElement).toHaveClass('bg-green-100', 'text-green-800')
    })
  })

  describe('Menu Toggle', () => {
    it('should toggle menu visibility when button is clicked', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')

      // Menu should be initially closed
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()

      // Click to open menu
      await user.click(menuButton)
      expect(screen.getByText('@testuser')).toBeInTheDocument()

      // Click to close menu
      await user.click(menuButton)
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()
    })

    it('should close menu when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      // Menu should be open
      expect(screen.getByText('@testuser')).toBeInTheDocument()

      // Click backdrop to close
      const backdrop = screen.getByTestId = jest.fn()
      fireEvent.click(document.querySelector('.fixed.inset-0')!)

      // Menu should be closed
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()
    })

    it('should rotate chevron icon when menu is open', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      const chevron = menuButton.querySelector('svg')

      // Initially not rotated
      expect(chevron).not.toHaveClass('rotate-180')

      // Open menu
      await user.click(menuButton)
      expect(chevron).toHaveClass('rotate-180')

      // Close menu
      await user.click(menuButton)
      expect(chevron).not.toHaveClass('rotate-180')
    })
  })

  describe('Menu Content', () => {
    it('should display user information in dropdown menu', async () => {
      const user = userEvent.setup()
      const { container } = render(<UserMenu />)

      const menuButton = container.querySelector('button')!
      await user.click(menuButton)

      // Use within to scope queries to this specific component
      const dropdown = container.querySelector('[role="menu"]') || container.querySelector('.absolute')
      expect(dropdown).toBeInTheDocument()

      if (dropdown) {
        expect(within(dropdown).getByText('John Doe')).toBeInTheDocument()
        expect(within(dropdown).getByText('@testuser')).toBeInTheDocument()
        expect(within(dropdown).getByText(/Last login:/)).toBeInTheDocument()
        expect(within(dropdown).getByText(/01\/01\/2024/)).toBeInTheDocument() // Date format may vary
      }
    })

    it('should display "Never" for lastLoginAt when not available', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, lastLoginAt: undefined },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      const { container } = render(<UserMenu />)
      const menuButton = container.querySelector('button')!
      await userEvent.setup().click(menuButton)

      expect(screen.getByText(/Last login: Never/)).toBeInTheDocument()
    })

    it('should display menu options', async () => {
      const user = userEvent.setup()
      const { container } = render(<UserMenu />)

      const menuButton = container.querySelector('button')!
      await user.click(menuButton)

      expect(screen.getByText('Your Profile')).toBeInTheDocument()
      expect(screen.getByText('Change Password')).toBeInTheDocument()
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    it('should have proper SVG icons for menu items', async () => {
      const user = userEvent.setup()
      const { container } = render(<UserMenu />)

      const menuButton = container.querySelector('button')!
      await user.click(menuButton)

      const profileButton = screen.getByText('Your Profile').closest('button')
      const passwordButton = screen.getByText('Change Password').closest('button')
      const signOutButton = screen.getByText('Sign out').closest('button')

      expect(profileButton?.querySelector('svg')).toBeInTheDocument()
      expect(passwordButton?.querySelector('svg')).toBeInTheDocument()
      expect(signOutButton?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Menu Actions', () => {
    it('should close menu when "Your Profile" is clicked', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      const profileButton = screen.getByText('Your Profile')
      await user.click(profileButton)

      // Menu should be closed
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()
    })

    it('should close menu when "Change Password" is clicked', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      const passwordButton = screen.getByText('Change Password')
      await user.click(passwordButton)

      // Menu should be closed
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()
    })

    it('should call logout and close menu when "Sign out" is clicked', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      const signOutButton = screen.getByText('Sign out')
      await user.click(signOutButton)

      expect(mockLogout).toHaveBeenCalled()
      // Menu should be closed
      expect(screen.queryByText('@testuser')).not.toBeInTheDocument()
    })
  })

  describe('Avatar Initial', () => {
    it('should display first letter of display name in uppercase', () => {
      render(<UserMenu />)
      expect(screen.getByText('J')).toBeInTheDocument() // First letter of "John Doe"
    })

    it('should display first letter of username when no full name', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, firstName: '', lastName: '' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText('T')).toBeInTheDocument() // First letter of "testuser"
    })

    it('should handle empty display name gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, firstName: '', lastName: '', username: '' },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      // Should not throw error and should display empty string
      const avatar = screen.getByRole('button').querySelector('.h-8.w-8 span')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')

      // Button should be focusable
      await user.tab()
      expect(menuButton).toHaveFocus()

      // Should have focus ring classes
      expect(menuButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2', 'focus:ring-blue-500')
    })

    it('should have proper button type', () => {
      render(<UserMenu />)
      const menuButton = screen.getByRole('button')
      expect(menuButton).toHaveAttribute('type', 'button')
    })

    it('should have hover states for menu items', async () => {
      const user = userEvent.setup()
      render(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      const profileButton = screen.getByText('Your Profile').closest('button')
      const passwordButton = screen.getByText('Change Password').closest('button')
      const signOutButton = screen.getByText('Sign out').closest('button')

      expect(profileButton).toHaveClass('hover:bg-gray-100')
      expect(passwordButton).toHaveClass('hover:bg-gray-100')
      expect(signOutButton).toHaveClass('hover:bg-red-50')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long names gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: {
          ...mockUser,
          firstName: 'VeryLongFirstName',
          lastName: 'VeryLongLastName'
        },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText('VeryLongFirstName VeryLongLastName')).toBeInTheDocument()
    })

    it('should handle special characters in names', () => {
      mockUseAuth.mockReturnValue({
        user: {
          ...mockUser,
          firstName: 'José',
          lastName: "O'Connor"
        },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      render(<UserMenu />)
      expect(screen.getByText("José O'Connor")).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument() // Avatar initial
    })

    it('should handle null lastLoginAt date', () => {
      mockUseAuth.mockReturnValue({
        user: {
          ...mockUser,
          lastLoginAt: null
        },
        logout: mockLogout,
        isAuthenticated: true,
        login: jest.fn(),
        isLoading: false,
        error: null
      })

      expect(() => render(<UserMenu />)).not.toThrow()
    })
  })
})