import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProductService } from '../services/products'
import type { 
  CreateProductData, 
  UpdateProductData, 
  ProductFilters
} from '../services/products'

// Query keys for React Query
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters, page: number, pageSize: number) =>
    [...productKeys.lists(), { filters, page, pageSize }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (code: string) => [...productKeys.all, 'search', code] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  vendors: () => [...productKeys.all, 'vendors'] as const,
  lowStock: () => [...productKeys.all, 'lowStock'] as const,
}

/**
 * Hook for fetching products with pagination and filtering
 */
export function useProducts(
  filters: ProductFilters = {},
  page: number = 1,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: productKeys.list(filters, page, pageSize),
    queryFn: () => ProductService.getProducts(filters, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching a single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for searching product by SKU or barcode
 */
export function useProductSearch(code: string) {
  return useQuery({
    queryKey: productKeys.search(code),
    queryFn: () => ProductService.searchProductByCode(code),
    enabled: !!code,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching product categories
 */
export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => ProductService.getProductCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook for fetching product vendors
 */
export function useProductVendors() {
  return useQuery({
    queryKey: productKeys.vendors(),
    queryFn: () => ProductService.getProductVendors(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook for fetching low stock products
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: productKeys.lowStock(),
    queryFn: () => ProductService.getLowStockProducts(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook for creating a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProductData) => ProductService.createProduct(data),
    onSuccess: () => {
      // Invalidate and refetch product lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.categories() })
      queryClient.invalidateQueries({ queryKey: productKeys.vendors() })
    },
  })
}

/**
 * Hook for updating a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProductData) => ProductService.updateProduct(data),
    onSuccess: (updatedProduct) => {
      // Update the specific product in cache
      queryClient.setQueryData(
        productKeys.detail(updatedProduct.id),
        updatedProduct
      )
      
      // Invalidate product lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.categories() })
      queryClient.invalidateQueries({ queryKey: productKeys.vendors() })
    },
  })
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ProductService.deleteProduct(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(id) })
      
      // Invalidate product lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() })
    },
  })
}

/**
 * Hook for updating product stock
 */
export function useUpdateStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      ProductService.updateStock(id, quantity),
    onSuccess: (updatedProduct) => {
      // Update the specific product in cache
      queryClient.setQueryData(
        productKeys.detail(updatedProduct.id),
        updatedProduct
      )
      
      // Invalidate lists that might show stock information
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() })
    },
  })
}

/**
 * Hook for bulk updating stock
 */
export function useBulkUpdateStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: string; quantity: number }>) =>
      ProductService.bulkUpdateStock(updates),
    onSuccess: (updatedProducts) => {
      // Update individual products in cache
      updatedProducts.forEach(product => {
        queryClient.setQueryData(
          productKeys.detail(product.id),
          product
        )
      })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() })
    },
  })
}

/**
 * Custom hook for product form management
 */
export function useProductForm() {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const categories = useProductCategories()
  const vendors = useProductVendors()

  return {
    createProduct,
    updateProduct,
    categories: categories.data || [],
    vendors: vendors.data || [],
    isLoading: createProduct.isPending || updateProduct.isPending,
    error: createProduct.error || updateProduct.error,
  }
}