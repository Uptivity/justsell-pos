import { useState, useEffect } from 'react'
import { useProductForm } from '../../hooks/useProducts'
import type { CreateProductData, UpdateProductData } from '../../services/products'
import type { Product } from '../../types/database'

interface ProductFormProps {
  product?: Product // If provided, we're editing; otherwise creating
  onSuccess?: (product: Product) => void
  onCancel?: () => void
  className?: string
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
  className = ''
}: ProductFormProps) {
  const { createProduct, updateProduct, categories, isLoading, error } = useProductForm()
  const isEditing = !!product

  // Form state
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    sku: '',
    barcode: '',
    price: 0,
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Populate form with product data when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        price: parseFloat(product.price.toString()),
        cost: product.cost ? parseFloat(product.cost.toString()) : undefined,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel,
        category: product.category || '',
        vendor: product.vendor || '',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        flavorProfile: product.flavorProfile || '',
        isSyntheticNicotine: product.isSyntheticNicotine,
        volumeInMl: product.volumeInMl ? parseFloat(product.volumeInMl.toString()) : 0,
        isClosedSystem: product.isClosedSystem || false,
        numCartridges: product.numCartridges || 0,
        nicotineStrength: product.nicotineStrength ? parseFloat(product.nicotineStrength.toString()) : 0,
        ageRestricted: product.ageRestricted,
        expirationDate: product.expirationDate || undefined,
        lotNumber: product.lotNumber || '',
        supplierItemId: product.supplierItemId || ''
      })
    }
  }, [product])

  const handleInputChange = (field: keyof CreateProductData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number'
      ? parseFloat(e.target.value) || 0
      : e.target.value

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Product name is required'
    }

    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required'
    }

    if (formData.price <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    if (formData.cost !== undefined && formData.cost < 0) {
      errors.cost = 'Cost cannot be negative'
    }

    if (formData.quantity < 0) {
      errors.quantity = 'Quantity cannot be negative'
    }

    if (formData.minStockLevel < 0) {
      errors.minStockLevel = 'Minimum stock level cannot be negative'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (isEditing && product) {
        const updateData: UpdateProductData = {
          id: product.id,
          ...formData
        }
        const updatedProduct = await updateProduct.mutateAsync(updateData)
        onSuccess?.(updatedProduct)
      } else {
        const newProduct = await createProduct.mutateAsync(formData)
        onSuccess?.(newProduct)
      }
    } catch (err) {
      console.error('Form submission error:', err)
    }
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter product name"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
              SKU *
            </label>
            <input
              type="text"
              id="sku"
              value={formData.sku}
              onChange={handleInputChange('sku')}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.sku ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter SKU"
            />
            {validationErrors.sku && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.sku}</p>
            )}
          </div>

          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
              Barcode
            </label>
            <input
              type="text"
              id="barcode"
              value={formData.barcode}
              onChange={handleInputChange('barcode')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter barcode"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={handleInputChange('category')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                id="price"
                value={formData.price}
                onChange={handleInputChange('price')}
                className={`block w-full pl-7 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {validationErrors.price && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
            )}
          </div>

          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
              Cost
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                id="cost"
                value={formData.cost}
                onChange={handleInputChange('cost')}
                className={`block w-full pl-7 pr-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.cost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {validationErrors.cost && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.cost}</p>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Current Stock
            </label>
            <input
              type="number"
              min="0"
              id="quantity"
              value={formData.quantity}
              onChange={handleInputChange('quantity')}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {validationErrors.quantity && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.quantity}</p>
            )}
          </div>

          <div>
            <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700">
              Minimum Stock Level
            </label>
            <input
              type="number"
              min="0"
              id="minStockLevel"
              value={formData.minStockLevel}
              onChange={handleInputChange('minStockLevel')}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.minStockLevel ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0"
            />
            {validationErrors.minStockLevel && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.minStockLevel}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange('description')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter product description"
          />
        </div>

        {/* Compliance */}
        <div className="flex items-center">
          <input
            id="ageRestricted"
            type="checkbox"
            checked={formData.ageRestricted}
            onChange={handleInputChange('ageRestricted')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="ageRestricted" className="ml-2 block text-sm text-gray-900">
            Age Restricted Product (requires age verification)
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Product' : 'Create Product'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}