import { useState } from 'react'
import { customerService } from '../../services/customers'
import type { CustomerListItem } from '../../types/customers'

interface CustomerListProps {
  customers: CustomerListItem[]
  onSelectCustomer?: (customer: CustomerListItem) => void
  onEditCustomer?: (customer: CustomerListItem) => void
  selectable?: boolean
  className?: string
}

export function CustomerList({ 
  customers, 
  onSelectCustomer, 
  onEditCustomer, 
  selectable = false,
  className = '' 
}: CustomerListProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const handleSelectCustomer = (customer: CustomerListItem) => {
    if (selectable) {
      setSelectedCustomerId(customer.id)
      onSelectCustomer?.(customer)
    }
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return ''
    // Format phone number as (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-purple-600 bg-purple-100'
      case 'GOLD': return 'text-yellow-600 bg-yellow-100'
      case 'SILVER': return 'text-gray-600 bg-gray-100'
      case 'BRONZE': return 'text-amber-600 bg-amber-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (customers.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No customers found</p>
        <p className="text-sm">Try adjusting your search criteria</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {customers.map((customer) => {
        const loyaltyInfo = customerService.getLoyaltyTierInfo(customer.totalSpent)
        const isSelected = selectedCustomerId === customer.id

        return (
          <div
            key={customer.id}
            onClick={() => handleSelectCustomer(customer)}
            className={`
              p-4 border rounded-lg transition-colors duration-200
              ${selectable ? 'cursor-pointer hover:bg-gray-50' : ''}
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              ${selectable && !isSelected ? 'hover:border-gray-300' : ''}
            `}
          >
            <div className="flex justify-between items-start">
              {/* Customer Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-medium text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${getTierColor(customer.loyaltyTier)}
                  `}>
                    {customer.loyaltyTier}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  {customer.email && (
                    <div className="flex items-center">
                      <span className="w-16">Email:</span>
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phoneNumber && (
                    <div className="flex items-center">
                      <span className="w-16">Phone:</span>
                      <span>{formatPhoneNumber(customer.phoneNumber)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right text-sm">
                <div className="text-gray-900 font-medium">
                  {customer.loyaltyPoints.toLocaleString()} pts
                </div>
                <div className="text-gray-600">
                  ${customer.totalSpent.toFixed(2)} spent
                </div>
                <div className="text-gray-500 text-xs">
                  {customer.transactionCount} transaction{customer.transactionCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Loyalty Progress */}
            {loyaltyInfo.nextTier && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to {loyaltyInfo.nextTier}</span>
                  <span>${loyaltyInfo.amountToNextTier.toFixed(2)} to go</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, loyaltyInfo.progress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last Purchase Date */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>
                {customer.lastPurchaseDate 
                  ? `Last purchase: ${formatDate(customer.lastPurchaseDate)}`
                  : 'No purchases yet'
                }
              </span>
              <span>Joined: {formatDate(customer.createdAt)}</span>
            </div>

            {/* Action Buttons */}
            {onEditCustomer && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditCustomer(customer)
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit Customer
                </button>
              </div>
            )}

            {/* Selection Indicator */}
            {selectable && isSelected && (
              <div className="mt-2 pt-2 border-t border-blue-200 text-blue-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}