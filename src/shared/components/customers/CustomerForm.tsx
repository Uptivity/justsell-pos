import { useState } from 'react'
import { customerService } from '../../services/customers'
import type { CreateCustomerData, UpdateCustomerData, CustomerResponse } from '../../types/customers'

interface CustomerFormProps {
  customer?: CustomerResponse
  onSubmit: (data: CreateCustomerData | UpdateCustomerData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CustomerForm({ customer, onSubmit, onCancel, isLoading }: CustomerFormProps) {
  const [formData, setFormData] = useState<CreateCustomerData>({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    email: customer?.email || '',
    phoneNumber: customer?.phoneNumber || '',
    dateOfBirth: customer?.dateOfBirth || '',
    addressLine1: customer?.addressLine1 || '',
    addressLine2: customer?.addressLine2 || '',
    city: customer?.city || '',
    state: customer?.state || '',
    zipCode: customer?.zipCode || '',
    marketingOptIn: customer?.marketingOptIn || false,
    smsOptIn: customer?.smsOptIn || false
  })

  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    const validationErrors = customerService.validateCustomer(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const loyaltyInfo = customer ? customerService.getLoyaltyTierInfo(customer.totalSpent) : null

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">
        {customer ? 'Edit Customer' : 'Add New Customer'}
      </h2>

      {/* Display customer loyalty info if editing */}
      {customer && loyaltyInfo && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Loyalty Status</span>
            <span className={`font-bold ${loyaltyInfo.currentTierColor}`}>
              {loyaltyInfo.currentTier}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Points Balance:</span>
            <span className="font-semibold">{customer.loyaltyPoints.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Spent:</span>
            <span className="font-semibold">${customer.totalSpent.toFixed(2)}</span>
          </div>
          {loyaltyInfo.nextTier && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress to {loyaltyInfo.nextTier}</span>
                <span>${loyaltyInfo.amountToNextTier.toFixed(2)} needed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${loyaltyInfo.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display validation errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <h3 className="text-red-800 font-medium text-sm mb-2">Please fix the following errors:</h3>
          <ul className="text-red-700 text-sm list-disc pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="firstName">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="lastName">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="phoneNumber">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="dateOfBirth">
            Date of Birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Information</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="addressLine1">
              Address Line 1
            </label>
            <input
              type="text"
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="addressLine2">
              Address Line 2
            </label>
            <input
              type="text"
              id="addressLine2"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="city">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="state">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NY"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="zipCode">
                ZIP Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Communication Preferences</h3>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="marketingOptIn"
                checked={formData.marketingOptIn}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">I would like to receive marketing emails</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="smsOptIn"
                checked={formData.smsOptIn}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">I would like to receive SMS notifications</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Saving...' : (customer ? 'Update Customer' : 'Create Customer')}
          </button>
        </div>
      </form>
    </div>
  )
}