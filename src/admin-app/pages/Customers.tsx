import { useState } from 'react'
import { ProtectedRoute } from '../../shared/components/auth'
import { CustomerList, CustomerForm } from '../../shared/components/customers'
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '../../shared/hooks/useCustomers'
import type { CustomerListItem, CreateCustomerData, UpdateCustomerData } from '../../shared/types/customers'

export function CustomersPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null)

  // React Query hooks
  const { data: customersData, isLoading, error } = useCustomers(currentPage, 20, searchQuery)
  const createCustomerMutation = useCreateCustomer()
  const updateCustomerMutation = useUpdateCustomer()

  const customers = customersData?.customers || []
  const pagination = customersData?.pagination

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleCreateCustomer = async (data: CreateCustomerData) => {
    try {
      await createCustomerMutation.mutateAsync(data)
      setShowForm(false)
      alert('Customer created successfully!')
    } catch (error: any) {
      alert(`Failed to create customer: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleUpdateCustomer = async (data: UpdateCustomerData) => {
    if (!editingCustomer) return

    try {
      await updateCustomerMutation.mutateAsync({
        id: editingCustomer.id,
        data
      })
      setEditingCustomer(null)
      setShowForm(false)
      alert('Customer updated successfully!')
    } catch (error: any) {
      alert(`Failed to update customer: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleEditCustomer = async (customer: CustomerListItem) => {
    // For editing, we need the full customer data, so we'd normally fetch it
    // For now, we'll work with what we have in the list item
    setEditingCustomer(customer)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCustomer(null)
  }

  if (showForm) {
    return (
      <ProtectedRoute requiredPermission="customer:create">
        <div className="min-h-screen bg-gray-50 p-6">
          <CustomerForm
            customer={editingCustomer ? {
              ...editingCustomer,
              dateOfBirth: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              state: '',
              zipCode: '',
              marketingOptIn: false,
              smsOptIn: false,
              dataRetentionConsent: true,
              isActive: true,
              pointsLifetimeEarned: editingCustomer.loyaltyPoints,
              pointsLifetimeRedeemed: 0,
              firstPurchaseDate: editingCustomer.lastPurchaseDate || '',
              averageTransactionValue: 0,
              updatedAt: new Date().toISOString()
            } : undefined}
            onSubmit={(data) => editingCustomer ? handleUpdateCustomer(data as UpdateCustomerData) : handleCreateCustomer(data as CreateCustomerData)}
            onCancel={handleCancelForm}
            isLoading={createCustomerMutation.isPending || updateCustomerMutation.isPending}
          />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="customer:read">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600 mt-1">
                Manage customer profiles and loyalty program
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Customer
            </button>
          </div>

          {/* Stats Cards */}
          {pagination && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Current Page</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {pagination.page} of {pagination.pages}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Showing</h3>
                <p className="text-2xl font-bold text-gray-900">{customers.length} customers</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Search Results</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {searchQuery ? 'Filtered' : 'All'}
                </p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search customers by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                Error loading customers: {error.message}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading customers...</p>
            </div>
          )}

          {/* Customers List */}
          {!isLoading && !error && (
            <div className="bg-white rounded-lg shadow">
              <CustomerList
                customers={customers}
                onEditCustomer={handleEditCustomer}
                className="p-6"
              />
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {pagination.pages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}