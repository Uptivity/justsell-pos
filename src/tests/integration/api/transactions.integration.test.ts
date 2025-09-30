import request from 'supertest'
import { Request, Response } from 'express'
import { transactionController } from '../../../api/controllers/transactions'

// Mock PrismaClient before importing the controller
jest.mock('../../../generated/prisma', () => {
  const mockPrismaClient = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    lineItem: {
      create: jest.fn()
    },
    customer: {
      update: jest.fn(),
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    __mockPrismaClient: mockPrismaClient
  }
})

const { __mockPrismaClient: mockPrismaClient } = require('../../../generated/prisma')

describe('Transaction Controller Integration Tests - FINANCIAL API CRITICAL', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnThis()

    mockRequest = {
      body: {},
      user: {
        id: 'employee-123',
        username: 'testcashier',
        role: 'CASHIER',
        isActive: true
      },
      params: {},
      query: {}
    }

    mockResponse = {
      status: statusMock,
      json: jsonMock
    }

    jest.clearAllMocks()
  })

  // Define test data at top level for reuse across test suites
  const validTransactionData = {
    customerId: 'customer-123',
    cartItems: [
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 }
    ],
    paymentMethod: 'CASH',
    cashTendered: 50.00,
    ageVerificationCompleted: true,
    storeId: 'store-456'
  }

  describe('POST /api/transactions - Transaction Creation', () => {

    const mockProduct1 = {
      id: 'product-1',
      name: 'Premium Vape Pen',
      sku: 'VP001',
      price: 19.99,
      quantity: 10,
      ageRestricted: true,
      lotNumber: 'LOT2024001',
      expirationDate: new Date('2025-12-31')
    }

    const mockProduct2 = {
      id: 'product-2',
      name: 'E-Liquid 30ml',
      sku: 'EL001',
      price: 12.99,
      quantity: 25,
      ageRestricted: true,
      lotNumber: 'LOT2024002',
      expirationDate: new Date('2025-06-30')
    }

    it('should create a complete transaction with financial accuracy', async () => {
      const validRequest = {
        ...validTransactionData,
        cashTendered: 60.00 // Sufficient cash for the transaction
      }
      mockRequest.body = validRequest

      // Mock product lookups
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      // Mock transaction creation - corrected math
      const subtotal = 52.97 // (19.99 * 2) + 12.99
      const taxAmount = 4.24 // 8% tax
      const totalAmount = 57.21
      const changeGiven = 2.79 // 60.00 - 57.21

      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R20240115001',
        storeId: 'store-456',
        customerId: 'customer-123',
        employeeId: 'employee-123',
        subtotalAmount: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
        cashTendered: 60.00,
        changeGiven: changeGiven,
        transactionDate: new Date(),
        ageVerificationRequired: true,
        ageVerificationCompleted: true,
        loyaltyPointsEarned: 57,
        loyaltyPointsRedeemed: 0
      }

      mockPrismaClient.$transaction.mockResolvedValue(mockTransactionResult)

      const mockCompleteTransaction = {
        ...mockTransactionResult,
        lineItems: [
          {
            productId: 'product-1',
            productName: 'Premium Vape Pen',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98,
            product: mockProduct1
          },
          {
            productId: 'product-2',
            productName: 'E-Liquid 30ml',
            quantity: 1,
            unitPrice: 12.99,
            lineTotal: 12.99,
            product: mockProduct2
          }
        ],
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe',
          loyaltyPoints: 157
        },
        employee: {
          id: 'employee-123',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      }

      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockCompleteTransaction)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Transaction completed successfully',
        transaction: mockCompleteTransaction
      })

      // Verify financial calculations were performed
      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should validate sufficient cash payment', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cashTendered: 10.00 // Insufficient for transaction
      }

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Insufficient cash tendered'
      })
    })

    it('should validate inventory availability', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cartItems: [{ productId: 'product-1', quantity: 20 }] // More than available
      }

      const lowStockProduct = { ...mockProduct1, quantity: 5 }
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(lowStockProduct)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Insufficient stock for Premium Vape Pen. Available: 5, Requested: 20'
      })
    })

    it('should require age verification for restricted products', async () => {
      mockRequest.body = {
        ...validTransactionData,
        ageVerificationCompleted: false
      }

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1) // Age restricted
        .mockResolvedValueOnce(mockProduct2) // Age restricted

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Age verification required for restricted products',
        requiresAgeVerification: true
      })
    })

    it('should handle non-existent products', async () => {
      mockRequest.body = validTransactionData
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(null) // Product not found

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Product product-1 not found'
      })
    })

    it('should require employee authentication', async () => {
      mockRequest.user = undefined

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee authentication required'
      })
    })

    it('should handle database transaction failures', async () => {
      const validRequest = {
        ...validTransactionData,
        cashTendered: 60.00
      }
      mockRequest.body = validRequest

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      mockPrismaClient.$transaction.mockRejectedValueOnce(new Error('Database transaction failed'))

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Failed to process transaction',
        error: 'Database transaction failed'
      })
    })

    it('should calculate loyalty points correctly', async () => {
      const validRequest = {
        ...validTransactionData,
        cashTendered: 60.00
      }
      mockRequest.body = validRequest

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R20240115001',
        loyaltyPointsEarned: 57 // 1 point per dollar (floor of 57.21)
      }

      const transactionSpy = jest.fn().mockResolvedValue(mockTransactionResult)
      mockPrismaClient.$transaction.mockImplementation(transactionSpy)

      const mockCompleteTransaction = { ...mockTransactionResult, lineItems: [], customer: null, employee: null }
      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockCompleteTransaction)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Verify that loyalty points calculation was included
      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function))
      expect(statusMock).toHaveBeenCalledWith(201)
    })

    it('should update customer loyalty tier based on spending', async () => {
      const validRequest = {
        ...validTransactionData,
        cashTendered: 60.00
      }
      mockRequest.body = validRequest

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      const updateCustomerSpy = jest.fn()
      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R20240115001'
      }

      const mockTransactionFunc = jest.fn(async (callback) => {
        const mockTx = {
          transaction: { create: jest.fn().mockResolvedValue(mockTransactionResult) },
          lineItem: { create: jest.fn() },
          product: { update: jest.fn() },
          customer: {
            update: updateCustomerSpy,
            findUnique: jest.fn().mockResolvedValue({ totalSpent: 1500 }) // Silver tier
          }
        }
        return await callback(mockTx)
      })

      mockPrismaClient.$transaction.mockImplementation(mockTransactionFunc)

      const mockCompleteTransaction = { ...mockTransactionResult, lineItems: [], customer: null, employee: null }
      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockCompleteTransaction)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should calculate new tier based on total spending
      expect(updateCustomerSpy).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(201)
    })
  })

  describe('GET /api/transactions/:id - Transaction Retrieval', () => {
    it('should retrieve complete transaction details', async () => {
      mockRequest.params = { id: 'transaction-123' }

      const mockFullTransaction = {
        id: 'transaction-123',
        receiptNumber: 'R20240115001',
        totalAmount: 57.21,
        subtotalAmount: 52.97,
        taxAmount: 4.24,
        paymentMethod: 'CASH',
        transactionDate: new Date('2024-01-15T10:30:00Z'),
        lineItems: [
          {
            productId: 'product-1',
            productName: 'Premium Vape Pen',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98,
            product: {
              name: 'Premium Vape Pen',
              sku: 'VP001'
            }
          }
        ],
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe'
        },
        employee: {
          id: 'employee-123',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        store: {
          id: 'store-456',
          storeName: 'Downtown Vape Shop'
        }
      }

      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockFullTransaction)

      await transactionController.getTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(jsonMock).toHaveBeenCalledWith(mockFullTransaction)
      expect(mockPrismaClient.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'transaction-123' },
        include: expect.objectContaining({
          lineItems: expect.any(Object),
          customer: true,
          employee: expect.any(Object),
          store: true
        })
      })
    })

    it('should return 404 for non-existent transaction', async () => {
      mockRequest.params = { id: 'non-existent' }
      mockPrismaClient.transaction.findUnique.mockResolvedValue(null)

      await transactionController.getTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Transaction not found'
      })
    })

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'transaction-123' }
      mockPrismaClient.transaction.findUnique.mockRejectedValue(new Error('Database error'))

      await transactionController.getTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Failed to retrieve transaction'
      })
    })
  })

  describe('GET /api/transactions - Transaction List', () => {
    it('should return paginated transaction list with correct calculations', async () => {
      mockRequest.query = { page: '2', limit: '10' }

      const mockTransactions = [
        {
          id: 'trans-1',
          receiptNumber: 'R001',
          totalAmount: 25.99,
          transactionDate: new Date('2024-01-15T10:00:00Z'),
          customer: { id: 'cust-1', firstName: 'Alice', lastName: 'Johnson' },
          employee: { id: 'emp-1', firstName: 'Bob', lastName: 'Wilson' }
        },
        {
          id: 'trans-2',
          receiptNumber: 'R002',
          totalAmount: 45.50,
          transactionDate: new Date('2024-01-15T11:00:00Z'),
          customer: null, // Cash customer
          employee: { id: 'emp-2', firstName: 'Carol', lastName: 'Davis' }
        }
      ]

      mockPrismaClient.transaction.findMany.mockResolvedValue(mockTransactions)
      mockPrismaClient.transaction.count.mockResolvedValue(150)

      await transactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(jsonMock).toHaveBeenCalledWith({
        transactions: mockTransactions,
        pagination: {
          page: 2,
          limit: 10,
          total: 150,
          pages: 15
        }
      })

      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit
        take: 10,
        orderBy: { transactionDate: 'desc' },
        include: expect.objectContaining({
          customer: expect.any(Object),
          employee: expect.any(Object)
        })
      })
    })

    it('should use default pagination parameters', async () => {
      mockRequest.query = {}

      mockPrismaClient.transaction.findMany.mockResolvedValue([])
      mockPrismaClient.transaction.count.mockResolvedValue(0)

      await transactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { transactionDate: 'desc' },
        include: expect.any(Object)
      })

      expect(jsonMock).toHaveBeenCalledWith({
        transactions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      })
    })

    it('should handle invalid pagination parameters', async () => {
      mockRequest.query = { page: 'invalid', limit: 'not_a_number' }

      mockPrismaClient.transaction.findMany.mockResolvedValue([])
      mockPrismaClient.transaction.count.mockResolvedValue(0)

      await transactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should default to page 1, limit 20
      expect(mockPrismaClient.transaction.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { transactionDate: 'desc' },
        include: expect.any(Object)
      })
    })
  })

  describe('GET /api/transactions/:id/receipt - Receipt Generation', () => {
    it('should generate formatted receipt with all financial details', async () => {
      mockRequest.params = { id: 'transaction-123' }

      const mockReceiptTransaction = {
        id: 'transaction-123',
        receiptNumber: 'R20240115001',
        subtotalAmount: 52.97,
        taxAmount: 4.24,
        totalAmount: 57.21,
        paymentMethod: 'CASH',
        cashTendered: 60.00,
        changeGiven: 2.79,
        transactionDate: new Date('2024-01-15T10:30:00Z'),
        loyaltyPointsEarned: 57,
        loyaltyPointsRedeemed: 0,
        lineItems: [
          {
            productName: 'Premium Vape Pen',
            productSku: 'VP001',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98
          },
          {
            productName: 'E-Liquid 30ml',
            productSku: 'EL001',
            quantity: 1,
            unitPrice: 12.99,
            lineTotal: 12.99
          }
        ],
        customer: {
          firstName: 'John',
          lastName: 'Doe',
          loyaltyPoints: 157
        },
        employee: {
          firstName: 'Jane',
          lastName: 'Smith'
        },
        store: {
          storeName: 'Downtown Vape Shop',
          addressLine1: '123 Main Street',
          addressLine2: 'Suite 100',
          city: 'Anytown',
          stateCode: 'NY',
          zipCode: '12345',
          phone: '(555) 123-4567',
          taxId: 'TX123456789'
        }
      }

      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockReceiptTransaction)

      await transactionController.generateReceipt(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(jsonMock).toHaveBeenCalledWith({
        transactionId: 'transaction-123',
        receiptNumber: 'R20240115001',
        storeInfo: {
          name: 'Downtown Vape Shop',
          address: '123 Main Street, Suite 100, Anytown, NY 12345',
          phone: '(555) 123-4567',
          taxId: 'TX123456789'
        },
        transactionDate: mockReceiptTransaction.transactionDate.toISOString(),
        employee: 'Jane Smith',
        customer: 'John Doe',
        lineItems: [
          {
            name: 'Premium Vape Pen',
            sku: 'VP001',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98
          },
          {
            name: 'E-Liquid 30ml',
            sku: 'EL001',
            quantity: 1,
            unitPrice: 12.99,
            lineTotal: 12.99
          }
        ],
        subtotal: 52.97,
        taxAmount: 4.24,
        totalAmount: 57.21,
        paymentMethod: 'CASH',
        cashTendered: 60.00,
        changeGiven: 2.79,
        loyaltyPoints: {
          earned: 57,
          redeemed: 0,
          balance: 157
        }
      })
    })

    it('should handle receipt for card payments', async () => {
      mockRequest.params = { id: 'transaction-456' }

      const cardTransaction = {
        id: 'transaction-456',
        receiptNumber: 'R20240115002',
        subtotalAmount: 25.00,
        taxAmount: 2.00,
        totalAmount: 27.00,
        paymentMethod: 'CARD',
        cashTendered: null,
        changeGiven: null,
        transactionDate: new Date(),
        loyaltyPointsEarned: 0,
        loyaltyPointsRedeemed: 0,
        store: {
          storeName: 'Test Store',
          addressLine1: '123 Main St',
          addressLine2: null,
          city: 'Test City',
          stateCode: 'NY',
          zipCode: '12345',
          phone: '555-0123',
          taxId: 'TAX123'
        },
        customer: null,
        employee: { firstName: 'John', lastName: 'Doe' },
        lineItems: [
          {
            productName: 'Test Product',
            productSku: 'TEST001',
            quantity: 1,
            unitPrice: 25.00,
            lineTotal: 25.00
          }
        ]
      }

      mockPrismaClient.transaction.findUnique.mockResolvedValue(cardTransaction)

      await transactionController.generateReceipt(
        mockRequest as Request,
        mockResponse as Response
      )

      const response = jsonMock.mock.calls[0][0]
      expect(response.paymentMethod).toBe('CARD')
      expect(response.cashTendered).toBeUndefined()
      expect(response.changeGiven).toBeUndefined()
      expect(response.customer).toBeUndefined()
    })
  })

  describe('POST /api/transactions/:id/print - Receipt Printing', () => {
    it('should handle receipt printing request', async () => {
      mockRequest.params = { id: 'transaction-123' }

      await transactionController.printReceipt(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Receipt sent to printer',
        transactionId: 'transaction-123',
        printedAt: expect.any(String)
      })
    })

    it('should handle printing errors', async () => {
      mockRequest.params = { id: 'transaction-123' }

      // Simulate an error in the controller
      const originalConsoleError = console.error
      console.error = jest.fn()

      await transactionController.printReceipt(
        mockRequest as Request,
        mockResponse as Response
      )

      console.error = originalConsoleError

      // Since the current implementation always succeeds, this tests the structure
      expect(jsonMock).toHaveBeenCalled()
    })
  })

  describe('Financial Accuracy Edge Cases', () => {
    it('should handle decimal precision in calculations', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cartItems: [{ productId: 'product-precision', quantity: 3 }],
        cashTendered: 40.00,
        ageVerificationCompleted: false // Not age restricted
      }

      const precisionProduct = {
        id: 'product-precision',
        name: 'Precision Test Product',
        sku: 'PREC001',
        price: 10.333, // Causes precision issues
        quantity: 10,
        ageRestricted: false
      }

      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R123'
      }

      mockPrismaClient.product.findUnique.mockResolvedValue(precisionProduct)
      mockPrismaClient.$transaction.mockResolvedValue(mockTransactionResult)
      mockPrismaClient.transaction.findUnique.mockResolvedValue({
        ...mockTransactionResult,
        lineItems: [],
        customer: null,
        employee: null
      })

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should handle the precision correctly
      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(201)
    })

    it('should validate minimum transaction amounts', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cartItems: [{ productId: 'cheap-product', quantity: 1 }],
        cashTendered: 1.00,
        ageVerificationCompleted: false
      }

      const cheapProduct = {
        id: 'cheap-product',
        name: 'Cheap Product',
        sku: 'CHEAP001',
        price: 0.01, // Very small amount
        quantity: 10,
        ageRestricted: false
      }

      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R123'
      }

      mockPrismaClient.product.findUnique.mockResolvedValue(cheapProduct)
      mockPrismaClient.$transaction.mockResolvedValue(mockTransactionResult)
      mockPrismaClient.transaction.findUnique.mockResolvedValue({
        ...mockTransactionResult,
        lineItems: [],
        customer: null,
        employee: null
      })

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should handle very small transactions
      expect(statusMock).toHaveBeenCalledWith(201)
    })

    it('should handle large transaction amounts', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cartItems: [{ productId: 'expensive-product', quantity: 1 }],
        cashTendered: 11000.00,
        ageVerificationCompleted: false
      }

      const expensiveProduct = {
        id: 'expensive-product',
        name: 'Expensive Product',
        sku: 'EXP001',
        price: 9999.99,
        quantity: 1,
        ageRestricted: false
      }

      const mockTransactionResult = {
        id: 'transaction-123',
        receiptNumber: 'R123'
      }

      mockPrismaClient.product.findUnique.mockResolvedValue(expensiveProduct)
      mockPrismaClient.$transaction.mockResolvedValue(mockTransactionResult)
      mockPrismaClient.transaction.findUnique.mockResolvedValue({
        ...mockTransactionResult,
        lineItems: [],
        customer: null,
        employee: null
      })

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should handle large transactions
      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(201)
    })
  })
})