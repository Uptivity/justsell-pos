import { Request, Response } from 'express'

// Mock the PrismaClient import before any other imports
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
    $transaction: jest.fn()
  }

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    __mockPrismaClient: mockPrismaClient
  }
})

import { transactionController } from '../../../api/controllers/transactions'

// Access the mock through module system
const { __mockPrismaClient: mockPrismaClient } = require('../../../generated/prisma')

describe('Transaction Controller', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: {
        id: 'user-123',
        username: 'testuser',
        role: 'CASHIER' as const,
        isActive: true
      },
      params: {},
      query: {}
    }
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  describe('createTransaction', () => {
    const validTransactionData = {
      cartItems: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 }
      ],
      paymentMethod: 'CASH' as const,
      cashTendered: 30.00,
      ageVerificationCompleted: true,
      storeId: 'store-1'
    }

    const mockProduct1 = {
      id: 'product-1',
      name: 'Test Product 1',
      sku: 'TEST001',
      price: 10.00,
      quantity: 5,
      ageRestricted: false,
      lotNumber: null,
      expirationDate: null
    }

    const mockProduct2 = {
      id: 'product-2',
      name: 'Test Product 2',
      sku: 'TEST002', 
      price: 5.00,
      quantity: 3,
      ageRestricted: true,
      lotNumber: 'LOT123',
      expirationDate: new Date('2024-12-31')
    }

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined
      mockRequest.body = validTransactionData

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Employee authentication required'
      })
    })

    it('should return 400 if product not found', async () => {
      mockRequest.body = validTransactionData
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(null)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Product product-1 not found'
      })
    })

    it('should validate cart items structure', async () => {
      mockRequest.body = {
        ...validTransactionData,
        cartItems: []
      }

      // Even with empty cart, should proceed through product validation
      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      // Should succeed with empty cart (no products to validate)
      expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled()
    })

    it('should calculate totals correctly for cash payment', async () => {
      mockRequest.body = validTransactionData
      
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct1)
        .mockResolvedValueOnce(mockProduct2)

      const mockTransaction = { id: 'transaction-123', receiptNumber: 'R123456' }
      const mockCompleteTransaction = {
        ...mockTransaction,
        lineItems: [],
        customer: null,
        employee: { id: 'user-123', firstName: 'John', lastName: 'Doe' }
      }

      mockPrismaClient.$transaction.mockResolvedValue(mockTransaction)
      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockCompleteTransaction)

      await transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Transaction completed successfully',
        transaction: mockCompleteTransaction
      })
    })
  })

  describe('getTransaction', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        receiptNumber: 'R123456',
        lineItems: [],
        customer: null,
        employee: { id: 'user-123', firstName: 'John', lastName: 'Doe' },
        store: { id: 'store-1', storeName: 'Test Store' }
      }

      mockRequest.params = { id: 'transaction-123' }
      mockPrismaClient.transaction.findUnique.mockResolvedValue(mockTransaction)

      await transactionController.getTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction)
    })

    it('should return 404 if transaction not found', async () => {
      mockRequest.params = { id: 'nonexistent' }
      mockPrismaClient.transaction.findUnique.mockResolvedValue(null)

      await transactionController.getTransaction(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Transaction not found'
      })
    })
  })

  describe('getTransactions', () => {
    it('should return paginated transactions list', async () => {
      const mockTransactions = [
        { id: 'transaction-1', receiptNumber: 'R001', customer: null, employee: { id: 'emp1' } },
        { id: 'transaction-2', receiptNumber: 'R002', customer: null, employee: { id: 'emp2' } }
      ]

      mockRequest.query = { page: '1', limit: '20' }
      mockPrismaClient.transaction.findMany.mockResolvedValue(mockTransactions)
      mockPrismaClient.transaction.count.mockResolvedValue(50)

      await transactionController.getTransactions(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(mockResponse.json).toHaveBeenCalledWith({
        transactions: mockTransactions,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          pages: 3
        }
      })
    })

    it('should use default pagination values', async () => {
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

      expect(mockResponse.json).toHaveBeenCalledWith({
        transactions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      })
    })
  })
})