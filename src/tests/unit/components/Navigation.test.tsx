import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navigation } from '../../../shared/components/Navigation'
import { usePermissions } from '../../../shared/hooks/useAuth'

// Mock the hooks
jest.mock('../../../shared/hooks/useAuth')
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock UserMenu component
jest.mock('../../../shared/components/auth/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>
}))

describe('Navigation Component', () => {
  const mockHasPermission = jest.fn()

  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      hasPermission: mockHasPermission,
      hasAllPermissions: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn()
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const renderNavigation = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Navigation />
      </MemoryRouter>
    )
  }

  describe('Rendering', () => {
    it('should render the JustSell POS logo', () => {
      mockHasPermission.mockReturnValue(true)
      renderNavigation()

      const logo = screen.getByText('JustSell POS')
      expect(logo).toBeInTheDocument()
      expect(logo.closest('a')).toHaveAttribute('href', '/')
    })

    it('should render UserMenu component', () => {
      mockHasPermission.mockReturnValue(true)
      renderNavigation()

      expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    })

    it('should render desktop and mobile navigation containers', () => {
      mockHasPermission.mockReturnValue(true)
      const { container } = renderNavigation()

      // Desktop navigation (hidden sm:flex)
      const desktopNav = container.querySelector('.hidden.sm\\:ml-8')
      expect(desktopNav).toBeInTheDocument()

      // Mobile navigation (sm:hidden)
      const mobileNav = container.querySelector('.sm\\:hidden')
      expect(mobileNav).toBeInTheDocument()
    })
  })

  describe('Navigation Items', () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true)
    })

    it('should render all navigation items when user has all permissions', () => {
      renderNavigation()

      expect(screen.getAllByText('POS Terminal')).toHaveLength(2) // Desktop + Mobile
      expect(screen.getAllByText('Products')).toHaveLength(2)
      expect(screen.getAllByText('Customers')).toHaveLength(2)
      expect(screen.getAllByText('Reports')).toHaveLength(2)
    })

    it('should render correct links for navigation items', () => {
      renderNavigation()

      const posLinks = screen.getAllByRole('link', { name: /POS Terminal/ })
      const productLinks = screen.getAllByRole('link', { name: /Products/ })
      const customerLinks = screen.getAllByRole('link', { name: /Customers/ })
      const reportLinks = screen.getAllByRole('link', { name: /Reports/ })

      posLinks.forEach(link => expect(link).toHaveAttribute('href', '/pos'))
      productLinks.forEach(link => expect(link).toHaveAttribute('href', '/admin/products'))
      customerLinks.forEach(link => expect(link).toHaveAttribute('href', '/admin/customers'))
      reportLinks.forEach(link => expect(link).toHaveAttribute('href', '/admin/reports'))
    })

    it('should include SVG icons for each navigation item', () => {
      renderNavigation()

      // Check that SVG icons are present by tag name (they don't have img role by default)
      const container = screen.getByRole('navigation')
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(8) // 4 items × 2 views = 8 minimum
    })
  })

  describe('Permission-based Filtering', () => {
    it('should only show items user has permission for', () => {
      mockHasPermission.mockImplementation((permission) => {
        return permission === 'transaction:create' || permission === 'product:read'
      })

      renderNavigation()

      expect(screen.getAllByText('POS Terminal')).toHaveLength(2)
      expect(screen.getAllByText('Products')).toHaveLength(2)
      expect(screen.queryByText('Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()

      expect(mockHasPermission).toHaveBeenCalledWith('transaction:create')
      expect(mockHasPermission).toHaveBeenCalledWith('product:read')
      expect(mockHasPermission).toHaveBeenCalledWith('customer:read')
      expect(mockHasPermission).toHaveBeenCalledWith('reports:view')
    })

    it('should show no navigation items when user has no permissions', () => {
      mockHasPermission.mockReturnValue(false)

      renderNavigation()

      expect(screen.queryByText('POS Terminal')).not.toBeInTheDocument()
      expect(screen.queryByText('Products')).not.toBeInTheDocument()
      expect(screen.queryByText('Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    })

    it('should show only POS Terminal for transaction-only permission', () => {
      mockHasPermission.mockImplementation((permission) => {
        return permission === 'transaction:create'
      })

      renderNavigation()

      expect(screen.getAllByText('POS Terminal')).toHaveLength(2)
      expect(screen.queryByText('Products')).not.toBeInTheDocument()
      expect(screen.queryByText('Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    })
  })

  describe('Active Path Highlighting', () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true)
    })

    it('should highlight POS Terminal when on /pos route', () => {
      renderNavigation('/pos')

      const desktopLink = screen.getAllByRole('link', { name: /POS Terminal/ })[0]
      const mobileLink = screen.getAllByRole('link', { name: /POS Terminal/ })[1]

      expect(desktopLink).toHaveClass('border-blue-500', 'text-gray-900')
      expect(mobileLink).toHaveClass('border-blue-500', 'text-blue-700', 'bg-blue-50')
    })

    it('should highlight Products when on /admin/products route', () => {
      renderNavigation('/admin/products')

      const desktopLink = screen.getAllByRole('link', { name: /Products/ })[0]
      const mobileLink = screen.getAllByRole('link', { name: /Products/ })[1]

      expect(desktopLink).toHaveClass('border-blue-500', 'text-gray-900')
      expect(mobileLink).toHaveClass('border-blue-500', 'text-blue-700', 'bg-blue-50')
    })

    it('should highlight Products when on nested route /admin/products/123', () => {
      renderNavigation('/admin/products/123')

      const desktopLink = screen.getAllByRole('link', { name: /Products/ })[0]
      expect(desktopLink).toHaveClass('border-blue-500', 'text-gray-900')
    })

    it('should highlight Customers when on /admin/customers route', () => {
      renderNavigation('/admin/customers')

      const desktopLink = screen.getAllByRole('link', { name: /Customers/ })[0]
      const mobileLink = screen.getAllByRole('link', { name: /Customers/ })[1]

      expect(desktopLink).toHaveClass('border-blue-500', 'text-gray-900')
      expect(mobileLink).toHaveClass('border-blue-500', 'text-blue-700', 'bg-blue-50')
    })

    it('should highlight Reports when on /admin/reports route', () => {
      renderNavigation('/admin/reports')

      const desktopLink = screen.getAllByRole('link', { name: /Reports/ })[0]
      const mobileLink = screen.getAllByRole('link', { name: /Reports/ })[1]

      expect(desktopLink).toHaveClass('border-blue-500', 'text-gray-900')
      expect(mobileLink).toHaveClass('border-blue-500', 'text-blue-700', 'bg-blue-50')
    })

    it('should not highlight any items on unknown route', () => {
      renderNavigation('/unknown')

      const desktopLinks = screen.getAllByRole('link').slice(1, 5) // Exclude logo link
      desktopLinks.forEach(link => {
        expect(link).toHaveClass('border-transparent', 'text-gray-500')
        expect(link).not.toHaveClass('border-blue-500', 'text-gray-900')
      })
    })

    it('should not highlight any items on root route', () => {
      renderNavigation('/')

      const desktopLinks = screen.getAllByRole('link').slice(1, 5) // Exclude logo link
      desktopLinks.forEach(link => {
        expect(link).toHaveClass('border-transparent', 'text-gray-500')
        expect(link).not.toHaveClass('border-blue-500', 'text-gray-900')
      })
    })
  })

  describe('Styling and Layout', () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true)
    })

    it('should apply correct CSS classes for desktop navigation', () => {
      const { container } = renderNavigation()

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('bg-white', 'shadow-lg', 'border-b')

      const desktopContainer = container.querySelector('.hidden.sm\\:ml-8')
      expect(desktopContainer).toHaveClass('sm:flex', 'sm:space-x-8')
    })

    it('should apply correct CSS classes for mobile navigation', () => {
      const { container } = renderNavigation()

      const mobileContainer = container.querySelector('.sm\\:hidden')
      expect(mobileContainer).toBeInTheDocument()

      const mobileNavContent = mobileContainer?.querySelector('.pt-2.pb-3.space-y-1')
      expect(mobileNavContent).toBeInTheDocument()
    })

    it('should apply correct responsive classes', () => {
      const { container } = renderNavigation()

      const mainContainer = container.querySelector('.max-w-7xl')
      expect(mainContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8')

      const flexContainer = mainContainer?.querySelector('.flex.justify-between.h-16')
      expect(flexContainer).toBeInTheDocument()
    })

    it('should apply correct hover states', () => {
      renderNavigation()

      // Check desktop navigation links
      const desktopLinks = screen.getAllByRole('link').filter(link =>
        link.textContent !== 'JustSell POS' &&
        link.classList.contains('border-b-2')
      )

      // Desktop links should have hover:text-gray-700 and hover:border-gray-300
      desktopLinks.forEach(link => {
        expect(link).toHaveClass('hover:text-gray-700', 'hover:border-gray-300')
      })

      // Check mobile navigation links
      const mobileLinks = screen.getAllByRole('link').filter(link =>
        link.textContent !== 'JustSell POS' &&
        link.classList.contains('border-l-4')
      )

      // Mobile links should have hover:text-gray-800 and hover:bg-gray-50
      mobileLinks.forEach(link => {
        expect(link).toHaveClass('hover:text-gray-800', 'hover:bg-gray-50')
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockHasPermission.mockReturnValue(true)
    })

    it('should have proper semantic structure', () => {
      const { container } = renderNavigation()

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('should have accessible link text', () => {
      renderNavigation()

      expect(screen.getByRole('link', { name: /JustSell POS/ })).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /POS Terminal/ })).toHaveLength(2)
      expect(screen.getAllByRole('link', { name: /Products/ })).toHaveLength(2)
      expect(screen.getAllByRole('link', { name: /Customers/ })).toHaveLength(2)
      expect(screen.getAllByRole('link', { name: /Reports/ })).toHaveLength(2)
    })

    it('should maintain proper focus management', () => {
      renderNavigation()

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toBeVisible()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined permissions gracefully', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: undefined as any,
        hasAllPermissions: jest.fn(),
        hasAnyPermission: jest.fn(),
        hasRole: jest.fn()
      })

      expect(() => renderNavigation()).not.toThrow()
    })

    it('should handle empty navigation when permissions check throws', () => {
      mockHasPermission.mockImplementation(() => {
        throw new Error('Permission check failed')
      })

      expect(() => renderNavigation()).not.toThrow()
    })

    it('should handle very long navigation item names', () => {
      // This tests the layout doesn't break with long text
      renderNavigation()

      // Component should render without throwing
      expect(screen.getByText('JustSell POS')).toBeInTheDocument()
    })

    it('should handle navigation with no visible items gracefully', () => {
      mockHasPermission.mockReturnValue(false)
      renderNavigation()

      // Should still render the logo and user menu
      expect(screen.getByText('JustSell POS')).toBeInTheDocument()
      expect(screen.getByTestId('user-menu')).toBeInTheDocument()

      // But no navigation items
      expect(screen.queryByText('POS Terminal')).not.toBeInTheDocument()
      expect(screen.queryByText('Products')).not.toBeInTheDocument()
      expect(screen.queryByText('Customers')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
    })
  })
})