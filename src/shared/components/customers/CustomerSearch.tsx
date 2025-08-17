import { useState, useEffect, useRef } from 'react'
import { useSearchCustomers } from '../../hooks/useCustomers'
import type { CustomerSearchResult } from '../../types/customers'

interface CustomerSearchProps {
  onSelectCustomer: (customer: CustomerSearchResult) => void
  onClearCustomer?: () => void
  selectedCustomer?: CustomerSearchResult | null
  placeholder?: string
  className?: string
}

export function CustomerSearch({ 
  onSelectCustomer, 
  onClearCustomer,
  selectedCustomer,
  placeholder = "Search customers by name, email, or phone...",
  className = ""
}: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: searchResults = [] } = useSearchCustomers(query)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setInputFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Show dropdown when there are results and input is focused
  useEffect(() => {
    setIsOpen(inputFocused && query.length >= 2 && searchResults.length > 0)
  }, [inputFocused, query, searchResults.length])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (selectedCustomer && onClearCustomer) {
      onClearCustomer()
    }
  }

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    onSelectCustomer(customer)
    setQuery(`${customer.firstName} ${customer.lastName}`)
    setIsOpen(false)
    setInputFocused(false)
    inputRef.current?.blur()
  }

  const handleClearSelection = () => {
    setQuery('')
    onClearCustomer?.()
    inputRef.current?.focus()
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'text-purple-600'
      case 'GOLD': return 'text-yellow-600'
      case 'SILVER': return 'text-gray-600'
      case 'BRONZE': return 'text-amber-600'
      default: return 'text-gray-600'
    }
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setInputFocused(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Clear button */}
        {(query || selectedCustomer) && (
          <button
            onClick={handleClearSelection}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Search icon */}
        {!query && !selectedCustomer && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {searchResults.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleSelectCustomer(customer)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </h4>
                    <span className={`text-xs font-medium ${getTierColor(customer.loyaltyTier)}`}>
                      {customer.loyaltyTier}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    {customer.email && (
                      <div>{customer.email}</div>
                    )}
                    {customer.phoneNumber && (
                      <div>{formatPhoneNumber(customer.phoneNumber)}</div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-900 font-medium">
                    {customer.loyaltyPoints.toLocaleString()} pts
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {inputFocused && query.length >= 2 && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-3 text-center text-gray-500">
            <p>No customers found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        </div>
      )}

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-blue-900">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </div>
              <div className="text-sm text-blue-700 flex items-center space-x-3">
                <span className={getTierColor(selectedCustomer.loyaltyTier)}>
                  {selectedCustomer.loyaltyTier} Member
                </span>
                <span>{selectedCustomer.loyaltyPoints.toLocaleString()} points</span>
              </div>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  )
}