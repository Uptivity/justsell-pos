import { useState } from 'react'
import { ProductList, ProductForm } from '../../shared/components/products'
import { ProtectedRoute } from '../../shared/components/auth'
import { usePermissions } from '../../shared/hooks/useAuth'
import type { Product } from '../../shared/types/database'

export function ProductsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const { hasPermission } = usePermissions()

  const handleAddProduct = () => {
    setEditingProduct(undefined)
    setShowForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingProduct(undefined)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingProduct(undefined)
  }

  return (
    <ProtectedRoute requiredPermission="product:read">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                <p className="mt-2 text-gray-600">
                  Manage your product catalog, inventory, and pricing
                </p>
              </div>
              {hasPermission('product:create') && (
                <button
                  onClick={handleAddProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {showForm ? (
            <ProductForm
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              className="max-w-4xl"
            />
          ) : (
            <ProductList
              onEditProduct={handleEditProduct}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}