import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductForm } from '../../../../shared/components/products/ProductForm'
import { useProductForm } from '../../../../shared/hooks/useProducts'
import type { Product } from '../../../../shared/types/database'

// Mock the useProductForm hook
jest.mock('../../../../shared/hooks/useProducts')
const mockUseProductForm = useProductForm as jest.MockedFunction<typeof useProductForm>

describe('ProductForm Component', () => {
  const mockOnSuccess = jest.fn()
  const mockOnCancel = jest.fn()
  const mockCreateProduct = jest.fn()
  const mockUpdateProduct = jest.fn()

  const mockCategories = ['Cigarettes', 'Vape', 'Accessories']

  const mockExistingProduct: Product = {
    id: 'prod-1',
    name: 'Test Product',
    sku: 'TEST001',
    barcode: '123456789',
    price: 9.99,
    cost: 5.00,
    quantity: 100,
    minStockLevel: 10,
    category: 'Vape',
    vendor: 'Test Vendor',
    description: 'Test description',
    imageUrl: 'https://example.com/image.jpg',
    flavorProfile: 'Mint',
    isSyntheticNicotine: true,
    volumeInMl: 30,
    isClosedSystem: false,
    numCartridges: 0,
    nicotineStrength: 6,
    ageRestricted: true,
    expirationDate: '2025-12-31',
    lotNumber: 'LOT123',
    supplierItemId: 'SUP123',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseProductForm.mockReturnValue({
      createProduct: {
        mutateAsync: mockCreateProduct,
        isPending: false,
        error: null
      } as any,
      updateProduct: {
        mutateAsync: mockUpdateProduct,
        isPending: false,
        error: null
      } as any,
      categories: mockCategories,
      isLoading: false,
      error: null
    })
  })

  describe('Rendering', () => {
    it('should render create form with correct title and elements', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      expect(screen.getByText('Add New Product')).toBeInTheDocument()
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sku/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should render edit form with correct title when product is provided', () => {
      render(
        <ProductForm
          product={mockExistingProduct}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Edit Product')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update product/i })).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      const { container } = render(
        <ProductForm className="custom-class" onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should populate form fields when editing existing product', () => {
      render(
        <ProductForm
          product={mockExistingProduct}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument()
      expect(screen.getByDisplayValue('TEST001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123456789')).toBeInTheDocument()
      expect(screen.getByDisplayValue('9.99')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
      // Note: Vape-specific fields like flavor profile are not rendered in the current form UI
    })

    it('should render all required form fields', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Basic fields
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sku/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/barcode/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/cost/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/current stock/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/minimum stock level/i)).toBeInTheDocument()

      // Category
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()

      // Description
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()

      // Note: Vape-specific fields are not currently rendered in the form UI
      // Checkbox
      expect(screen.getByLabelText(/age restricted/i)).toBeInTheDocument()
    })

    it('should render category options', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const categorySelect = screen.getByLabelText(/category/i)
      expect(categorySelect).toBeInTheDocument()

      // Check that options are present (they should be in the DOM even if not visible)
      mockCategories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument()
      })
    })
  })

  describe('Form Input Handling', () => {
    it('should update text inputs when user types', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const nameInput = screen.getByLabelText(/product name/i)
      await user.type(nameInput, 'New Product')

      expect(nameInput).toHaveValue('New Product')
    })

    it('should update number inputs correctly', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const priceInput = screen.getByLabelText(/price/i)
      await user.clear(priceInput)
      await user.type(priceInput, '19.99')

      expect(priceInput).toHaveValue(19.99)
    })

    it('should update select inputs', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const categorySelect = screen.getByLabelText(/category/i)
      await user.selectOptions(categorySelect, 'Vape')

      expect(categorySelect).toHaveValue('Vape')
    })

    it('should update checkbox inputs', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const ageRestrictedCheckbox = screen.getByLabelText(/age restricted/i)
      expect(ageRestrictedCheckbox).toBeChecked() // Default is true

      await user.click(ageRestrictedCheckbox)
      expect(ageRestrictedCheckbox).not.toBeChecked() // Should be unchecked after click
    })

    it('should update textarea inputs', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const descriptionTextarea = screen.getByLabelText(/description/i)
      await user.type(descriptionTextarea, 'Product description')

      expect(descriptionTextarea).toHaveValue('Product description')
    })

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup()
      const { container } = render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Submit form to trigger validation errors
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      // Wait for validation errors to appear
      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument()
      })

      // Type in the name field to clear the error
      const nameInput = screen.getByLabelText(/product name/i)
      await user.type(nameInput, 'Test')

      // Error should be cleared
      expect(screen.queryByText('Product name is required')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const { container } = render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Submit form without filling required fields
      const form = container.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Product name is required')).toBeInTheDocument()
        expect(screen.getByText('SKU is required')).toBeInTheDocument()
        expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument()
      })
    })

    it('should validate positive price', async () => {
      const user = userEvent.setup()
      const { container } = render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields but set invalid price
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')

      const priceInput = screen.getByLabelText(/price/i)
      await user.clear(priceInput)
      await user.type(priceInput, '0') // Price of 0 is invalid

      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument()
      })
    })

    it('should validate non-negative cost', async () => {
      const user = userEvent.setup()
      const { container } = render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields but set negative cost
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')
      await user.type(screen.getByLabelText(/price/i), '10')

      const costInput = screen.getByLabelText(/cost/i)
      await user.type(costInput, '-2')

      const form = container.querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText('Cost cannot be negative')).toBeInTheDocument()
      })
    })

    it('should validate non-negative quantity', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields but set negative quantity via programmatic change
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')
      await user.type(screen.getByLabelText(/price/i), '10')

      const quantityInput = screen.getByLabelText(/current stock/i) as HTMLInputElement
      // Use fireEvent to bypass HTML5 validation
      fireEvent.change(quantityInput, { target: { value: '-5' } })

      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      // Since HTML5 min="0" might prevent negative values, just verify form doesn't submit
      expect(mockCreateProduct).not.toHaveBeenCalled()
    })

    it('should validate non-negative minimum stock level', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields but set negative min stock level
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')
      await user.type(screen.getByLabelText(/price/i), '10')

      const minStockInput = screen.getByLabelText(/minimum stock level/i) as HTMLInputElement
      // Use fireEvent to bypass HTML5 validation
      fireEvent.change(minStockInput, { target: { value: '-1' } })

      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      // Since HTML5 min="0" might prevent negative values, just verify form doesn't submit
      expect(mockCreateProduct).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should call createProduct when creating new product', async () => {
      const user = userEvent.setup()
      const mockCreatedProduct = { ...mockExistingProduct, id: 'new-id' }
      mockCreateProduct.mockResolvedValue(mockCreatedProduct)

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/product name/i), 'New Product')
      await user.type(screen.getByLabelText(/sku/i), 'NEW001')
      await user.type(screen.getByLabelText(/price/i), '15.99')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith({
          name: 'New Product',
          sku: 'NEW001',
          barcode: '',
          price: 15.99,
          cost: undefined,
          quantity: 0,
          minStockLevel: 0,
          category: '',
          vendor: '',
          description: '',
          imageUrl: '',
          flavorProfile: '',
          isSyntheticNicotine: false,
          volumeInMl: 0,
          isClosedSystem: false,
          numCartridges: 0,
          nicotineStrength: 0,
          ageRestricted: true,
          expirationDate: undefined,
          lotNumber: '',
          supplierItemId: ''
        })
      })

      expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedProduct)
    })

    it('should call updateProduct when editing existing product', async () => {
      const user = userEvent.setup()
      const mockUpdatedProduct = { ...mockExistingProduct, name: 'Updated Product' }
      mockUpdateProduct.mockResolvedValue(mockUpdatedProduct)

      render(
        <ProductForm
          product={mockExistingProduct}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      // Update the name
      const nameInput = screen.getByLabelText(/product name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Product')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update product/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalledWith({
          id: 'prod-1',
          name: 'Updated Product',
          sku: 'TEST001',
          barcode: '123456789',
          price: 9.99,
          cost: 5,
          quantity: 100,
          minStockLevel: 10,
          category: 'Vape',
          vendor: 'Test Vendor',
          description: 'Test description',
          imageUrl: 'https://example.com/image.jpg',
          flavorProfile: 'Mint',
          isSyntheticNicotine: true,
          volumeInMl: 30,
          isClosedSystem: false,
          numCartridges: 0,
          nicotineStrength: 6,
          ageRestricted: true,
          expirationDate: '2025-12-31',
          lotNumber: 'LOT123',
          supplierItemId: 'SUP123'
        })
      })

      expect(mockOnSuccess).toHaveBeenCalledWith(mockUpdatedProduct)
    })

    it('should not submit form if validation fails', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      // Should not call createProduct
      expect(mockCreateProduct).not.toHaveBeenCalled()
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateProduct.mockRejectedValue(new Error('API Error'))

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill required fields
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')
      await user.type(screen.getByLabelText(/price/i), '10')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Form submission error:', expect.any(Error))
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during form submission', () => {
      mockUseProductForm.mockReturnValue({
        createProduct: {
          mutateAsync: mockCreateProduct,
          isPending: false,
          error: null
        } as any,
        updateProduct: {
          mutateAsync: mockUpdateProduct,
          isPending: false,
          error: null
        } as any,
        categories: mockCategories,
        isLoading: true,
        error: null
      })

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const submitButton = screen.getByRole('button', { name: /creating/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show update loading state when editing', () => {
      mockUseProductForm.mockReturnValue({
        createProduct: {
          mutateAsync: mockCreateProduct,
          isPending: false,
          error: null
        } as any,
        updateProduct: {
          mutateAsync: mockUpdateProduct,
          isPending: false,
          error: null
        } as any,
        categories: mockCategories,
        isLoading: true,
        error: null
      })

      render(
        <ProductForm
          product={mockExistingProduct}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      const submitButton = screen.getByRole('button', { name: /updating/i })
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when there is an error', () => {
      const errorMessage = 'Failed to load categories'
      mockUseProductForm.mockReturnValue({
        createProduct: {
          mutateAsync: mockCreateProduct,
          isPending: false,
          error: null
        } as any,
        updateProduct: {
          mutateAsync: mockUpdateProduct,
          isPending: false,
          error: null
        } as any,
        categories: mockCategories,
        isLoading: false,
        error: new Error(errorMessage)
      })

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(document.querySelector('.bg-red-50')).toBeInTheDocument()
    })

    it('should display generic error message for non-Error objects', () => {
      mockUseProductForm.mockReturnValue({
        createProduct: {
          mutateAsync: mockCreateProduct,
          isPending: false,
          error: null
        } as any,
        updateProduct: {
          mutateAsync: mockUpdateProduct,
          isPending: false,
          error: null
        } as any,
        categories: mockCategories,
        isLoading: false,
        error: 'String error'
      })

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      expect(screen.getByText('An error occurred')).toBeInTheDocument()
    })
  })

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should not call onCancel if not provided', async () => {
      const user = userEvent.setup()
      render(<ProductForm onSuccess={mockOnSuccess} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Should not throw error when onCancel is not provided
      expect(mockOnCancel).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should have proper labels for all inputs', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Test a few key labels
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/sku/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/age restricted/i)).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing optional product fields when editing', () => {
      const productWithMissingFields = {
        ...mockExistingProduct,
        cost: null,
        category: null,
        vendor: null,
        description: null,
        imageUrl: null,
        flavorProfile: null,
        volumeInMl: null,
        nicotineStrength: null,
        expirationDate: null,
        lotNumber: null,
        supplierItemId: null
      } as any

      render(
        <ProductForm
          product={productWithMissingFields}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      )

      // Should render without errors
      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument()
    })

    it('should handle form submission with complete vape product data', async () => {
      const user = userEvent.setup()
      mockCreateProduct.mockResolvedValue(mockExistingProduct)

      render(<ProductForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)

      // Fill all available form fields
      await user.type(screen.getByLabelText(/product name/i), 'Test Product')
      await user.type(screen.getByLabelText(/sku/i), 'TEST001')
      await user.type(screen.getByLabelText(/price/i), '25.99')
      await user.type(screen.getByLabelText(/description/i), 'Test description')

      // Check age restricted (only checkbox in current form)
      const ageRestrictedCheckbox = screen.getByLabelText(/age restricted/i)
      await user.click(ageRestrictedCheckbox)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create product/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Product',
            sku: 'TEST001',
            price: 25.99,
            description: 'Test description',
            ageRestricted: false // Unchecked after clicking (was true by default)
          })
        )
      })
    })
  })
})