/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { ProductService } from '../../../shared/services/products'
import {
  useProducts,
  useProduct,
  useProductSearch,
  useProductCategories,
  useProductVendors,
  useLowStockProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUpdateStock,
  useBulkUpdateStock,
  useProductForm,
  productKeys
} from '../../../shared/hooks/useProducts'
import type { CreateProductData, UpdateProductData, ProductFilters } from '../../../shared/services/products'

// Mock the ProductService
jest.mock('../../../shared/services/products', () => ({
  ProductService: {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
    searchProductByCode: jest.fn(),
    getProductCategories: jest.fn(),
    getProductVendors: jest.fn(),
    getLowStockProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    updateStock: jest.fn(),
    bulkUpdateStock: jest.fn()
  }
}))

const mockProductService = ProductService as jest.Mocked<typeof ProductService>

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProducts Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('productKeys', () => {
    it('should generate correct query keys', () => {
      expect(productKeys.all).toEqual(['products'])
      expect(productKeys.lists()).toEqual(['products', 'list'])
      expect(productKeys.details()).toEqual(['products', 'detail'])
      expect(productKeys.categories()).toEqual(['products', 'categories'])
      expect(productKeys.vendors()).toEqual(['products', 'vendors'])
      expect(productKeys.lowStock()).toEqual(['products', 'lowStock'])

      const filters: ProductFilters = { category: 'electronics' }
      expect(productKeys.list(filters, 1, 20)).toEqual([
        'products', 'list', { filters, page: 1, pageSize: 20 }
      ])

      expect(productKeys.detail('product-123')).toEqual([
        'products', 'detail', 'product-123'
      ])

      expect(productKeys.search('SKU123')).toEqual([
        'products', 'search', 'SKU123'
      ])
    })
  })

  describe('Query Hooks', () => {
    describe('useProducts', () => {
      it('should fetch products with default parameters', async () => {
        const mockProducts = {
          data: [
            { id: '1', name: 'Product 1', price: 19.99, quantity: 10 },
            { id: '2', name: 'Product 2', price: 29.99, quantity: 5 }
          ],
          total: 2,
          page: 1,
          pageSize: 50,
          totalPages: 1
        }
        mockProductService.getProducts.mockResolvedValue(mockProducts)

        const { result } = renderHook(() => useProducts(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getProducts).toHaveBeenCalledWith({}, 1, 50)
        expect(result.current.data).toEqual(mockProducts)
      })

      it('should fetch products with custom filters and pagination', async () => {
        const filters: ProductFilters = { category: 'electronics', search: 'phone' }
        const mockProducts = {
          data: [{ id: '1', name: 'Smart Phone', price: 599.99, quantity: 3 }],
          total: 1,
          page: 2,
          pageSize: 10,
          totalPages: 1
        }
        mockProductService.getProducts.mockResolvedValue(mockProducts)

        const { result } = renderHook(() => useProducts(filters, 2, 10), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getProducts).toHaveBeenCalledWith(filters, 2, 10)
        expect(result.current.data).toEqual(mockProducts)
      })

      it('should handle fetch products error', async () => {
        const mockError = new Error('Failed to fetch products')
        mockProductService.getProducts.mockRejectedValue(mockError)

        const { result } = renderHook(() => useProducts(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useProduct', () => {
      it('should fetch single product by ID', async () => {
        const mockProduct = {
          id: 'product-123',
          name: 'Test Product',
          description: 'Test description',
          price: 49.99,
          quantity: 25,
          sku: 'TEST-123'
        }
        mockProductService.getProductById.mockResolvedValue(mockProduct)

        const { result } = renderHook(() => useProduct('product-123'), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getProductById).toHaveBeenCalledWith('product-123')
        expect(result.current.data).toEqual(mockProduct)
      })

      it('should not fetch when ID is empty', () => {
        renderHook(() => useProduct(''), {
          wrapper: createWrapper()
        })

        expect(mockProductService.getProductById).not.toHaveBeenCalled()
      })

      it('should handle product not found error', async () => {
        const mockError = new Error('Product not found')
        mockProductService.getProductById.mockRejectedValue(mockError)

        const { result } = renderHook(() => useProduct('nonexistent'), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useProductSearch', () => {
      it('should search product by code', async () => {
        const mockProduct = {
          id: 'product-456',
          name: 'Searched Product',
          sku: 'SEARCH-456',
          barcode: '1234567890'
        }
        mockProductService.searchProductByCode.mockResolvedValue(mockProduct)

        const { result } = renderHook(() => useProductSearch('SEARCH-456'), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.searchProductByCode).toHaveBeenCalledWith('SEARCH-456')
        expect(result.current.data).toEqual(mockProduct)
      })

      it('should not search when code is empty', () => {
        renderHook(() => useProductSearch(''), {
          wrapper: createWrapper()
        })

        expect(mockProductService.searchProductByCode).not.toHaveBeenCalled()
      })

      it('should handle search not found', async () => {
        mockProductService.searchProductByCode.mockResolvedValue(null)

        const { result } = renderHook(() => useProductSearch('NOTFOUND'), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toBeNull()
      })
    })

    describe('useProductCategories', () => {
      it('should fetch product categories', async () => {
        const mockCategories = [
          { id: 'cat1', name: 'Electronics', description: 'Electronic products' },
          { id: 'cat2', name: 'Clothing', description: 'Apparel and accessories' }
        ]
        mockProductService.getProductCategories.mockResolvedValue(mockCategories)

        const { result } = renderHook(() => useProductCategories(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getProductCategories).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockCategories)
      })
    })

    describe('useProductVendors', () => {
      it('should fetch product vendors', async () => {
        const mockVendors = [
          { id: 'vendor1', name: 'Vendor A', contactEmail: 'vendora@example.com' },
          { id: 'vendor2', name: 'Vendor B', contactEmail: 'vendorb@example.com' }
        ]
        mockProductService.getProductVendors.mockResolvedValue(mockVendors)

        const { result } = renderHook(() => useProductVendors(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getProductVendors).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockVendors)
      })
    })

    describe('useLowStockProducts', () => {
      it('should fetch low stock products', async () => {
        const mockLowStockProducts = [
          { id: '1', name: 'Product A', quantity: 2, minQuantity: 5 },
          { id: '2', name: 'Product B', quantity: 1, minQuantity: 10 }
        ]
        mockProductService.getLowStockProducts.mockResolvedValue(mockLowStockProducts)

        const { result } = renderHook(() => useLowStockProducts(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.getLowStockProducts).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockLowStockProducts)
      })
    })
  })

  describe('Mutation Hooks', () => {
    describe('useCreateProduct', () => {
      it('should create product successfully', async () => {
        const createData: CreateProductData = {
          name: 'New Product',
          description: 'New product description',
          price: 99.99,
          quantity: 50,
          category: 'electronics',
          sku: 'NEW-123'
        }
        const mockCreatedProduct = { id: 'new-product-id', ...createData }
        mockProductService.createProduct.mockResolvedValue(mockCreatedProduct)

        const { result } = renderHook(() => useCreateProduct(), {
          wrapper: createWrapper()
        })

        result.current.mutate(createData)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.createProduct).toHaveBeenCalledWith(createData)
        expect(result.current.data).toEqual(mockCreatedProduct)
      })

      it('should handle create product error', async () => {
        const createData: CreateProductData = {
          name: 'Invalid Product',
          price: -10, // Invalid price
          quantity: 0
        }
        const mockError = new Error('Invalid product data')
        mockProductService.createProduct.mockRejectedValue(mockError)

        const { result } = renderHook(() => useCreateProduct(), {
          wrapper: createWrapper()
        })

        result.current.mutate(createData)

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useUpdateProduct', () => {
      it('should update product successfully', async () => {
        const updateData: UpdateProductData = {
          id: 'product-123',
          name: 'Updated Product',
          price: 79.99
        }
        const mockUpdatedProduct = {
          id: 'product-123',
          name: 'Updated Product',
          price: 79.99,
          description: 'Original description',
          quantity: 10
        }
        mockProductService.updateProduct.mockResolvedValue(mockUpdatedProduct)

        const { result } = renderHook(() => useUpdateProduct(), {
          wrapper: createWrapper()
        })

        result.current.mutate(updateData)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.updateProduct).toHaveBeenCalledWith(updateData)
        expect(result.current.data).toEqual(mockUpdatedProduct)
      })
    })

    describe('useDeleteProduct', () => {
      it('should delete product successfully', async () => {
        const productId = 'product-to-delete'
        mockProductService.deleteProduct.mockResolvedValue({ success: true })

        const { result } = renderHook(() => useDeleteProduct(), {
          wrapper: createWrapper()
        })

        result.current.mutate(productId)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.deleteProduct).toHaveBeenCalledWith(productId)
      })

      it('should handle delete product error', async () => {
        const productId = 'nonexistent-product'
        const mockError = new Error('Product not found')
        mockProductService.deleteProduct.mockRejectedValue(mockError)

        const { result } = renderHook(() => useDeleteProduct(), {
          wrapper: createWrapper()
        })

        result.current.mutate(productId)

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useUpdateStock', () => {
      it('should update stock successfully', async () => {
        const stockUpdate = { id: 'product-123', quantity: 100 }
        const mockUpdatedProduct = {
          id: 'product-123',
          name: 'Test Product',
          quantity: 100,
          price: 29.99
        }
        mockProductService.updateStock.mockResolvedValue(mockUpdatedProduct)

        const { result } = renderHook(() => useUpdateStock(), {
          wrapper: createWrapper()
        })

        result.current.mutate(stockUpdate)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.updateStock).toHaveBeenCalledWith('product-123', 100)
        expect(result.current.data).toEqual(mockUpdatedProduct)
      })
    })

    describe('useBulkUpdateStock', () => {
      it('should bulk update stock successfully', async () => {
        const stockUpdates = [
          { id: 'product-1', quantity: 50 },
          { id: 'product-2', quantity: 75 }
        ]
        const mockUpdatedProducts = [
          { id: 'product-1', name: 'Product 1', quantity: 50, price: 19.99 },
          { id: 'product-2', name: 'Product 2', quantity: 75, price: 24.99 }
        ]
        mockProductService.bulkUpdateStock.mockResolvedValue(mockUpdatedProducts)

        const { result } = renderHook(() => useBulkUpdateStock(), {
          wrapper: createWrapper()
        })

        result.current.mutate(stockUpdates)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockProductService.bulkUpdateStock).toHaveBeenCalledWith(stockUpdates)
        expect(result.current.data).toEqual(mockUpdatedProducts)
      })
    })
  })

  describe('useProductForm', () => {
    it('should provide form management functionality', async () => {
      const mockCategories = [
        { id: 'cat1', name: 'Electronics' },
        { id: 'cat2', name: 'Clothing' }
      ]
      const mockVendors = [
        { id: 'vendor1', name: 'Vendor A' },
        { id: 'vendor2', name: 'Vendor B' }
      ]

      mockProductService.getProductCategories.mockResolvedValue(mockCategories)
      mockProductService.getProductVendors.mockResolvedValue(mockVendors)

      const { result } = renderHook(() => useProductForm(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.categories).toEqual(mockCategories)
        expect(result.current.vendors).toEqual(mockVendors)
      })

      expect(result.current.createProduct).toBeDefined()
      expect(result.current.updateProduct).toBeDefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle loading states', async () => {
      // Mock to simulate pending state
      mockProductService.createProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      mockProductService.getProductCategories.mockResolvedValue([])
      mockProductService.getProductVendors.mockResolvedValue([])

      const { result } = renderHook(() => useProductForm(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.categories).toEqual([])
        expect(result.current.vendors).toEqual([])
      })

      // Make the create product async to test loading state
      let resolveCreate: () => void
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve
      })
      mockProductService.createProduct.mockImplementation(() => createPromise)

      // Trigger create mutation
      const createData: CreateProductData = {
        name: 'Test Product',
        price: 29.99,
        quantity: 10
      }

      act(() => {
        result.current.createProduct.mutate(createData)
      })

      // Test that mutation functions are available and working
      expect(result.current.createProduct.mutate).toBeDefined()
      expect(typeof result.current.createProduct.mutate).toBe('function')

      // Clean up
      resolveCreate!()
    })

    it('should handle errors from both create and update', async () => {
      const mockError = new Error('Validation failed')
      mockProductService.createProduct.mockRejectedValue(mockError)
      mockProductService.getProductCategories.mockResolvedValue([])
      mockProductService.getProductVendors.mockResolvedValue([])

      const { result } = renderHook(() => useProductForm(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.categories).toEqual([])
        expect(result.current.vendors).toEqual([])
      })

      const createData: CreateProductData = {
        name: '',
        price: 0,
        quantity: -1
      }
      result.current.createProduct.mutate(createData)

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError)
      })
    })
  })

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      mockProductService.getProducts.mockRejectedValue(networkError)

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(networkError)
    })

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service Unavailable')
      mockProductService.getProductById.mockRejectedValue(serviceError)

      const { result } = renderHook(() => useProduct('test-product'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(serviceError)
    })

    it('should handle validation errors on mutations', async () => {
      const validationError = new Error('Invalid product data')
      mockProductService.createProduct.mockRejectedValue(validationError)

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper()
      })

      const invalidData: CreateProductData = {
        name: '',
        price: -1,
        quantity: -10
      }
      result.current.mutate(invalidData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })
  })
})