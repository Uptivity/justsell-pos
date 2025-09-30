import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductList } from '../../../../shared/components/products/ProductList'
import { useProducts, useDeleteProduct } from '../../../../shared/hooks/useProducts'
import { usePermissions } from '../../../../shared/hooks/useAuth'
import type { Product } from '../../../../shared/types/database'

// Mock the hooks
jest.mock('../../../../shared/hooks/useProducts')
jest.mock('../../../../shared/hooks/useAuth')

const mockUseProducts = useProducts as jest.MockedFunction<typeof useProducts>
const mockUseDeleteProduct = useDeleteProduct as jest.MockedFunction<typeof useDeleteProduct>
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock window.confirm
const originalConfirm = window.confirm
const originalAlert = window.alert

describe('ProductList Component', () => {
  const mockOnSelectProduct = jest.fn()
  const mockOnEditProduct = jest.fn()
  const mockDeleteMutate = jest.fn()

  const mockProductsData = {
    products: [
      {
        id: 'prod-1',
        name: 'Marlboro Red Pack',
        sku: 'CIG001',
        price: 8.99,
        quantity: 50,
        minStockLevel: 10,
        category: 'Cigarettes',
        ageRestricted: true,
        imageUrl: 'https://example.com/marlboro.jpg'
      } as Product,
      {
        id: 'prod-2',
        name: 'Vape Juice Blue',
        sku: 'VAPE001',
        price: 15.99,
        quantity: 5,
        minStockLevel: 10,
        category: 'Vape',
        ageRestricted: true,
        imageUrl: null
      } as Product,
      {
        id: 'prod-3',
        name: 'Lighter',
        sku: 'ACC001',
        price: 2.99,
        quantity: 0,
        minStockLevel: 5,
        category: 'Accessories',
        ageRestricted: false,
        imageUrl: 'https://example.com/lighter.jpg'
      } as Product
    ],
    total: 3,
    totalPages: 1
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock permissions
    mockUsePermissions.mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(true),
      user: null,
      permissions: [],
      isLoading: false
    })

    // Mock useProducts
    mockUseProducts.mockReturnValue({
      data: mockProductsData,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    } as any)

    // Mock useDeleteProduct
    mockUseDeleteProduct.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
      error: null
    } as any)

    // Mock window methods
    window.confirm = jest.fn().mockReturnValue(true)
    window.alert = jest.fn()
  })

  afterEach(() => {
    window.confirm = originalConfirm
    window.alert = originalAlert
  })

  describe('Rendering', () => {
    it('should render product list with all required elements', () => {
      render(<ProductList />)

      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /low stock/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /age restricted/i })).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      const { container } = render(<ProductList className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should render products table with correct headers', () => {
      render(<ProductList />)

      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('SKU')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Stock')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should display products with correct information', () => {
      render(<ProductList />)

      expect(screen.getByText('Marlboro Red Pack')).toBeInTheDocument()
      expect(screen.getByText('CIG001')).toBeInTheDocument()
      expect(screen.getByText('$8.99')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Cigarettes')).toBeInTheDocument()
      expect(screen.getAllByText('Age Restricted')).toHaveLength(3) // 1 filter button + 2 product badges
    })

    it('should display stock status correctly', () => {
      render(<ProductList />)

      const stockStatuses = screen.getAllByText(/Stock/)
      expect(stockStatuses.some(el => el.textContent === 'In Stock')).toBe(true)
      expect(stockStatuses.some(el => el.textContent === 'Low Stock')).toBe(true)
      expect(stockStatuses.some(el => el.textContent === 'Out of Stock')).toBe(true)
    })

    it('should display product images when available', () => {
      render(<ProductList />)

      const marlboroImage = screen.getByAltText('Marlboro Red Pack')
      expect(marlboroImage).toHaveAttribute('src', 'https://example.com/marlboro.jpg')
    })

    it('should display placeholder for products without images', () => {
      render(<ProductList />)

      // Check for the first letter placeholder for Vape Juice Blue
      expect(screen.getByText('V')).toBeInTheDocument()
    })
  })

  describe('Loading and Error States', () => {
    it('should display loading state correctly', () => {
      mockUseProducts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.getByText('Loading products...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should display error state correctly', () => {
      mockUseProducts.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.getByText('Failed to load products. Please try again.')).toBeInTheDocument()
    })

    it('should display empty state when no products found', () => {
      mockUseProducts.mockReturnValue({
        data: { products: [], total: 0, totalPages: 0 },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.getByText('No products found.')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should update search input value when user types', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      await user.type(searchInput, 'Marlboro')

      expect(searchInput).toHaveValue('Marlboro')
    })

    it('should submit search when form is submitted', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      const searchButton = screen.getByRole('button', { name: /search/i })

      await user.type(searchInput, 'Marlboro')
      await user.click(searchButton)

      // Should have called useProducts with search filter
      expect(mockUseProducts).toHaveBeenCalledWith(
        { search: 'Marlboro' },
        1,
        20
      )
    })

    it('should show clear button when search term exists', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      await user.type(searchInput, 'test')

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      await user.type(searchInput, 'test')

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
    })
  })

  describe('Filter Functionality', () => {
    it('should toggle low stock filter when clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const lowStockButton = screen.getByRole('button', { name: /low stock/i })
      await user.click(lowStockButton)

      expect(mockUseProducts).toHaveBeenCalledWith(
        { lowStock: true },
        1,
        20
      )
    })

    it('should toggle age restricted filter when clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const ageRestrictedButton = screen.getByRole('button', { name: /age restricted/i })
      await user.click(ageRestrictedButton)

      expect(mockUseProducts).toHaveBeenCalledWith(
        { ageRestricted: true },
        1,
        20
      )
    })

    it('should apply visual styles when filters are active', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const lowStockButton = screen.getByRole('button', { name: /low stock/i })
      await user.click(lowStockButton)

      expect(lowStockButton).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })

    it('should combine search and filters', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      const lowStockButton = screen.getByRole('button', { name: /low stock/i })

      await user.type(searchInput, 'vape')
      await user.click(lowStockButton)

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      expect(mockUseProducts).toHaveBeenCalledWith(
        { search: 'vape', lowStock: true },
        1,
        20
      )
    })
  })

  describe('Product Interaction', () => {
    it('should call onSelectProduct when product row is clicked in selectable mode', async () => {
      const user = userEvent.setup()
      render(<ProductList selectable onSelectProduct={mockOnSelectProduct} />)

      const productRow = screen.getByText('Marlboro Red Pack').closest('tr')!
      await user.click(productRow)

      expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProductsData.products[0])
    })

    it('should not call onSelectProduct when not in selectable mode', async () => {
      const user = userEvent.setup()
      render(<ProductList onSelectProduct={mockOnSelectProduct} />)

      const productRow = screen.getByText('Marlboro Red Pack').closest('tr')!
      await user.click(productRow)

      expect(mockOnSelectProduct).not.toHaveBeenCalled()
    })

    it('should apply cursor-pointer class in selectable mode', () => {
      render(<ProductList selectable />)

      const productRow = screen.getByText('Marlboro Red Pack').closest('tr')!
      expect(productRow).toHaveClass('cursor-pointer')
    })
  })

  describe('Product Actions', () => {
    it('should call onEditProduct when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList onEditProduct={mockOnEditProduct} />)

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(mockOnEditProduct).toHaveBeenCalledWith(mockProductsData.products[0])
    })

    it('should prevent row selection when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList selectable onSelectProduct={mockOnSelectProduct} onEditProduct={mockOnEditProduct} />)

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(mockOnSelectProduct).not.toHaveBeenCalled()
      expect(mockOnEditProduct).toHaveBeenCalled()
    })

    it('should show confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Marlboro Red Pack"?')
    })

    it('should call delete mutation when confirmed', async () => {
      const user = userEvent.setup()
      window.confirm = jest.fn().mockReturnValue(true)
      render(<ProductList />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      expect(mockDeleteMutate).toHaveBeenCalledWith('prod-1')
    })

    it('should not delete when user cancels confirmation', async () => {
      const user = userEvent.setup()
      window.confirm = jest.fn().mockReturnValue(false)
      render(<ProductList />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      expect(mockDeleteMutate).not.toHaveBeenCalled()
    })

    it('should show alert when delete fails', async () => {
      const user = userEvent.setup()
      mockDeleteMutate.mockRejectedValue(new Error('Delete failed'))
      render(<ProductList />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to delete product. Please try again.')
      })
    })

    it('should disable delete button when deletion is pending', () => {
      mockUseDeleteProduct.mockReturnValue({
        mutateAsync: mockDeleteMutate,
        isPending: true,
        error: null
      } as any)

      render(<ProductList />)

      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons[0]).toBeDisabled()
    })
  })

  describe('Permissions', () => {
    it('should hide edit button when user lacks update permission', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: jest.fn().mockImplementation((perm) => perm !== 'product:update'),
        user: null,
        permissions: [],
        isLoading: false
      })

      render(<ProductList />)

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('should hide delete button when user lacks delete permission', () => {
      mockUsePermissions.mockReturnValue({
        hasPermission: jest.fn().mockImplementation((perm) => perm !== 'product:delete'),
        user: null,
        permissions: [],
        isLoading: false
      })

      render(<ProductList />)

      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should show both buttons when user has all permissions', () => {
      render(<ProductList />)

      expect(screen.getAllByText('Edit')).toHaveLength(3)
      expect(screen.getAllByText('Delete')).toHaveLength(3)
    })
  })

  describe('Pagination', () => {
    const mockPaginatedData = {
      products: mockProductsData.products,
      total: 50,
      totalPages: 3
    }

    beforeEach(() => {
      mockUseProducts.mockReturnValue({
        data: mockPaginatedData,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)
    })

    it('should display pagination when there are multiple pages', () => {
      render(<ProductList />)

      expect(screen.getAllByText('Previous')).toHaveLength(2) // Mobile and desktop
      expect(screen.getAllByText('Next')).toHaveLength(2)
      // Verify pagination text exists in DOM (checking for specific structure)
      expect(document.querySelector('.text-sm.text-gray-700')).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      render(<ProductList />)

      const previousButtons = screen.getAllByText('Previous')
      previousButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('should enable next button when not on last page', () => {
      render(<ProductList />)

      const nextButtons = screen.getAllByText('Next')
      nextButtons.forEach(button => {
        expect(button).not.toBeDisabled()
      })
    })

    it('should call useProducts with correct page when next is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductList />)

      const nextButtons = screen.getAllByText('Next')
      await user.click(nextButtons[0])

      expect(mockUseProducts).toHaveBeenCalledWith({}, 2, 20)
    })

    it('should not display pagination for single page', () => {
      mockUseProducts.mockReturnValue({
        data: mockProductsData,
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })
  })

  describe('Price Formatting', () => {
    it('should format prices as currency', () => {
      render(<ProductList />)

      expect(screen.getByText('$8.99')).toBeInTheDocument()
      expect(screen.getByText('$15.99')).toBeInTheDocument()
      expect(screen.getByText('$2.99')).toBeInTheDocument()
    })
  })

  describe('Stock Level Display', () => {
    it('should show minimum stock level when greater than 0', () => {
      render(<ProductList />)

      expect(screen.getAllByText(/\(min:/)).toHaveLength(3) // All 3 products have min stock levels
    })

    it('should display correct stock status colors', () => {
      render(<ProductList />)

      // Find the status badges (not filter buttons) by looking for the specific badge classes
      const inStockBadge = document.querySelector('.text-green-600.bg-green-50')
      const lowStockBadge = document.querySelector('.text-yellow-600.bg-yellow-50')
      const outOfStockBadge = document.querySelector('.text-red-600.bg-red-50')

      expect(inStockBadge).toBeInTheDocument()
      expect(lowStockBadge).toBeInTheDocument()
      expect(outOfStockBadge).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ProductList />)

      const searchForm = document.querySelector('form')
      expect(searchForm).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(<ProductList />)

      const searchInput = screen.getByPlaceholderText(/search products/i)
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('should have proper button roles', () => {
      render(<ProductList />)

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /low stock/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /age restricted/i })).toBeInTheDocument()
    })

    it('should have proper table structure', () => {
      render(<ProductList />)

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows
    })
  })

  describe('Edge Cases', () => {
    it('should handle products with missing optional fields', () => {
      const incompleteProduct = {
        ...mockProductsData.products[0],
        category: null,
        imageUrl: null,
        minStockLevel: 0
      }

      mockUseProducts.mockReturnValue({
        data: {
          products: [incompleteProduct],
          total: 1,
          totalPages: 1
        },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.getByText('Marlboro Red Pack')).toBeInTheDocument()
      expect(screen.queryByText('(min:')).not.toBeInTheDocument()
    })

    it('should handle zero stock correctly', () => {
      render(<ProductList />)

      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })

    it('should handle price formatting edge cases', () => {
      const productWithLargePrice = {
        ...mockProductsData.products[0],
        price: 1234.56
      }

      mockUseProducts.mockReturnValue({
        data: {
          products: [productWithLargePrice],
          total: 1,
          totalPages: 1
        },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      } as any)

      render(<ProductList />)

      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })
  })
})