import { customerService } from '../../../shared/services/customers'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

import { api } from '../../../shared/services/api'
const mockedApi = api as jest.Mocked<typeof api>

describe('Customer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create customer', async () => {
    const customerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-123-4567'
    }

    const mockResponse = {
      id: 'cust-123',
      ...customerData,
      loyaltyNumber: 'LTY123'
    }

    mockedApi.post.mockResolvedValueOnce({
      data: { customer: mockResponse }
    })

    const result = await customerService.createCustomer(customerData)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.post).toHaveBeenCalledWith('/api/customers', customerData)
  })

  it('should get customer by ID', async () => {
    const mockCustomer = {
      id: 'cust-123',
      firstName: 'John',
      lastName: 'Doe'
    }

    mockedApi.get.mockResolvedValueOnce({
      data: mockCustomer
    })

    const result = await customerService.getCustomer('cust-123')

    expect(result).toEqual(mockCustomer)
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers/cust-123')
  })

  it('should get customers list', async () => {
    const mockCustomers = {
      customers: [
        { id: 'cust-1', firstName: 'John' },
        { id: 'cust-2', firstName: 'Jane' }
      ],
      total: 2
    }

    mockedApi.get.mockResolvedValueOnce({
      data: mockCustomers
    })

    const result = await customerService.getCustomers(1, 20)

    expect(result).toEqual(mockCustomers)
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers', {
      params: { page: 1, limit: 20 }
    })
  })

  it('should search customers', async () => {
    const mockResults = {
      customers: [{ id: 'cust-1', firstName: 'John' }],
      total: 1
    }

    mockedApi.get.mockResolvedValueOnce({
      data: mockResults
    })

    const result = await customerService.getCustomers(1, 20, 'john')

    expect(result).toEqual(mockResults)
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers', {
      params: { page: 1, limit: 20, search: 'john' }
    })
  })

  it('should update customer', async () => {
    const updateData = {
      firstName: 'Jane',
      email: 'jane@example.com'
    }

    const mockResponse = {
      id: 'cust-123',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com'
    }

    mockedApi.put.mockResolvedValueOnce({
      data: { customer: mockResponse }
    })

    const result = await customerService.updateCustomer('cust-123', updateData)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.put).toHaveBeenCalledWith('/api/customers/cust-123', updateData)
  })

  it('should quick search customers for POS', async () => {
    const mockResults = [
      { id: 'cust-1', firstName: 'John', lastName: 'Doe', loyaltyNumber: 'LTY123' }
    ]

    mockedApi.get.mockResolvedValueOnce({
      data: { customers: mockResults }
    })

    const result = await customerService.searchCustomers('john')

    expect(result).toEqual(mockResults)
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers/search', {
      params: { q: 'john' }
    })
  })

  it('should return empty array for short search query', async () => {
    const result = await customerService.searchCustomers('j')

    expect(result).toEqual([])
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('should update loyalty points', async () => {
    const loyaltyUpdate = {
      points: 100,
      reason: 'Purchase reward'
    }

    const mockResponse = {
      customerId: 'cust-123',
      pointsAdded: 100,
      newBalance: 250
    }

    mockedApi.post.mockResolvedValueOnce({
      data: mockResponse
    })

    const result = await customerService.updateLoyaltyPoints('cust-123', loyaltyUpdate)

    expect(result).toEqual(mockResponse)
    expect(mockedApi.post).toHaveBeenCalledWith('/api/customers/cust-123/loyalty', loyaltyUpdate)
  })

  describe('Loyalty Points Calculation', () => {
    it('should calculate loyalty points correctly', () => {
      expect(customerService.calculateLoyaltyPoints(25.99)).toBe(25)
      expect(customerService.calculateLoyaltyPoints(100.50)).toBe(100)
      expect(customerService.calculateLoyaltyPoints(0.99)).toBe(0)
    })
  })

  describe('Loyalty Tier System', () => {
    it('should identify BRONZE tier correctly', () => {
      const tierInfo = customerService.getLoyaltyTierInfo(250)

      expect(tierInfo.currentTier).toBe('BRONZE')
      expect(tierInfo.nextTier).toBe('SILVER')
      expect(tierInfo.amountToNextTier).toBe(250)
    })

    it('should identify SILVER tier correctly', () => {
      const tierInfo = customerService.getLoyaltyTierInfo(1000)

      expect(tierInfo.currentTier).toBe('SILVER')
      expect(tierInfo.nextTier).toBe('GOLD')
      expect(tierInfo.amountToNextTier).toBe(1000)
    })

    it('should identify GOLD tier correctly', () => {
      const tierInfo = customerService.getLoyaltyTierInfo(3000)

      expect(tierInfo.currentTier).toBe('GOLD')
      expect(tierInfo.nextTier).toBe('PLATINUM')
      expect(tierInfo.amountToNextTier).toBe(2000)
    })

    it('should identify PLATINUM tier correctly', () => {
      const tierInfo = customerService.getLoyaltyTierInfo(6000)

      expect(tierInfo.currentTier).toBe('PLATINUM')
      expect(tierInfo.nextTier).toBeUndefined()
      expect(tierInfo.amountToNextTier).toBe(0)
    })

    it('should calculate progress within tier correctly', () => {
      const tierInfo = customerService.getLoyaltyTierInfo(750) // 250 into SILVER tier

      expect(tierInfo.currentTier).toBe('SILVER')
      expect(tierInfo.progress).toBeCloseTo(16.67, 1) // 250/1500 * 100
    })
  })

  describe('Customer Data Validation', () => {
    it('should validate customer data successfully', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '555-123-4567',
        zipCode: '12345'
      }

      const errors = customerService.validateCustomer(validData)

      expect(errors).toHaveLength(0)
    })

    it('should catch invalid first name', () => {
      const invalidData = {
        firstName: 'J',
        lastName: 'Doe'
      }

      const errors = customerService.validateCustomer(invalidData)

      expect(errors).toContain('First name must be at least 2 characters')
    })

    it('should catch invalid last name', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'D'
      }

      const errors = customerService.validateCustomer(invalidData)

      expect(errors).toContain('Last name must be at least 2 characters')
    })

    it('should catch invalid email format', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      }

      const errors = customerService.validateCustomer(invalidData)

      expect(errors).toContain('Invalid email format')
    })

    it('should catch invalid phone number', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '123'
      }

      const errors = customerService.validateCustomer(invalidData)

      expect(errors).toContain('Invalid phone number format')
    })

    it('should catch invalid ZIP code', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        zipCode: '123'
      }

      const errors = customerService.validateCustomer(invalidData)

      expect(errors).toContain('Invalid ZIP code format')
    })

    it('should accept valid ZIP+4 format', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        zipCode: '12345-6789'
      }

      const errors = customerService.validateCustomer(validData)

      expect(errors).toHaveLength(0)
    })
  })
})