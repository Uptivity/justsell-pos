import { useState } from 'react'
import { useProducts, useDeleteProduct } from '../../hooks/useProducts'
import { usePermissions } from '../../hooks/useAuth'
import type { ProductFilters } from '../../services/products'
import type { Product } from '../../types/database'

interface ProductListProps {
  onSelectProduct?: (product: Product) => void
  onEditProduct?: (product: Product) => void
  selectable?: boolean
  className?: string
}

export function ProductList({
  onSelectProduct,
  onEditProduct,
  selectable = false,
  className = ''
}: ProductListProps) {
  const [filters, setFilters] = useState<ProductFilters>({})
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const { hasPermission } = usePermissions()
  const pageSize = 20

  // Apply search to filters
  const activeFilters = {
    ...filters,
    search: searchTerm || undefined
  }

  const { data, isLoading, error } = useProducts(activeFilters, page, pageSize)
  const deleteProduct = useDeleteProduct()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to first page on search
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return
    }

    try {
      await deleteProduct.mutateAsync(product.id)
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(typeof price === 'string' ? parseFloat(price) : price)
  }

  const getStockStatus = (product: Product) => {
    if (product.quantity <= 0) {
      return { text: 'Out of Stock', color: 'text-red-600 bg-red-50' }
    }
    if (product.quantity <= product.minStockLevel) {
      return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-50' }
    }
    return { text: 'In Stock', color: 'text-green-600 bg-green-50' }
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <p className="text-red-600">Failed to load products. Please try again.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Search and Filter Bar */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setPage(1)
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear
              </button>
            )}
          </form>

          {/* Quick Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setFilters({ ...filters, lowStock: filters.lowStock ? undefined : true })
                setPage(1)
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.lowStock
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => {
                setFilters({ ...filters, ageRestricted: filters.ageRestricted ? undefined : true })
                setPage(1)
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.ageRestricted
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Age Restricted
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : !data?.products.length ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No products found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.products.map((product) => {
                    const stockStatus = getStockStatus(product)
                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 ${
                          selectable ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => selectable && onSelectProduct?.(product)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {product.imageUrl ? (
                                <img
                                  className="h-10 w-10 rounded object-cover"
                                  src={product.imageUrl}
                                  alt={product.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-300 flex items-center justify-center">
                                  <span className="text-gray-600 text-xs">
                                    {product.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              {product.category && (
                                <div className="text-sm text-gray-500">
                                  {product.category}
                                </div>
                              )}
                              {product.ageRestricted && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Age Restricted
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(product.price.toString())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.quantity}
                          {product.minStockLevel > 0 && (
                            <span className="text-gray-500 ml-1">
                              (min: {product.minStockLevel})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}
                          >
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {hasPermission('product:update') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditProduct?.(product)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          )}
                          {hasPermission('product:delete') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProduct(product)
                              }}
                              className="text-red-600 hover:text-red-900"
                              disabled={deleteProduct.isPending}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(page - 1) * pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(page * pageSize, data.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{data.total}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}