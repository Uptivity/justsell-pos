import { ProductService } from '../../../shared/services/products'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  }
}))

import { api } from '../../../shared/services/api'
const mockedApi = api as jest.Mocked<typeof api>

describe('Product Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should get products with filters', async () => {
    const mockResponse = {
      products: [
        { id: 'prod-1', name: 'Product 1' },
        { id: 'prod-2', name: 'Product 2' }
      ],
      total: 2,
      page: 1,
      pageSize: 50,
      totalPages: 1
    }

    mockedApi.get.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await ProductService.getProducts()

    expect(result).toEqual(mockResponse)
    expect(mockedApi.get).toHaveBeenCalledWith('/products?page=1&pageSize=50')
  })

  it('should get product by ID', async () => {
    const mockProduct = {
      id: 'prod-123',
      name: 'Test Product',
      sku: 'TEST-001',
      price: 19.99
    }

    mockedApi.get.mockResolvedValueOnce({
      data: mockProduct
    })

    const result = await ProductService.getProductById('prod-123')

    expect(result).toEqual(mockProduct)
    expect(mockedApi.get).toHaveBeenCalledWith('/products/prod-123')
  })

  it('should create product', async () => {
    const productData = {
      name: 'New Product',
      sku: 'NEW-001',
      price: 29.99,
      quantity: 100,
      minStockLevel: 10,
      isSyntheticNicotine: false,
      ageRestricted: true
    }

    const mockResponse = {
      id: 'prod-new',
      ...productData
    }

    mockedApi.post.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await ProductService.createProduct(productData)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.post).toHaveBeenCalledWith('/products', productData)
  })

  it('should update product', async () => {
    const updateData = {
      id: 'prod-123',
      price: 24.99,
      quantity: 75
    }

    const mockResponse = {
      ...updateData,
      name: 'Updated Product'
    }

    mockedApi.put.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await ProductService.updateProduct(updateData)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.put).toHaveBeenCalledWith('/products/prod-123', {
      price: 24.99,
      quantity: 75
    })
  })

  it('should delete product', async () => {
    mockedApi.delete.mockResolvedValueOnce(undefined)

    await ProductService.deleteProduct('prod-123')

    expect(mockedApi.delete).toHaveBeenCalledWith('/products/prod-123')
  })

  it('should update stock', async () => {
    const mockResponse = {
      id: 'prod-123',
      quantity: 85,
      name: 'Test Product'
    }

    mockedApi.patch.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await ProductService.updateStock('prod-123', 85)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.patch).toHaveBeenCalledWith('/products/prod-123/stock', { quantity: 85 })
  })

  it('should bulk update stock', async () => {
    const updates = [
      { id: 'prod-1', quantity: 50 },
      { id: 'prod-2', quantity: 75 }
    ]

    const mockResponse = [
      { id: 'prod-1', quantity: 50 },
      { id: 'prod-2', quantity: 75 }
    ]

    mockedApi.patch.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await ProductService.bulkUpdateStock(updates)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.patch).toHaveBeenCalledWith('/products/bulk-stock', { updates })
  })

  describe('Missing Method Coverage', () => {
    it('should search product by code successfully', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '123456789'
      }

      mockedApi.get.mockResolvedValueOnce({
        data: mockProduct
      })

      const result = await ProductService.searchProductByCode('TEST-001')

      expect(result).toEqual(mockProduct)
      expect(mockedApi.get).toHaveBeenCalledWith('/products/search/TEST-001')
    })

    it('should return null when product code not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Product not found'))

      const result = await ProductService.searchProductByCode('INVALID-CODE')

      expect(result).toBeNull()
      expect(mockedApi.get).toHaveBeenCalledWith('/products/search/INVALID-CODE')
    })

    it('should search product by code with special characters', async () => {
      const codeWithSpaces = 'TEST 001'
      const encodedCode = 'TEST%20001'

      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        sku: codeWithSpaces
      }

      mockedApi.get.mockResolvedValueOnce({
        data: mockProduct
      })

      const result = await ProductService.searchProductByCode(codeWithSpaces)

      expect(result).toEqual(mockProduct)
      expect(mockedApi.get).toHaveBeenCalledWith(`/products/search/${encodedCode}`)
    })

    it('should get low stock products', async () => {
      const mockLowStockProducts = [
        { id: 'prod-1', name: 'Low Stock 1', quantity: 2, minStockLevel: 10 },
        { id: 'prod-2', name: 'Low Stock 2', quantity: 5, minStockLevel: 20 }
      ]

      mockedApi.get.mockResolvedValueOnce({
        data: mockLowStockProducts
      })

      const result = await ProductService.getLowStockProducts()

      expect(result).toEqual(mockLowStockProducts)
      expect(mockedApi.get).toHaveBeenCalledWith('/products/low-stock')
    })

    it('should get product categories', async () => {
      const mockCategories = ['Vapes', 'E-liquids', 'Accessories', 'Tobacco']

      mockedApi.get.mockResolvedValueOnce({
        data: mockCategories
      })

      const result = await ProductService.getProductCategories()

      expect(result).toEqual(mockCategories)
      expect(mockedApi.get).toHaveBeenCalledWith('/products/categories')
    })

    it('should get product vendors', async () => {
      const mockVendors = ['JUUL', 'Vuse', 'IQOS', 'Puff Bar']

      mockedApi.get.mockResolvedValueOnce({
        data: mockVendors
      })

      const result = await ProductService.getProductVendors()

      expect(result).toEqual(mockVendors)
      expect(mockedApi.get).toHaveBeenCalledWith('/products/vendors')
    })
  })

  describe('Filter Handling', () => {
    it('should get products with complex filters', async () => {
      const filters = {
        category: 'Vapes',
        vendor: 'JUUL',
        ageRestricted: true,
        lowStock: false,
        search: 'mint',
        isActive: true
      }

      const mockResponse = {
        products: [{ id: 'prod-1', name: 'JUUL Mint Pod' }],
        total: 1,
        page: 2,
        pageSize: 25,
        totalPages: 1
      }

      mockedApi.get.mockResolvedValueOnce({
        data: mockResponse
      })

      const result = await ProductService.getProducts(filters, 2, 25)

      expect(result).toEqual(mockResponse)
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/products?page=2&pageSize=25&category=Vapes&vendor=JUUL&ageRestricted=true&lowStock=false&search=mint&isActive=true'
      )
    })

    it('should handle empty string and undefined filters', async () => {
      const filters = {
        category: '',
        vendor: undefined,
        search: 'test'
      }

      const mockResponse = {
        products: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0
      }

      mockedApi.get.mockResolvedValueOnce({
        data: mockResponse
      })

      const result = await ProductService.getProducts(filters)

      expect(result).toEqual(mockResponse)
      // Empty string and undefined should be filtered out
      expect(mockedApi.get).toHaveBeenCalledWith('/products?page=1&pageSize=50&search=test')
    })

    it('should handle no filters provided', async () => {
      const mockResponse = {
        products: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0
      }

      mockedApi.get.mockResolvedValueOnce({
        data: mockResponse
      })

      const result = await ProductService.getProducts()

      expect(result).toEqual(mockResponse)
      expect(mockedApi.get).toHaveBeenCalledWith('/products?page=1&pageSize=50')
    })
  })

  describe('Error Handling', () => {
    it('should propagate API errors for getProducts', async () => {
      const apiError = new Error('API Error')
      mockedApi.get.mockRejectedValueOnce(apiError)

      await expect(ProductService.getProducts()).rejects.toThrow('API Error')
    })

    it('should propagate API errors for getProductById', async () => {
      const apiError = new Error('Product not found')
      mockedApi.get.mockRejectedValueOnce(apiError)

      await expect(ProductService.getProductById('invalid-id')).rejects.toThrow('Product not found')
    })

    it('should propagate API errors for createProduct', async () => {
      const apiError = new Error('Validation failed')
      mockedApi.post.mockRejectedValueOnce(apiError)

      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 19.99,
        quantity: 100,
        minStockLevel: 10,
        isSyntheticNicotine: false,
        ageRestricted: true
      }

      await expect(ProductService.createProduct(productData)).rejects.toThrow('Validation failed')
    })

    it('should propagate API errors for updateProduct', async () => {
      const apiError = new Error('Update failed')
      mockedApi.put.mockRejectedValueOnce(apiError)

      const updateData = {
        id: 'prod-123',
        price: 24.99
      }

      await expect(ProductService.updateProduct(updateData)).rejects.toThrow('Update failed')
    })

    it('should propagate API errors for deleteProduct', async () => {
      const apiError = new Error('Delete failed')
      mockedApi.delete.mockRejectedValueOnce(apiError)

      await expect(ProductService.deleteProduct('prod-123')).rejects.toThrow('Delete failed')
    })

    it('should propagate API errors for updateStock', async () => {
      const apiError = new Error('Stock update failed')
      mockedApi.patch.mockRejectedValueOnce(apiError)

      await expect(ProductService.updateStock('prod-123', 50)).rejects.toThrow('Stock update failed')
    })

    it('should propagate API errors for bulkUpdateStock', async () => {
      const apiError = new Error('Bulk update failed')
      mockedApi.patch.mockRejectedValueOnce(apiError)

      const updates = [{ id: 'prod-1', quantity: 50 }]

      await expect(ProductService.bulkUpdateStock(updates)).rejects.toThrow('Bulk update failed')
    })

    it('should propagate API errors for getLowStockProducts', async () => {
      const apiError = new Error('Low stock query failed')
      mockedApi.get.mockRejectedValueOnce(apiError)

      await expect(ProductService.getLowStockProducts()).rejects.toThrow('Low stock query failed')
    })

    it('should propagate API errors for getProductCategories', async () => {
      const apiError = new Error('Categories query failed')
      mockedApi.get.mockRejectedValueOnce(apiError)

      await expect(ProductService.getProductCategories()).rejects.toThrow('Categories query failed')
    })

    it('should propagate API errors for getProductVendors', async () => {
      const apiError = new Error('Vendors query failed')
      mockedApi.get.mockRejectedValueOnce(apiError)

      await expect(ProductService.getProductVendors()).rejects.toThrow('Vendors query failed')
    })
  })
})