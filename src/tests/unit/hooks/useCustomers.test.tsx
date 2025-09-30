/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { customerService } from '../../../shared/services/customers'
import {
  useCreateCustomer,
  useCustomer,
  useCustomers,
  useUpdateCustomer,
  useSearchCustomers,
  useUpdateLoyaltyPoints,
  useCustomerSearch
} from '../../../shared/hooks/useCustomers'
import type { UpdateCustomerData, LoyaltyPointsUpdate } from '../../../shared/types/customers'

// Mock the customerService
jest.mock('../../../shared/services/customers', () => ({
  customerService: {
    createCustomer: jest.fn(),
    getCustomer: jest.fn(),
    getCustomers: jest.fn(),
    updateCustomer: jest.fn(),
    searchCustomers: jest.fn(),
    updateLoyaltyPoints: jest.fn()
  }
}))

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

const mockCustomerService = customerService as jest.Mocked<typeof customerService>

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useCustomers Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useCreateCustomer', () => {
    it('should create customer successfully', async () => {
      const newCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0123',
        dateOfBirth: '1990-01-01'
      }
      const mockCreatedCustomer = {
        id: 'customer-123',
        ...newCustomer,
        loyaltyPoints: 0,
        loyaltyTier: 'BRONZE',
        totalSpent: 0,
        createdAt: new Date().toISOString()
      }

      mockCustomerService.createCustomer.mockResolvedValue(mockCreatedCustomer)

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper()
      })

      result.current.mutate(newCustomer)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.createCustomer).toHaveBeenCalledWith(newCustomer)
      expect(result.current.data).toEqual(mockCreatedCustomer)
    })

    it('should handle customer creation error', async () => {
      const newCustomer = {
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: '123'
      }
      const mockError = new Error('Invalid customer data')
      mockCustomerService.createCustomer.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper()
      })

      result.current.mutate(newCustomer)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(console.error).toHaveBeenCalledWith('Customer creation failed:', mockError)
    })
  })

  describe('useCustomer', () => {
    it('should fetch customer by ID', async () => {
      const mockCustomer = {
        id: 'customer-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-0456',
        loyaltyPoints: 150,
        loyaltyTier: 'SILVER',
        totalSpent: 750.00,
        transactionCount: 12,
        lastPurchaseDate: new Date().toISOString()
      }

      mockCustomerService.getCustomer.mockResolvedValue(mockCustomer)

      const { result } = renderHook(() => useCustomer('customer-123'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.getCustomer).toHaveBeenCalledWith('customer-123')
      expect(result.current.data).toEqual(mockCustomer)
    })

    it('should not fetch when ID is empty', () => {
      renderHook(() => useCustomer(''), {
        wrapper: createWrapper()
      })

      expect(mockCustomerService.getCustomer).not.toHaveBeenCalled()
    })

    it('should not fetch when disabled', () => {
      renderHook(() => useCustomer('customer-123', false), {
        wrapper: createWrapper()
      })

      expect(mockCustomerService.getCustomer).not.toHaveBeenCalled()
    })

    it('should handle customer not found', async () => {
      const mockError = new Error('Customer not found')
      mockCustomerService.getCustomer.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustomer('nonexistent'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useCustomers', () => {
    it('should fetch customers with default parameters', async () => {
      const mockCustomers = {
        data: [
          {
            id: 'customer-1',
            firstName: 'Alice',
            lastName: 'Johnson',
            email: 'alice@example.com',
            loyaltyPoints: 50,
            loyaltyTier: 'BRONZE'
          },
          {
            id: 'customer-2',
            firstName: 'Bob',
            lastName: 'Wilson',
            email: 'bob@example.com',
            loyaltyPoints: 200,
            loyaltyTier: 'SILVER'
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      mockCustomerService.getCustomers.mockResolvedValue(mockCustomers)

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.getCustomers).toHaveBeenCalledWith(1, 20, undefined)
      expect(result.current.data).toEqual(mockCustomers)
    })

    it('should fetch customers with custom parameters', async () => {
      const mockCustomers = {
        data: [
          {
            id: 'customer-3',
            firstName: 'Charlie',
            lastName: 'Brown',
            email: 'charlie@example.com',
            loyaltyPoints: 500,
            loyaltyTier: 'GOLD'
          }
        ],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1
      }

      mockCustomerService.getCustomers.mockResolvedValue(mockCustomers)

      const { result } = renderHook(() => useCustomers(2, 10, 'Charlie'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.getCustomers).toHaveBeenCalledWith(2, 10, 'Charlie')
      expect(result.current.data).toEqual(mockCustomers)
    })

    it('should handle fetch customers error', async () => {
      const mockError = new Error('Failed to fetch customers')
      mockCustomerService.getCustomers.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useUpdateCustomer', () => {
    it('should update customer successfully', async () => {
      const customerId = 'customer-123'
      const updateData: UpdateCustomerData = {
        firstName: 'John Updated',
        lastName: 'Doe Updated',
        email: 'john.updated@example.com'
      }
      const mockUpdatedCustomer = {
        id: customerId,
        ...updateData,
        loyaltyPoints: 100,
        loyaltyTier: 'SILVER',
        totalSpent: 500.00
      }

      mockCustomerService.updateCustomer.mockResolvedValue(mockUpdatedCustomer)

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ id: customerId, data: updateData })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.updateCustomer).toHaveBeenCalledWith(customerId, updateData)
      expect(result.current.data).toEqual(mockUpdatedCustomer)
    })

    it('should handle customer update error', async () => {
      const customerId = 'customer-123'
      const updateData: UpdateCustomerData = {
        email: 'invalid-email-format'
      }
      const mockError = new Error('Invalid email format')
      mockCustomerService.updateCustomer.mockRejectedValue(mockError)

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ id: customerId, data: updateData })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(console.error).toHaveBeenCalledWith('Customer update failed:', mockError)
    })
  })

  describe('useSearchCustomers', () => {
    it('should search customers when query is long enough', async () => {
      const searchQuery = 'John'
      const mockSearchResults = [
        {
          id: 'customer-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          loyaltyPoints: 75
        },
        {
          id: 'customer-2',
          firstName: 'Johnny',
          lastName: 'Smith',
          email: 'johnny@example.com',
          loyaltyPoints: 120
        }
      ]

      mockCustomerService.searchCustomers.mockResolvedValue(mockSearchResults)

      const { result } = renderHook(() => useSearchCustomers(searchQuery), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.searchCustomers).toHaveBeenCalledWith(searchQuery)
      expect(result.current.data).toEqual(mockSearchResults)
    })

    it('should not search when query is too short', () => {
      renderHook(() => useSearchCustomers('J'), {
        wrapper: createWrapper()
      })

      expect(mockCustomerService.searchCustomers).not.toHaveBeenCalled()
    })

    it('should handle search error', async () => {
      const searchQuery = 'Error'
      const mockError = new Error('Search failed')
      mockCustomerService.searchCustomers.mockRejectedValue(mockError)

      const { result } = renderHook(() => useSearchCustomers(searchQuery), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })

    it('should handle empty search results', async () => {
      const searchQuery = 'NonExistent'
      mockCustomerService.searchCustomers.mockResolvedValue([])

      const { result } = renderHook(() => useSearchCustomers(searchQuery), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useUpdateLoyaltyPoints', () => {
    it('should update loyalty points successfully', async () => {
      const customerId = 'customer-123'
      const loyaltyUpdate: LoyaltyPointsUpdate = {
        points: 50,
        reason: 'Purchase reward',
        transactionId: 'trans-456'
      }
      const mockResponse = {
        customer: {
          id: customerId,
          firstName: 'John',
          lastName: 'Doe',
          loyaltyPoints: 150,
          loyaltyTier: 'SILVER'
        },
        pointsAdded: 50,
        previousPoints: 100,
        newTier: 'SILVER',
        previousTier: 'BRONZE'
      }

      mockCustomerService.updateLoyaltyPoints.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useUpdateLoyaltyPoints(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ id: customerId, data: loyaltyUpdate })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockCustomerService.updateLoyaltyPoints).toHaveBeenCalledWith(customerId, loyaltyUpdate)
      expect(result.current.data).toEqual(mockResponse)
    })

    it('should handle loyalty points update error', async () => {
      const customerId = 'customer-123'
      const loyaltyUpdate: LoyaltyPointsUpdate = {
        points: -1000, // Invalid negative points
        reason: 'Invalid deduction'
      }
      const mockError = new Error('Invalid loyalty points amount')
      mockCustomerService.updateLoyaltyPoints.mockRejectedValue(mockError)

      const { result } = renderHook(() => useUpdateLoyaltyPoints(), {
        wrapper: createWrapper()
      })

      result.current.mutate({ id: customerId, data: loyaltyUpdate })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(console.error).toHaveBeenCalledWith('Loyalty points update failed:', mockError)
    })
  })

  describe('useCustomerSearch', () => {
    it('should provide search functionality', async () => {
      const searchQuery = 'test'
      const mockSearchResults = [
        {
          id: 'customer-test',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        }
      ]

      mockCustomerService.searchCustomers.mockResolvedValue(mockSearchResults)

      const { result } = renderHook(() => useCustomerSearch(), {
        wrapper: createWrapper()
      })

      const searchResults = await result.current.searchCustomers(searchQuery)

      expect(mockCustomerService.searchCustomers).toHaveBeenCalledWith(searchQuery)
      expect(searchResults).toEqual(mockSearchResults)
    })

    it('should handle search errors', async () => {
      const searchQuery = 'error'
      const mockError = new Error('Search service unavailable')
      mockCustomerService.searchCustomers.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCustomerSearch(), {
        wrapper: createWrapper()
      })

      await expect(result.current.searchCustomers(searchQuery)).rejects.toThrow(mockError)
    })

    it('should use stale time for caching search results', async () => {
      const searchQuery = 'cached'
      const mockSearchResults = [
        {
          id: 'customer-cached',
          firstName: 'Cached',
          lastName: 'User',
          email: 'cached@example.com'
        }
      ]

      mockCustomerService.searchCustomers.mockResolvedValue(mockSearchResults)

      const { result } = renderHook(() => useCustomerSearch(), {
        wrapper: createWrapper()
      })

      // First call
      await result.current.searchCustomers(searchQuery)

      // Second call should use cached data (not make another service call)
      await result.current.searchCustomers(searchQuery)

      expect(mockCustomerService.searchCustomers).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service Unavailable')
      mockCustomerService.getCustomers.mockRejectedValue(serviceError)

      const { result } = renderHook(() => useCustomers(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(serviceError)
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      mockCustomerService.getCustomer.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useCustomer('customer-123'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(timeoutError)
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized')
      mockCustomerService.createCustomer.mockRejectedValue(authError)

      const { result } = renderHook(() => useCreateCustomer(), {
        wrapper: createWrapper()
      })

      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }

      result.current.mutate(customerData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(authError)
    })

    it('should handle validation errors on update', async () => {
      const validationError = new Error('Phone number format is invalid')
      mockCustomerService.updateCustomer.mockRejectedValue(validationError)

      const { result } = renderHook(() => useUpdateCustomer(), {
        wrapper: createWrapper()
      })

      const invalidUpdate = {
        id: 'customer-123',
        data: { phone: '123' } // Invalid phone format
      }

      result.current.mutate(invalidUpdate)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })

    it('should handle concurrent loyalty point updates', async () => {
      const concurrencyError = new Error('Concurrent modification detected')
      mockCustomerService.updateLoyaltyPoints.mockRejectedValue(concurrencyError)

      const { result } = renderHook(() => useUpdateLoyaltyPoints(), {
        wrapper: createWrapper()
      })

      const loyaltyUpdate = {
        id: 'customer-123',
        data: {
          points: 100,
          reason: 'Concurrent update test'
        }
      }

      result.current.mutate(loyaltyUpdate)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(concurrencyError)
    })
  })
})