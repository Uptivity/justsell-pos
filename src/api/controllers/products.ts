import type { Request, Response } from 'express'
import { prisma } from '../../shared/utils/database'
import type { CreateProductData } from '../../shared/services/products'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Get all products with filtering and pagination
 * GET /api/products
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      pageSize = '50',
      category,
      vendor,
      ageRestricted,
      lowStock,
      search,
      isActive = 'true'
    } = req.query as Record<string, string>

    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    // Build where clause
    const where: any = {
      isActive: isActive === 'true'
    }

    if (category) {
      where.category = category
    }

    if (vendor) {
      where.vendor = vendor
    }

    if (ageRestricted !== undefined) {
      where.ageRestricted = ageRestricted === 'true'
    }

    if (lowStock === 'true') {
      where.quantity = {
        lte: prisma.product.fields.minStockLevel
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get products and total count
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({ where })
    ])

    const totalPages = Math.ceil(total / pageSizeNum)

    res.json({
      products,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages
    })
  } catch (error) {
    console.error('Get products error:', error)
    res.status(500).json({
      error: 'Failed to fetch products',
      code: 'FETCH_PRODUCTS_ERROR'
    })
  }
}

/**
 * Get a single product by ID
 * GET /api/products/:id
 */
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
      return
    }

    res.json(product)
  } catch (error) {
    console.error('Get product by ID error:', error)
    res.status(500).json({
      error: 'Failed to fetch product',
      code: 'FETCH_PRODUCT_ERROR'
    })
  }
}

/**
 * Search product by SKU or barcode
 * GET /api/products/search/:code
 */
export async function searchProductByCode(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: code },
          { barcode: code }
        ],
        isActive: true
      }
    })

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
      return
    }

    res.json(product)
  } catch (error) {
    console.error('Search product by code error:', error)
    res.status(500).json({
      error: 'Failed to search product',
      code: 'SEARCH_PRODUCT_ERROR'
    })
  }
}

/**
 * Create a new product
 * POST /api/products
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const data: CreateProductData = req.body

    // Validate required fields
    if (!data.name || !data.sku || data.price === undefined) {
      res.status(400).json({
        error: 'Name, SKU, and price are required',
        code: 'VALIDATION_ERROR'
      })
      return
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku }
    })

    if (existingProduct) {
      res.status(409).json({
        error: 'Product with this SKU already exists',
        code: 'DUPLICATE_SKU'
      })
      return
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        price: new Decimal(data.price),
        cost: data.cost ? new Decimal(data.cost) : null,
        quantity: data.quantity || 0,
        minStockLevel: data.minStockLevel || 0,
        category: data.category,
        vendor: data.vendor,
        description: data.description,
        imageUrl: data.imageUrl,
        flavorProfile: data.flavorProfile,
        isSyntheticNicotine: data.isSyntheticNicotine || false,
        volumeInMl: data.volumeInMl ? new Decimal(data.volumeInMl) : null,
        isClosedSystem: data.isClosedSystem,
        numCartridges: data.numCartridges,
        nicotineStrength: data.nicotineStrength ? new Decimal(data.nicotineStrength) : null,
        ageRestricted: data.ageRestricted ?? true,
        expirationDate: data.expirationDate,
        lotNumber: data.lotNumber,
        supplierItemId: data.supplierItemId
      }
    })

    res.status(201).json(product)
  } catch (error) {
    console.error('Create product error:', error)
    res.status(500).json({
      error: 'Failed to create product',
      code: 'CREATE_PRODUCT_ERROR'
    })
  }
}

/**
 * Update an existing product
 * PUT /api/products/:id
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const data: Partial<CreateProductData> = req.body

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
      return
    }

    // Check for SKU conflicts if SKU is being updated
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: { sku: data.sku }
      })

      if (skuConflict) {
        res.status(409).json({
          error: 'Product with this SKU already exists',
          code: 'DUPLICATE_SKU'
        })
        return
      }
    }

    // Update product
    const updateData: any = { ...data }
    
    // Convert number fields to Decimal where needed
    if (data.price !== undefined) updateData.price = new Decimal(data.price)
    if (data.cost !== undefined) updateData.cost = data.cost ? new Decimal(data.cost) : null
    if (data.volumeInMl !== undefined) updateData.volumeInMl = data.volumeInMl ? new Decimal(data.volumeInMl) : null
    if (data.nicotineStrength !== undefined) updateData.nicotineStrength = data.nicotineStrength ? new Decimal(data.nicotineStrength) : null

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    })

    res.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    res.status(500).json({
      error: 'Failed to update product',
      code: 'UPDATE_PRODUCT_ERROR'
    })
  }
}

/**
 * Delete a product (soft delete)
 * DELETE /api/products/:id
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      })
      return
    }

    // Soft delete - set isActive to false
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Delete product error:', error)
    res.status(500).json({
      error: 'Failed to delete product',
      code: 'DELETE_PRODUCT_ERROR'
    })
  }
}

/**
 * Get low stock products
 * GET /api/products/low-stock
 */
export async function getLowStockProducts(_req: Request, res: Response): Promise<void> {
  try {
    const products = await prisma.$queryRaw`
      SELECT * FROM products 
      WHERE quantity <= min_stock_level 
      AND is_active = true
      ORDER BY (quantity - min_stock_level) ASC
    `

    res.json(products)
  } catch (error) {
    console.error('Get low stock products error:', error)
    res.status(500).json({
      error: 'Failed to fetch low stock products',
      code: 'FETCH_LOW_STOCK_ERROR'
    })
  }
}

/**
 * Get all product categories
 * GET /api/products/categories
 */
export async function getProductCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.product.findMany({
      where: {
        category: { not: null },
        isActive: true
      },
      select: { category: true },
      distinct: ['category']
    })

    const categoryList = categories
      .map(p => p.category)
      .filter(Boolean)
      .sort()

    res.json(categoryList)
  } catch (error) {
    console.error('Get product categories error:', error)
    res.status(500).json({
      error: 'Failed to fetch product categories',
      code: 'FETCH_CATEGORIES_ERROR'
    })
  }
}

/**
 * Get all product vendors
 * GET /api/products/vendors
 */
export async function getProductVendors(_req: Request, res: Response): Promise<void> {
  try {
    const vendors = await prisma.product.findMany({
      where: {
        vendor: { not: null },
        isActive: true
      },
      select: { vendor: true },
      distinct: ['vendor']
    })

    const vendorList = vendors
      .map(p => p.vendor)
      .filter(Boolean)
      .sort()

    res.json(vendorList)
  } catch (error) {
    console.error('Get product vendors error:', error)
    res.status(500).json({
      error: 'Failed to fetch product vendors',
      code: 'FETCH_VENDORS_ERROR'
    })
  }
}

/**
 * Update product stock
 * PATCH /api/products/:id/stock
 */
export async function updateStock(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { quantity } = req.body

    if (typeof quantity !== 'number' || quantity < 0) {
      res.status(400).json({
        error: 'Invalid quantity',
        code: 'INVALID_QUANTITY'
      })
      return
    }

    const product = await prisma.product.update({
      where: { id },
      data: { quantity }
    })

    res.json(product)
  } catch (error) {
    console.error('Update stock error:', error)
    res.status(500).json({
      error: 'Failed to update stock',
      code: 'UPDATE_STOCK_ERROR'
    })
  }
}

/**
 * Bulk update product stock
 * PATCH /api/products/bulk-stock
 */
export async function bulkUpdateStock(req: Request, res: Response): Promise<void> {
  try {
    const { updates } = req.body

    if (!Array.isArray(updates)) {
      res.status(400).json({
        error: 'Updates must be an array',
        code: 'INVALID_UPDATES'
      })
      return
    }

    const updatePromises = updates.map(({ id, quantity }) =>
      prisma.product.update({
        where: { id },
        data: { quantity }
      })
    )

    const products = await Promise.all(updatePromises)
    res.json(products)
  } catch (error) {
    console.error('Bulk update stock error:', error)
    res.status(500).json({
      error: 'Failed to bulk update stock',
      code: 'BULK_UPDATE_STOCK_ERROR'
    })
  }
}