/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { transactionService } from '../../../shared/services/transactions'
import {
  useCreateTransaction,
  useTransaction,
  useTransactions,
  useValidateTransaction,
  useAgeVerification,
  useTaxCalculation,
  useGenerateReceipt,
  usePrintReceipt
} from '../../../shared/hooks/useTransactions'

// Mock the transactionService
jest.mock('../../../shared/services/transactions', () => ({
  transactionService: {
    createTransaction: jest.fn(),
    getTransaction: jest.fn(),
    getTransactions: jest.fn(),
    validateTransaction: jest.fn(),
    processAgeVerification: jest.fn(),
    calculateTax: jest.fn(),
    generateReceipt: jest.fn(),
    printReceipt: jest.fn()
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

const mockTransactionService = transactionService as jest.Mocked<typeof transactionService>

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

describe('useTransactions Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useCreateTransaction', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        customerId: 'customer-123',
        cartItems: [
          { productId: 'product-1', quantity: 2 }
        ],
        paymentMethod: 'CASH',
        cashTendered: 50.00,
        ageVerificationCompleted: true
      }

      const mockCreatedTransaction = {
        id: 'transaction-456',
        receiptNumber: 'R20240115001',
        totalAmount: 43.18,
        subtotalAmount: 39.98,
        taxAmount: 3.20,
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
        transactionDate: new Date().toISOString()
      }

      mockTransactionService.createTransaction.mockResolvedValue(mockCreatedTransaction)

      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper()
      })

      result.current.mutate(transactionData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(transactionData)
      expect(result.current.data).toEqual(mockCreatedTransaction)
    })

    it('should handle transaction creation error', async () => {
      const transactionData = {
        customerId: '',
        cartItems: [],
        paymentMethod: 'CASH',
        cashTendered: 0
      }
      const mockError = new Error('Invalid transaction data')
      mockTransactionService.createTransaction.mockRejectedValue(mockError)

      const { result } = renderHook(() => useCreateTransaction(), {
        wrapper: createWrapper()
      })

      result.current.mutate(transactionData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
      expect(console.error).toHaveBeenCalledWith('Transaction creation failed:', mockError)
    })
  })

  describe('useTransaction', () => {
    it('should fetch transaction by ID', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        receiptNumber: 'R20240115002',
        totalAmount: 57.21,
        subtotalAmount: 52.97,
        taxAmount: 4.24,
        paymentMethod: 'CARD',
        paymentStatus: 'COMPLETED',
        transactionDate: new Date().toISOString(),
        lineItems: [
          {
            productId: 'product-1',
            productName: 'Premium Vape Pen',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98
          }
        ],
        customer: {
          id: 'customer-123',
          firstName: 'John',
          lastName: 'Doe'
        }
      }

      mockTransactionService.getTransaction.mockResolvedValue(mockTransaction)

      const { result } = renderHook(() => useTransaction('transaction-123'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.getTransaction).toHaveBeenCalledWith('transaction-123')
      expect(result.current.data).toEqual(mockTransaction)
    })

    it('should not fetch when ID is empty', () => {
      renderHook(() => useTransaction(''), {
        wrapper: createWrapper()
      })

      expect(mockTransactionService.getTransaction).not.toHaveBeenCalled()
    })

    it('should not fetch when disabled', () => {
      renderHook(() => useTransaction('transaction-123', false), {
        wrapper: createWrapper()
      })

      expect(mockTransactionService.getTransaction).not.toHaveBeenCalled()
    })

    it('should handle transaction not found', async () => {
      const mockError = new Error('Transaction not found')
      mockTransactionService.getTransaction.mockRejectedValue(mockError)

      const { result } = renderHook(() => useTransaction('nonexistent'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useTransactions', () => {
    it('should fetch transactions with default parameters', async () => {
      const mockTransactions = {
        transactions: [
          {
            id: 'trans-1',
            receiptNumber: 'R001',
            totalAmount: 25.99,
            transactionDate: new Date().toISOString(),
            customer: { firstName: 'Alice', lastName: 'Johnson' }
          },
          {
            id: 'trans-2',
            receiptNumber: 'R002',
            totalAmount: 45.50,
            transactionDate: new Date().toISOString(),
            customer: null
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1
        }
      }

      mockTransactionService.getTransactions.mockResolvedValue(mockTransactions)

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith(1, 20)
      expect(result.current.data).toEqual(mockTransactions)
    })

    it('should fetch transactions with custom parameters', async () => {
      const mockTransactions = {
        transactions: [
          {
            id: 'trans-3',
            receiptNumber: 'R003',
            totalAmount: 89.99,
            transactionDate: new Date().toISOString()
          }
        ],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          pages: 1
        }
      }

      mockTransactionService.getTransactions.mockResolvedValue(mockTransactions)

      const { result } = renderHook(() => useTransactions(2, 10), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith(2, 10)
      expect(result.current.data).toEqual(mockTransactions)
    })

    it('should handle fetch transactions error', async () => {
      const mockError = new Error('Failed to fetch transactions')
      mockTransactionService.getTransactions.mockRejectedValue(mockError)

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useValidateTransaction', () => {
    it('should validate transaction successfully', async () => {
      const transactionData = {
        cartItems: [
          { productId: 'product-1', quantity: 2 }
        ],
        paymentMethod: 'CASH',
        cashTendered: 50.00
      }

      const mockValidationResult = {
        isValid: true,
        errors: [],
        subtotal: 39.98,
        taxAmount: 3.20,
        totalAmount: 43.18
      }

      mockTransactionService.validateTransaction.mockResolvedValue(mockValidationResult)

      const { result } = renderHook(() => useValidateTransaction(), {
        wrapper: createWrapper()
      })

      result.current.mutate(transactionData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.validateTransaction).toHaveBeenCalledWith(transactionData)
      expect(result.current.data).toEqual(mockValidationResult)
    })

    it('should handle validation errors', async () => {
      const invalidTransactionData = {
        cartItems: [],
        paymentMethod: 'CASH',
        cashTendered: 0
      }

      const mockValidationResult = {
        isValid: false,
        errors: ['Cart cannot be empty', 'Cash tendered must be greater than 0']
      }

      mockTransactionService.validateTransaction.mockResolvedValue(mockValidationResult)

      const { result } = renderHook(() => useValidateTransaction(), {
        wrapper: createWrapper()
      })

      result.current.mutate(invalidTransactionData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockValidationResult)
    })
  })

  describe('useAgeVerification', () => {
    it('should process age verification successfully', async () => {
      const ageVerificationData = {
        customerId: 'customer-123',
        employeeId: 'employee-456',
        idScanned: true,
        idVerified: true,
        overrideUsed: false
      }

      const mockVerificationResult = {
        success: true,
        customerId: 'customer-123',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'employee-456'
      }

      mockTransactionService.processAgeVerification.mockResolvedValue(mockVerificationResult)

      const { result } = renderHook(() => useAgeVerification(), {
        wrapper: createWrapper()
      })

      result.current.mutate(ageVerificationData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.processAgeVerification).toHaveBeenCalledWith(ageVerificationData)
      expect(result.current.data).toEqual(mockVerificationResult)
    })

    it('should handle age verification failure', async () => {
      const ageVerificationData = {
        customerId: 'customer-123',
        employeeId: 'employee-456',
        idScanned: false,
        idVerified: false,
        overrideUsed: false
      }

      const mockError = new Error('Age verification failed')
      mockTransactionService.processAgeVerification.mockRejectedValue(mockError)

      const { result } = renderHook(() => useAgeVerification(), {
        wrapper: createWrapper()
      })

      result.current.mutate(ageVerificationData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useTaxCalculation', () => {
    it('should calculate tax successfully', async () => {
      const taxCalculationData = {
        subtotal: 100.00,
        storeId: 'store-123',
        customerId: 'customer-456'
      }

      const mockTaxResult = {
        subtotal: 100.00,
        taxRate: 0.08,
        taxAmount: 8.00,
        totalAmount: 108.00,
        taxBreakdown: [
          { name: 'State Tax', rate: 0.06, amount: 6.00 },
          { name: 'City Tax', rate: 0.02, amount: 2.00 }
        ]
      }

      mockTransactionService.calculateTax.mockResolvedValue(mockTaxResult)

      const { result } = renderHook(() => useTaxCalculation(), {
        wrapper: createWrapper()
      })

      result.current.mutate(taxCalculationData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.calculateTax).toHaveBeenCalledWith(
        100.00,
        'store-123',
        'customer-456'
      )
      expect(result.current.data).toEqual(mockTaxResult)
    })

    it('should handle tax calculation error', async () => {
      const taxCalculationData = {
        subtotal: -10.00 // Invalid subtotal
      }

      const mockError = new Error('Invalid subtotal amount')
      mockTransactionService.calculateTax.mockRejectedValue(mockError)

      const { result } = renderHook(() => useTaxCalculation(), {
        wrapper: createWrapper()
      })

      result.current.mutate(taxCalculationData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('useGenerateReceipt', () => {
    it('should generate receipt successfully', async () => {
      const receiptData = {
        transactionId: 'transaction-123'
      }

      const mockReceiptResult = {
        transactionId: 'transaction-123',
        receiptNumber: 'R20240115001',
        receiptHtml: '<html><body>Receipt Content</body></html>',
        storeInfo: {
          name: 'Test Store',
          address: '123 Main St, Test City, TX 12345'
        },
        transactionDate: new Date().toISOString(),
        totalAmount: 57.21
      }

      mockTransactionService.generateReceipt.mockResolvedValue(mockReceiptResult)

      const { result } = renderHook(() => useGenerateReceipt(), {
        wrapper: createWrapper()
      })

      result.current.mutate(receiptData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.generateReceipt).toHaveBeenCalledWith(receiptData)
      expect(result.current.data).toEqual(mockReceiptResult)
    })

    it('should handle receipt generation error', async () => {
      const receiptData = {
        transactionId: 'nonexistent-transaction'
      }

      const mockError = new Error('Transaction not found')
      mockTransactionService.generateReceipt.mockRejectedValue(mockError)

      const { result } = renderHook(() => useGenerateReceipt(), {
        wrapper: createWrapper()
      })

      result.current.mutate(receiptData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('usePrintReceipt', () => {
    it('should print receipt successfully', async () => {
      const printData = {
        transactionId: 'transaction-123',
        printerId: 'thermal-printer-1'
      }

      const mockPrintResult = {
        success: true,
        transactionId: 'transaction-123',
        printedAt: new Date().toISOString(),
        printerId: 'thermal-printer-1'
      }

      mockTransactionService.printReceipt.mockResolvedValue(mockPrintResult)

      const { result } = renderHook(() => usePrintReceipt(), {
        wrapper: createWrapper()
      })

      result.current.mutate(printData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockTransactionService.printReceipt).toHaveBeenCalledWith(printData)
      expect(result.current.data).toEqual(mockPrintResult)
    })

    it('should handle print receipt error', async () => {
      const printData = {
        transactionId: 'transaction-123',
        printerId: 'offline-printer'
      }

      const mockError = new Error('Printer offline')
      mockTransactionService.printReceipt.mockRejectedValue(mockError)

      const { result } = renderHook(() => usePrintReceipt(), {
        wrapper: createWrapper()
      })

      result.current.mutate(printData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(mockError)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      mockTransactionService.getTransactions.mockRejectedValue(networkError)

      const { result } = renderHook(() => useTransactions(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(networkError)
    })

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service Unavailable')
      mockTransactionService.getTransaction.mockRejectedValue(serviceError)

      const { result } = renderHook(() => useTransaction('transaction-123'), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(serviceError)
    })

    it('should handle validation timeout errors', async () => {
      const timeoutError = new Error('Validation timeout')
      mockTransactionService.validateTransaction.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useValidateTransaction(), {
        wrapper: createWrapper()
      })

      const transactionData = {
        cartItems: [{ productId: 'product-1', quantity: 1 }]
      }

      result.current.mutate(transactionData)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(timeoutError)
    })
  })
})