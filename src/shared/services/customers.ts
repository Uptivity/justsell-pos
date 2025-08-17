import { api } from './api'
import type { 
  CreateCustomerData,
  UpdateCustomerData,
  CustomerResponse,
  CustomerSearchResult,
  LoyaltyPointsUpdate
} from '../types/customers'

export const customerService = {
  // Create a new customer
  async createCustomer(data: CreateCustomerData): Promise<CustomerResponse> {
    const response = await api.post('/api/customers', data)
    return response.data.customer
  },

  // Get customer by ID
  async getCustomer(id: string): Promise<CustomerResponse> {
    const response = await api.get(`/api/customers/${id}`)
    return response.data
  },

  // Get customers list with pagination
  async getCustomers(page = 1, limit = 20, search?: string) {
    const response = await api.get('/api/customers', {
      params: { page, limit, search }
    })
    return response.data
  },

  // Update customer
  async updateCustomer(id: string, data: UpdateCustomerData): Promise<CustomerResponse> {
    const response = await api.put(`/api/customers/${id}`, data)
    return response.data.customer
  },

  // Quick search customers (for POS)
  async searchCustomers(query: string): Promise<CustomerSearchResult[]> {
    if (!query || query.length < 2) {
      return []
    }
    
    const response = await api.get('/api/customers/search', {
      params: { q: query }
    })
    return response.data.customers
  },

  // Update loyalty points
  async updateLoyaltyPoints(id: string, data: LoyaltyPointsUpdate) {
    const response = await api.post(`/api/customers/${id}/loyalty`, data)
    return response.data
  },

  // Calculate loyalty points for purchase amount
  calculateLoyaltyPoints(purchaseAmount: number): number {
    // 1 point per dollar spent
    return Math.floor(purchaseAmount)
  },

  // Calculate loyalty tier thresholds
  getLoyaltyTierInfo(totalSpent: number) {
    const tiers = [
      { tier: 'BRONZE', min: 0, max: 499, color: 'text-amber-600' },
      { tier: 'SILVER', min: 500, max: 1999, color: 'text-gray-500' },
      { tier: 'GOLD', min: 2000, max: 4999, color: 'text-yellow-500' },
      { tier: 'PLATINUM', min: 5000, max: Infinity, color: 'text-purple-600' }
    ]

    const currentTier = tiers.find(t => totalSpent >= t.min && totalSpent <= t.max)
    const nextTier = tiers.find(t => t.min > totalSpent)

    return {
      currentTier: currentTier?.tier || 'BRONZE',
      currentTierColor: currentTier?.color || 'text-amber-600',
      nextTier: nextTier?.tier,
      amountToNextTier: nextTier ? nextTier.min - totalSpent : 0,
      progress: nextTier 
        ? Math.min(100, ((totalSpent - (currentTier?.min || 0)) / (nextTier.min - (currentTier?.min || 0))) * 100)
        : 100
    }
  },

  // Validate customer data
  validateCustomer(data: CreateCustomerData | UpdateCustomerData) {
    const errors: string[] = []

    if ('firstName' in data && (!data.firstName || data.firstName.trim().length < 2)) {
      errors.push('First name must be at least 2 characters')
    }

    if ('lastName' in data && (!data.lastName || data.lastName.trim().length < 2)) {
      errors.push('Last name must be at least 2 characters')
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format')
    }

    if (data.phoneNumber && !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(data.phoneNumber)) {
      errors.push('Invalid phone number format')
    }

    if (data.zipCode && !/^\d{5}(-\d{4})?$/.test(data.zipCode)) {
      errors.push('Invalid ZIP code format')
    }

    return errors
  }
}