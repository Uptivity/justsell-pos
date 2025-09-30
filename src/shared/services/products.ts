import type { Product } from '../types/database'
import { api } from './api'

export interface CreateProductData {
  name: string
  sku: string
  barcode?: string
  price: number
  cost?: number | undefined
  quantity: number
  minStockLevel: number
  category?: string
  vendor?: string
  description?: string
  imageUrl?: string
  flavorProfile?: string
  isSyntheticNicotine: boolean
  volumeInMl?: number
  isClosedSystem?: boolean
  numCartridges?: number
  nicotineStrength?: number
  ageRestricted: boolean
  expirationDate?: Date
  lotNumber?: string
  supplierItemId?: string
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string
}

export interface ProductFilters {
  category?: string
  vendor?: string
  ageRestricted?: boolean
  lowStock?: boolean
  search?: string
  isActive?: boolean
}

export interface ProductSearchResponse {
  products: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Product service for managing product catalog
 */
export class ProductService {
  /**
   * Get all products with optional filtering
   */
  static async getProducts(
    filters: ProductFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<ProductSearchResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== '') {
          acc[key] = value.toString()
        }
        return acc
      }, {} as Record<string, string>)
    })

    const response = await api.get<ProductSearchResponse>(`/products?${params}`)
    return response.data
  }

  /**
   * Get a single product by ID
   */
  static async getProductById(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`)
    return response.data
  }

  /**
   * Search products by SKU or barcode
   */
  static async searchProductByCode(code: string): Promise<Product | null> {
    try {
      const response = await api.get<Product>(`/products/search/${encodeURIComponent(code)}`)
      return response.data
    } catch (error) {
      // Return null if product not found
      return null
    }
  }

  /**
   * Create a new product
   */
  static async createProduct(data: CreateProductData): Promise<Product> {
    const response = await api.post<Product>('/products', data)
    return response.data
  }

  /**
   * Update an existing product
   */
  static async updateProduct(data: UpdateProductData): Promise<Product> {
    const { id, ...updateData } = data
    const response = await api.put<Product>(`/products/${id}`, updateData)
    return response.data
  }

  /**
   * Delete a product (soft delete - sets isActive to false)
   */
  static async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`)
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>('/products/low-stock')
    return response.data
  }

  /**
   * Get product categories
   */
  static async getProductCategories(): Promise<string[]> {
    const response = await api.get<string[]>('/products/categories')
    return response.data
  }

  /**
   * Get product vendors
   */
  static async getProductVendors(): Promise<string[]> {
    const response = await api.get<string[]>('/products/vendors')
    return response.data
  }

  /**
   * Update product stock quantity
   */
  static async updateStock(id: string, quantity: number): Promise<Product> {
    const response = await api.patch<Product>(`/products/${id}/stock`, { quantity })
    return response.data
  }

  /**
   * Bulk update product stock
   */
  static async bulkUpdateStock(updates: Array<{ id: string; quantity: number }>): Promise<Product[]> {
    const response = await api.patch<Product[]>('/products/bulk-stock', { updates })
    return response.data
  }
}