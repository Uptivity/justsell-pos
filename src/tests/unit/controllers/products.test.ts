import type { Request, Response } from 'express'
import {
  getProducts,
  getProductById,
  searchProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductCategories,
  getProductVendors,
  updateStock,
  bulkUpdateStock
} from '../../../api/controllers/products'
import { prisma } from '../../../shared/utils/database'
import { Decimal } from '@prisma/client/runtime/library'

// Mock Prisma
jest.mock('../../../shared/utils/database', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      fields: {
        minStockLevel: 'min_stock_level'
      }
    },
    $queryRaw: jest.fn(),
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Products Controller', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockJson: jest.Mock
  let mockStatus: jest.Mock
  let mockSend: jest.Mock

  beforeEach(() => {
    mockJson = jest.fn()
    mockStatus = jest.fn(() => ({ json: mockJson, send: mockSend }))
    mockSend = jest.fn()
    mockReq = {}
    mockRes = {
      json: mockJson,
      status: mockStatus,
      send: mockSend,
    }
    jest.clearAllMocks()
  })

  describe('getProducts', () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', sku: 'SKU1' },
      { id: '2', name: 'Product 2', sku: 'SKU2' }
    ]

    it('should get products with default pagination', async () => {
      mockReq.query = {}
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        products: mockProducts,
        total: 2,
        page: 1,
        pageSize: 50,
        totalPages: 1
      })
    })

    it('should get products with custom pagination', async () => {
      mockReq.query = { page: '2', pageSize: '10' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(25)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 10,
        take: 10,
        orderBy: { name: 'asc' }
      })
      expect(mockRes.json).toHaveBeenCalledWith({
        products: mockProducts,
        total: 25,
        page: 2,
        pageSize: 10,
        totalPages: 3
      })
    })

    it('should filter by category', async () => {
      mockReq.query = { category: 'Vapes' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true, category: 'Vapes' },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should filter by vendor', async () => {
      mockReq.query = { vendor: 'VendorA' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true, vendor: 'VendorA' },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should filter by age restricted products', async () => {
      mockReq.query = { ageRestricted: 'true' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true, ageRestricted: true },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should filter by low stock products', async () => {
      mockReq.query = { lowStock: 'true' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          quantity: { lte: 'min_stock_level' }
        },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should search products by text', async () => {
      mockReq.query = { search: 'test' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { sku: { contains: 'test', mode: 'insensitive' } },
            { barcode: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should filter inactive products', async () => {
      mockReq.query = { isActive: 'false' }
      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(2)

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        skip: 0,
        take: 50,
        orderBy: { name: 'asc' }
      })
    })

    it('should handle database errors', async () => {
      mockReq.query = {}
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      await getProducts(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch products',
        code: 'FETCH_PRODUCTS_ERROR'
      })
    })
  })

  describe('getProductById', () => {
    const mockProduct = { id: '1', name: 'Product 1', sku: 'SKU1' }

    it('should get product by ID successfully', async () => {
      mockReq.params = { id: '1' }
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct as any)

      await getProductById(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      })
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct)
    })

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: '999' }
      mockPrisma.product.findUnique.mockResolvedValue(null)

      await getProductById(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    })

    it('should handle database errors', async () => {
      mockReq.params = { id: '1' }
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      await getProductById(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch product',
        code: 'FETCH_PRODUCT_ERROR'
      })
    })
  })

  describe('searchProductByCode', () => {
    const mockProduct = { id: '1', name: 'Product 1', sku: 'SKU1' }

    it('should find product by SKU', async () => {
      mockReq.params = { code: 'SKU1' }
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct as any)

      await searchProductByCode(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { sku: 'SKU1' },
            { barcode: 'SKU1' }
          ],
          isActive: true
        }
      })
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct)
    })

    it('should return 404 when product not found by code', async () => {
      mockReq.params = { code: 'NOTFOUND' }
      mockPrisma.product.findFirst.mockResolvedValue(null)

      await searchProductByCode(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    })

    it('should handle database errors', async () => {
      mockReq.params = { code: 'SKU1' }
      mockPrisma.product.findFirst.mockRejectedValue(new Error('Database error'))

      await searchProductByCode(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to search product',
        code: 'SEARCH_PRODUCT_ERROR'
      })
    })
  })

  describe('createProduct', () => {
    const mockProduct = { id: '1', name: 'New Product', sku: 'NEW1' }
    const validProductData = {
      name: 'New Product',
      sku: 'NEW1',
      price: 19.99,
      quantity: 10
    }

    it('should create product successfully', async () => {
      mockReq.body = validProductData
      mockPrisma.product.findUnique.mockResolvedValue(null) // SKU doesn't exist
      mockPrisma.product.create.mockResolvedValue(mockProduct as any)

      await createProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { sku: 'NEW1' }
      })
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Product',
          sku: 'NEW1',
          price: new Decimal(19.99),
          quantity: 10,
          ageRestricted: true, // default value
          minStockLevel: 0
        })
      })
      expect(mockStatus).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct)
    })

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { name: 'Product' } // missing sku and price

      await createProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Name, SKU, and price are required',
        code: 'VALIDATION_ERROR'
      })
    })

    it('should return 409 when SKU already exists', async () => {
      mockReq.body = validProductData
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct as any) // SKU exists

      await createProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(409)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product with this SKU already exists',
        code: 'DUPLICATE_SKU'
      })
    })

    it('should handle optional fields correctly', async () => {
      const fullProductData = {
        ...validProductData,
        cost: 10.99,
        volumeInMl: 30,
        nicotineStrength: 6,
        barcode: 'BAR123',
        category: 'Vapes',
        vendor: 'VendorA',
        description: 'Test description',
        ageRestricted: false,
        isSyntheticNicotine: true
      }

      mockReq.body = fullProductData
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.create.mockResolvedValue(mockProduct as any)

      await createProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cost: new Decimal(10.99),
          volumeInMl: new Decimal(30),
          nicotineStrength: new Decimal(6),
          barcode: 'BAR123',
          category: 'Vapes',
          vendor: 'VendorA',
          description: 'Test description',
          ageRestricted: false,
          isSyntheticNicotine: true
        })
      })
    })

    it('should handle database errors', async () => {
      mockReq.body = validProductData
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      await createProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to create product',
        code: 'CREATE_PRODUCT_ERROR'
      })
    })
  })

  describe('updateProduct', () => {
    const existingProduct = { id: '1', name: 'Existing Product', sku: 'EXIST1' }
    const updateData = { name: 'Updated Product', price: 29.99 }

    it('should update product successfully', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = updateData
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct as any)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, ...updateData } as any)

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      })
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          name: 'Updated Product',
          price: new Decimal(29.99)
        })
      })
    })

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: '999' }
      mockReq.body = updateData
      mockPrisma.product.findUnique.mockResolvedValue(null)

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    })

    it('should check for SKU conflicts when updating SKU', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { sku: 'CONFLICT' }
      mockPrisma.product.findUnique
        .mockResolvedValueOnce(existingProduct as any) // First call - product exists
        .mockResolvedValueOnce({ id: '2', sku: 'CONFLICT' } as any) // Second call - SKU conflict

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(409)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product with this SKU already exists',
        code: 'DUPLICATE_SKU'
      })
    })

    it('should allow updating to same SKU', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { sku: 'EXIST1' } // Same SKU
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct as any)
      mockPrisma.product.update.mockResolvedValue(existingProduct as any)

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.update).toHaveBeenCalled()
      expect(mockStatus).not.toHaveBeenCalledWith(409)
    })

    it('should handle decimal field updates', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = {
        price: 29.99,
        cost: 15.50,
        volumeInMl: 30,
        nicotineStrength: 6
      }
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct as any)
      mockPrisma.product.update.mockResolvedValue(existingProduct as any)

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          price: new Decimal(29.99),
          cost: new Decimal(15.50),
          volumeInMl: new Decimal(30),
          nicotineStrength: new Decimal(6)
        })
      })
    })

    it('should handle database errors', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = updateData
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      await updateProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to update product',
        code: 'UPDATE_PRODUCT_ERROR'
      })
    })
  })

  describe('deleteProduct', () => {
    const existingProduct = { id: '1', name: 'Product', isActive: true }

    it('should soft delete product successfully', async () => {
      mockReq.params = { id: '1' }
      mockPrisma.product.findUnique.mockResolvedValue(existingProduct as any)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, isActive: false } as any)

      await deleteProduct(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false }
      })
      expect(mockStatus).toHaveBeenCalledWith(204)
      expect(mockSend).toHaveBeenCalled()
    })

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: '999' }
      mockPrisma.product.findUnique.mockResolvedValue(null)

      await deleteProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(404)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
    })

    it('should handle database errors', async () => {
      mockReq.params = { id: '1' }
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      await deleteProduct(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to delete product',
        code: 'DELETE_PRODUCT_ERROR'
      })
    })
  })

  describe('getLowStockProducts', () => {
    const mockLowStockProducts = [
      { id: '1', name: 'Low Stock Product 1', quantity: 2 },
      { id: '2', name: 'Low Stock Product 2', quantity: 0 }
    ]

    it('should get low stock products successfully', async () => {
      mockPrisma.$queryRaw.mockResolvedValue(mockLowStockProducts)

      await getLowStockProducts({} as Request, mockRes as Response)

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.anything())
      expect(mockRes.json).toHaveBeenCalledWith(mockLowStockProducts)
    })

    it('should handle database errors', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'))

      await getLowStockProducts({} as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch low stock products',
        code: 'FETCH_LOW_STOCK_ERROR'
      })
    })
  })

  describe('getProductCategories', () => {
    const mockCategoriesData = [
      { category: 'Vapes' },
      { category: 'E-liquids' },
      { category: 'Accessories' },
      { category: null }
    ]

    it('should get product categories successfully', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockCategoriesData as any)

      await getProductCategories({} as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          category: { not: null },
          isActive: true
        },
        select: { category: true },
        distinct: ['category']
      })
      expect(mockRes.json).toHaveBeenCalledWith(['Accessories', 'E-liquids', 'Vapes'])
    })

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      await getProductCategories({} as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch product categories',
        code: 'FETCH_CATEGORIES_ERROR'
      })
    })
  })

  describe('getProductVendors', () => {
    const mockVendorsData = [
      { vendor: 'VendorA' },
      { vendor: 'VendorB' },
      { vendor: 'VendorC' },
      { vendor: null }
    ]

    it('should get product vendors successfully', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockVendorsData as any)

      await getProductVendors({} as Request, mockRes as Response)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          vendor: { not: null },
          isActive: true
        },
        select: { vendor: true },
        distinct: ['vendor']
      })
      expect(mockRes.json).toHaveBeenCalledWith(['VendorA', 'VendorB', 'VendorC'])
    })

    it('should handle database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      await getProductVendors({} as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to fetch product vendors',
        code: 'FETCH_VENDORS_ERROR'
      })
    })
  })

  describe('updateStock', () => {
    const existingProduct = { id: '1', name: 'Product', quantity: 10 }

    it('should update stock successfully', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { quantity: 25 }
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, quantity: 25 } as any)

      await updateStock(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { quantity: 25 }
      })
      expect(mockRes.json).toHaveBeenCalledWith({ ...existingProduct, quantity: 25 })
    })

    it('should return 400 for invalid quantity', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { quantity: -5 }

      await updateStock(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid quantity',
        code: 'INVALID_QUANTITY'
      })
    })

    it('should return 400 for non-number quantity', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { quantity: 'invalid' }

      await updateStock(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid quantity',
        code: 'INVALID_QUANTITY'
      })
    })

    it('should handle database errors', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { quantity: 25 }
      mockPrisma.product.update.mockRejectedValue(new Error('Database error'))

      await updateStock(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to update stock',
        code: 'UPDATE_STOCK_ERROR'
      })
    })
  })

  describe('bulkUpdateStock', () => {
    const mockUpdates = [
      { id: '1', quantity: 10 },
      { id: '2', quantity: 20 }
    ]
    const mockUpdatedProducts = [
      { id: '1', quantity: 10 },
      { id: '2', quantity: 20 }
    ]

    it('should bulk update stock successfully', async () => {
      mockReq.body = { updates: mockUpdates }
      mockPrisma.product.update.mockResolvedValueOnce(mockUpdatedProducts[0] as any)
      mockPrisma.product.update.mockResolvedValueOnce(mockUpdatedProducts[1] as any)

      await bulkUpdateStock(mockReq as Request, mockRes as Response)

      expect(mockPrisma.product.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(1, {
        where: { id: '1' },
        data: { quantity: 10 }
      })
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(2, {
        where: { id: '2' },
        data: { quantity: 20 }
      })
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedProducts)
    })

    it('should return 400 when updates is not an array', async () => {
      mockReq.body = { updates: 'invalid' }

      await bulkUpdateStock(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(400)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Updates must be an array',
        code: 'INVALID_UPDATES'
      })
    })

    it('should handle database errors', async () => {
      mockReq.body = { updates: mockUpdates }
      mockPrisma.product.update.mockRejectedValue(new Error('Database error'))

      await bulkUpdateStock(mockReq as Request, mockRes as Response)

      expect(mockStatus).toHaveBeenCalledWith(500)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to bulk update stock',
        code: 'BULK_UPDATE_STOCK_ERROR'
      })
    })
  })
})