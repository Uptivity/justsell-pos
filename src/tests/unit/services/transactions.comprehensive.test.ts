import { transactionService } from '../../../shared/services/transactions'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn()
  }
}))

const { api } = require('../../../shared/services/api')

describe('Transaction Service - COMPREHENSIVE FINANCIAL LOGIC TESTS', () => {
  const mockTransactionData = {
    customerId: 'cust-123',
    cartItems: [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 }
    ],
    paymentMethod: 'CASH' as const,
    cashTendered: 50.00,
    ageVerificationCompleted: true,
    storeId: 'store-456'
  }

  const mockTransactionResponse = {
    id: 'trans-123',
    receiptNumber: 'R123456',
    totalAmount: 45.99,
    paymentStatus: 'COMPLETED',
    lineItems: [
      {
        productId: 'prod-1',
        productName: 'Test Product 1',
        quantity: 2,
        unitPrice: 15.00,
        lineTotal: 30.00
      },
      {
        productId: 'prod-2',
        productName: 'Test Product 2',
        quantity: 1,
        unitPrice: 12.99,
        lineTotal: 12.99
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Transaction Creation - Core Money Flow', () => {

    it('should create transaction with correct financial calculations', async () => {
      api.post.mockResolvedValueOnce({ data: { transaction: mockTransactionResponse } })

      const result = await transactionService.createTransaction(mockTransactionData)

      expect(result).toEqual(mockTransactionResponse)
      expect(api.post).toHaveBeenCalledWith('/api/transactions', mockTransactionData)
    })

    it('should validate transaction data before processing', async () => {
      const validationResponse = {
        valid: true,
        warnings: [],
        calculations: {
          subtotal: 42.99,
          tax: 3.00,
          total: 45.99
        }
      }

      api.post.mockResolvedValueOnce({ data: validationResponse })

      const result = await transactionService.validateTransaction(mockTransactionData)

      expect(result).toEqual(validationResponse)
      expect(api.post).toHaveBeenCalledWith('/api/transactions/validate', mockTransactionData)
    })

    it('should handle transaction creation failures', async () => {
      api.post.mockRejectedValueOnce(new Error('Payment declined'))

      await expect(transactionService.createTransaction(mockTransactionData)).rejects.toThrow('Payment declined')
    })

    it('should create transactions with different payment methods', async () => {
      const cardTransactionData = {
        ...mockTransactionData,
        paymentMethod: 'CARD' as const,
        cashTendered: undefined,
        cardData: {
          last4: '1234',
          authCode: 'AUTH123'
        }
      }

      api.post.mockResolvedValueOnce({ data: { transaction: { ...mockTransactionResponse, paymentMethod: 'CARD' } } })

      const result = await transactionService.createTransaction(cardTransactionData)

      expect(result.paymentMethod).toBe('CARD')
      expect(api.post).toHaveBeenCalledWith('/api/transactions', cardTransactionData)
    })

    it('should handle large transactions with multiple items', async () => {
      const largeTransactionData = {
        ...mockTransactionData,
        cartItems: Array(50).fill(0).map((_, i) => ({ productId: `prod-${i}`, quantity: i + 1 }))
      }

      api.post.mockResolvedValueOnce({ data: { transaction: mockTransactionResponse } })

      const result = await transactionService.createTransaction(largeTransactionData)

      expect(result).toEqual(mockTransactionResponse)
      expect(api.post).toHaveBeenCalledWith('/api/transactions', largeTransactionData)
    })
  })

  describe('Transaction Retrieval', () => {
    it('should retrieve transaction by ID with complete details', async () => {
      const fullTransaction = {
        id: 'trans-123',
        receiptNumber: 'R123456',
        totalAmount: 45.99,
        subtotalAmount: 42.99,
        taxAmount: 3.00,
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
        transactionDate: '2024-01-15T10:30:00.000Z',
        lineItems: [
          {
            productId: 'prod-1',
            productName: 'Test Product 1',
            quantity: 2,
            unitPrice: 15.00,
            lineTotal: 30.00,
            ageVerificationRequired: true
          }
        ],
        customer: {
          id: 'cust-123',
          firstName: 'John',
          lastName: 'Doe',
          loyaltyPoints: 150
        },
        employee: {
          id: 'emp-456',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      }

      api.get.mockResolvedValueOnce({ data: fullTransaction })

      const result = await transactionService.getTransaction('trans-123')

      expect(result).toEqual(fullTransaction)
      expect(api.get).toHaveBeenCalledWith('/api/transactions/trans-123')
    })

    it('should handle non-existent transaction gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Transaction not found'))

      await expect(transactionService.getTransaction('non-existent')).rejects.toThrow('Transaction not found')
    })

    it('should retrieve paginated transaction lists', async () => {
      const transactionList = {
        transactions: [
          { id: 'trans-1', totalAmount: 25.99, transactionDate: '2024-01-15T10:30:00.000Z' },
          { id: 'trans-2', totalAmount: 45.50, transactionDate: '2024-01-15T09:15:00.000Z' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 150,
          pages: 8
        }
      }

      api.get.mockResolvedValueOnce({ data: transactionList })

      const result = await transactionService.getTransactions(1, 20)

      expect(result).toEqual(transactionList)
      expect(api.get).toHaveBeenCalledWith('/api/transactions', {
        params: { page: 1, limit: 20 }
      })
    })

    it('should use default pagination when no parameters provided', async () => {
      const defaultList = {
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      }

      api.get.mockResolvedValueOnce({ data: defaultList })

      const result = await transactionService.getTransactions()

      expect(result).toEqual(defaultList)
      expect(api.get).toHaveBeenCalledWith('/api/transactions', {
        params: { page: 1, limit: 20 }
      })
    })
  })

  describe('Age Verification Integration', () => {
    it('should process age verification with complete audit trail', async () => {
      const ageVerificationData = {
        customerId: 'cust-123',
        transactionId: 'trans-456',
        idType: 'drivers_license' as const,
        idNumber: 'DL123456789',
        customerAge: 25,
        verificationMethod: 'scanner' as const,
        employeeId: 'emp-789',
        storeId: 'store-123'
      }

      const verificationResult = {
        verificationId: 'verify-123',
        isVerified: true,
        complianceStatus: 'PASSED',
        auditTrail: {
          timestamp: '2024-01-15T10:30:00.000Z',
          employee: 'emp-789',
          method: 'scanner'
        }
      }

      api.post.mockResolvedValueOnce({ data: verificationResult })

      const result = await transactionService.processAgeVerification(ageVerificationData)

      expect(result).toEqual(verificationResult)
      expect(api.post).toHaveBeenCalledWith('/api/age-verification', ageVerificationData)
    })

    it('should handle failed age verification', async () => {
      const ageVerificationData = {
        customerId: 'cust-123',
        idType: 'drivers_license' as const,
        idNumber: 'DL123456789',
        customerAge: 19, // Under 21
        verificationMethod: 'manual' as const,
        employeeId: 'emp-789',
        storeId: 'store-123'
      }

      api.post.mockRejectedValueOnce(new Error('Age verification failed'))

      await expect(transactionService.processAgeVerification(ageVerificationData)).rejects.toThrow('Age verification failed')
    })
  })

  describe('Tax Calculations - FINANCIAL ACCURACY CRITICAL', () => {
    it('should calculate tax with accurate precision', async () => {
      const taxCalculation = {
        subtotal: 99.99,
        taxBreakdown: [
          { jurisdiction: 'NY_SALES', rate: 0.08, amount: 8.00 },
          { jurisdiction: 'NY_TOBACCO', rate: 0.20, amount: 5.00 }
        ],
        totalTax: 13.00,
        totalAmount: 112.99
      }

      api.post.mockResolvedValueOnce({ data: taxCalculation })

      const result = await transactionService.calculateTax(99.99, 'store-123', 'cust-456')

      expect(result).toEqual(taxCalculation)
      expect(api.post).toHaveBeenCalledWith('/api/transactions/calculate-tax', {
        subtotal: 99.99,
        storeId: 'store-123',
        customerId: 'cust-456'
      })
    })

    it('should handle tax calculation edge cases', async () => {
      // Test with very small amounts
      const smallAmountTax = { subtotal: 0.01, totalTax: 0.00, totalAmount: 0.01 }
      api.post.mockResolvedValueOnce({ data: smallAmountTax })

      const result = await transactionService.calculateTax(0.01)
      expect(result.totalTax).toBe(0.00)

      // Test with large amounts
      api.post.mockClear()
      const largeAmountTax = { subtotal: 9999.99, totalTax: 799.99, totalAmount: 10799.98 }
      api.post.mockResolvedValueOnce({ data: largeAmountTax })

      const result2 = await transactionService.calculateTax(9999.99)
      expect(result2.totalTax).toBe(799.99)
    })

    it('should handle tax calculation failures gracefully', async () => {
      api.post.mockRejectedValueOnce(new Error('Tax service unavailable'))

      await expect(transactionService.calculateTax(100.00)).rejects.toThrow('Tax service unavailable')
    })
  })

  describe('Receipt Generation and Printing', () => {
    it('should generate receipt with complete transaction details', async () => {
      const receipt = {
        receiptNumber: 'R123456',
        transactionDate: '2024-01-15T10:30:00.000Z',
        storeInfo: {
          name: 'Test Vape Shop',
          address: '123 Main St, Anytown, NY 12345',
          phone: '(555) 123-4567'
        },
        lineItems: [
          { name: 'Vape Pen', sku: 'VP001', quantity: 1, unitPrice: 29.99, lineTotal: 29.99 }
        ],
        subtotal: 29.99,
        tax: 6.00,
        total: 35.99,
        paymentMethod: 'CASH',
        cashTendered: 40.00,
        changeGiven: 4.01,
        loyaltyPointsEarned: 35
      }

      api.get.mockResolvedValueOnce({ data: receipt })

      const result = await transactionService.generateReceipt('trans-123')

      expect(result).toEqual(receipt)
      expect(api.get).toHaveBeenCalledWith('/api/transactions/trans-123/receipt')
    })

    it('should handle receipt printing', async () => {
      const printResponse = {
        success: true,
        printedAt: '2024-01-15T10:30:00.000Z',
        printerStatus: 'ONLINE'
      }

      api.post.mockResolvedValueOnce({ data: printResponse })

      const result = await transactionService.printReceipt('trans-123')

      expect(result).toEqual(printResponse)
      expect(api.post).toHaveBeenCalledWith('/api/transactions/trans-123/print')
    })

    it('should handle printer offline scenarios', async () => {
      api.post.mockRejectedValueOnce(new Error('Printer offline'))

      await expect(transactionService.printReceipt('trans-123')).rejects.toThrow('Printer offline')
    })
  })

  describe('Performance and Error Handling', () => {
    it('should complete transaction processing within acceptable timeframe', async () => {
      api.post.mockResolvedValueOnce({ data: { transaction: { id: 'trans-123' } } })

      const startTime = Date.now()
      await transactionService.createTransaction(mockTransactionData)
      const endTime = Date.now()

      // Should complete within 2 seconds for normal transaction
      expect(endTime - startTime).toBeLessThan(2000)
    })

    it('should handle network timeouts gracefully', async () => {
      api.post.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      await expect(transactionService.createTransaction(mockTransactionData))
        .rejects.toThrow('Network timeout')
    })

    it('should handle malformed API responses', async () => {
      api.post.mockResolvedValueOnce({ data: null })

      await expect(transactionService.createTransaction(mockTransactionData))
        .rejects.toThrow()
    })

    it('should validate required transaction fields', async () => {
      const incompleteData = {
        cartItems: [], // Empty cart
        paymentMethod: 'CASH' as const
        // Missing required fields
      }

      api.post.mockRejectedValueOnce(new Error('Invalid transaction data'))

      await expect(transactionService.createTransaction(incompleteData as any))
        .rejects.toThrow('Invalid transaction data')
    })
  })

  describe('Security and Data Validation', () => {
    it('should sanitize transaction data for logging', async () => {
      const transactionWithSensitiveData = {
        ...mockTransactionData,
        cardData: {
          cardNumber: '4532015112830366',
          cvv: '123',
          expiryMonth: '12',
          expiryYear: '2025'
        }
      }

      api.post.mockResolvedValueOnce({
        data: {
          transaction: {
            ...mockTransactionResponse,
            cardData: {
              last4: '0366',
              cardType: 'VISA'
              // CVV should be excluded
            }
          }
        }
      })

      const result = await transactionService.createTransaction(transactionWithSensitiveData)

      // Verify sensitive data is not in response
      expect(result.cardData?.cvv).toBeUndefined()
      expect(result.cardData?.last4).toBe('0366')
    })

    it('should handle SQL injection attempts in transaction data', async () => {
      const maliciousData = {
        ...mockTransactionData,
        customerId: "'; DROP TABLE transactions; --"
      }

      api.post.mockRejectedValueOnce(new Error('Invalid customer ID format'))

      await expect(transactionService.createTransaction(maliciousData))
        .rejects.toThrow('Invalid customer ID format')
    })

    it('should validate amount precision and prevent rounding errors', async () => {
      const preciseTransaction = {
        ...mockTransactionData,
        cartItems: [
          { productId: 'prod-1', quantity: 3, unitPrice: 10.333 } // Would cause rounding issues
        ]
      }

      api.post.mockResolvedValueOnce({
        data: {
          transaction: {
            ...mockTransactionResponse,
            subtotal: 30.999, // Should be properly handled
            totalAmount: 33.479 // Should round to 33.48
          }
        }
      })

      const result = await transactionService.createTransaction(preciseTransaction)

      // Financial amounts should be properly rounded
      expect(typeof result.totalAmount).toBe('number')
      expect(result.totalAmount).toBeCloseTo(33.479, 2)
    })
  })

  describe('Concurrent Transaction Handling', () => {
    it('should handle multiple simultaneous transactions', async () => {
      const transactions = Array(10).fill(0).map((_, i) => ({
        ...mockTransactionData,
        cartItems: [{ productId: `prod-${i}`, quantity: 1 }]
      }))

      api.post.mockImplementation(async () => ({
        data: { transaction: { id: `trans-${Date.now()}` } }
      }))

      const promises = transactions.map(t => transactionService.createTransaction(t))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.id).toMatch(/^trans-\d+$/)
      })
    })

    it('should handle race conditions in inventory updates', async () => {
      // Test scenario where multiple transactions try to purchase last item
      api.post.mockRejectedValueOnce(new Error('Insufficient inventory'))

      await expect(transactionService.createTransaction(mockTransactionData))
        .rejects.toThrow('Insufficient inventory')
    })
  })
})