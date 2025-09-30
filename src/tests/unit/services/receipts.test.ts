/**
 * @jest-environment jsdom
 */
import { receiptService } from '../../../shared/services/receipts'
import type { Receipt } from '../../../shared/types/transactions'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn()
  }
}))

import { api } from '../../../shared/services/api'
const mockedApi = api as jest.Mocked<typeof api>

describe('Receipt Service - CRITICAL BUSINESS LOGIC', () => {
  let mockReceipt: Receipt

  beforeEach(() => {
    jest.clearAllMocks()

    // Complete receipt mock with all required fields
    mockReceipt = {
      receiptNumber: 'R-2024-001234',
      transactionDate: '2024-09-29T10:30:00Z',
      employee: 'John Doe',
      customer: 'Jane Smith',
      storeInfo: {
        name: 'JustSell Vape Shop',
        address: '123 Main St, Anytown, ST 12345',
        phone: '(555) 123-4567'
      },
      lineItems: [
        {
          sku: 'VAPE-001',
          name: 'Premium Vape Juice - Strawberry',
          quantity: 2,
          unitPrice: 24.99,
          lineTotal: 49.98
        },
        {
          sku: 'COIL-XL',
          name: 'Replacement Coils Pack of 5',
          quantity: 1,
          unitPrice: 19.95,
          lineTotal: 19.95
        },
        {
          sku: 'SUPER-LONG-PRODUCT-NAME-TEST',
          name: 'Super Long Product Name That Should Be Truncated in Receipt',
          quantity: 1,
          unitPrice: 15.00,
          lineTotal: 15.00
        }
      ],
      subtotal: 84.93,
      taxAmount: 6.79,
      totalAmount: 91.72,
      paymentMethod: 'CREDIT_CARD',
      cashTendered: null,
      changeGiven: null,
      loyaltyPoints: {
        earned: 92,
        redeemed: 0,
        balance: 1547
      }
    }
  })

  describe('Receipt Generation', () => {
    it('should generate receipt from transaction ID', async () => {
      const transactionId = 'txn-123'
      mockedApi.get.mockResolvedValue({ data: mockReceipt })

      const result = await receiptService.generateReceipt(transactionId)

      expect(mockedApi.get).toHaveBeenCalledWith('/api/transactions/txn-123/receipt')
      expect(result).toEqual(mockReceipt)
    })

    it('should handle API errors during receipt generation', async () => {
      const transactionId = 'txn-invalid'
      const apiError = new Error('Transaction not found')
      mockedApi.get.mockRejectedValue(apiError)

      await expect(receiptService.generateReceipt(transactionId)).rejects.toThrow('Transaction not found')
      expect(mockedApi.get).toHaveBeenCalledWith('/api/transactions/txn-invalid/receipt')
    })
  })

  describe('Receipt Printing', () => {
    it('should print receipt via API', async () => {
      const transactionId = 'txn-123'
      mockedApi.post.mockResolvedValue({ data: { success: true } })

      await receiptService.printReceipt(transactionId)

      expect(mockedApi.post).toHaveBeenCalledWith('/api/transactions/txn-123/print')
    })

    it('should handle printing errors', async () => {
      const transactionId = 'txn-123'
      const printError = new Error('Printer offline')
      mockedApi.post.mockRejectedValue(printError)

      await expect(receiptService.printReceipt(transactionId)).rejects.toThrow('Printer offline')
    })
  })

  describe('Text Receipt Formatting', () => {
    it('should format complete receipt text correctly', () => {
      const formattedText = receiptService.formatReceiptText(mockReceipt)

      // Verify header formatting
      expect(formattedText).toContain('========================================')
      expect(formattedText).toContain('JUSTSELL VAPE SHOP')
      expect(formattedText).toContain('123 Main St, Anytown, ST 12345')
      expect(formattedText).toContain('(555) 123-4567')

      // Verify transaction info
      expect(formattedText).toContain('Receipt: R-2024-001234')
      expect(formattedText).toContain('Cashier: John Doe')
      expect(formattedText).toContain('Customer: Jane Smith')

      // Verify line items formatting
      expect(formattedText).toContain('QTY  ITEM                    PRICE   TOTAL')
      expect(formattedText).toContain('Premium Vape Juic...')
      expect(formattedText).toContain('$24.99')
      expect(formattedText).toContain('$49.98')

      // Verify long product name truncation
      expect(formattedText).toContain('Super Long Produc...')
      expect(formattedText).toContain('SKU: SUPER-LONG-PRODUCT-NAME-TEST')

      // Verify totals
      expect(formattedText).toContain('Subtotal:')
      expect(formattedText).toContain('$84.93')
      expect(formattedText).toContain('Tax:')
      expect(formattedText).toContain('$6.79')
      expect(formattedText).toContain('TOTAL:')
      expect(formattedText).toContain('$91.72')

      // Verify payment info
      expect(formattedText).toContain('Payment: CREDIT_CARD')

      // Verify loyalty info
      expect(formattedText).toContain('LOYALTY PROGRAM')
      expect(formattedText).toContain('Points Earned: 92')
      expect(formattedText).toContain('Current Balance: 1547')

      // Verify footer
      expect(formattedText).toContain('Thank you for your business!')
      expect(formattedText).toContain('No returns without receipt')
      expect(formattedText).toContain('All sales final on tobacco products')
    })

    it('should handle receipt without customer', () => {
      const receiptWithoutCustomer = { ...mockReceipt, customer: undefined }
      const formattedText = receiptService.formatReceiptText(receiptWithoutCustomer)

      expect(formattedText).not.toContain('Customer:')
      expect(formattedText).toContain('Cashier: John Doe')
    })

    it('should handle receipt without phone number', () => {
      const receiptWithoutPhone = {
        ...mockReceipt,
        storeInfo: { ...mockReceipt.storeInfo, phone: undefined }
      }
      const formattedText = receiptService.formatReceiptText(receiptWithoutPhone)

      expect(formattedText).not.toContain('(555) 123-4567')
      expect(formattedText).toContain('123 Main St, Anytown, ST 12345')
    })

    it('should handle cash payment with change', () => {
      const cashReceipt = {
        ...mockReceipt,
        paymentMethod: 'CASH',
        cashTendered: 100.00,
        changeGiven: 8.28
      }
      const formattedText = receiptService.formatReceiptText(cashReceipt)

      expect(formattedText).toContain('Payment: CASH')
      expect(formattedText).toContain('Cash Tendered: $100.00')
      expect(formattedText).toContain('Change: $8.28')
    })

    it('should handle receipt without loyalty points', () => {
      const receiptWithoutLoyalty = { ...mockReceipt, loyaltyPoints: undefined }
      const formattedText = receiptService.formatReceiptText(receiptWithoutLoyalty)

      expect(formattedText).not.toContain('LOYALTY PROGRAM')
      expect(formattedText).not.toContain('Points Earned')
      expect(formattedText).toContain('Thank you for your business!')
    })

    it('should handle loyalty points with redemption', () => {
      const receiptWithRedemption = {
        ...mockReceipt,
        loyaltyPoints: {
          earned: 15,
          redeemed: 100,
          balance: 1462
        }
      }
      const formattedText = receiptService.formatReceiptText(receiptWithRedemption)

      expect(formattedText).toContain('Points Earned: 15')
      expect(formattedText).toContain('Points Redeemed: 100')
      expect(formattedText).toContain('Current Balance: 1462')
    })
  })

  describe('HTML Receipt Formatting', () => {
    it('should format complete HTML receipt correctly', () => {
      const formattedHTML = receiptService.formatReceiptHTML(mockReceipt)

      // Verify HTML structure
      expect(formattedHTML).toContain('<!DOCTYPE html>')
      expect(formattedHTML).toContain('<html>')
      expect(formattedHTML).toContain('</html>')

      // Verify CSS styling
      expect(formattedHTML).toContain('font-family: \'Courier New\', monospace')
      expect(formattedHTML).toContain('.header { text-align: center')

      // Verify header content
      expect(formattedHTML).toContain('JustSell Vape Shop')
      expect(formattedHTML).toContain('123 Main St, Anytown, ST 12345')
      expect(formattedHTML).toContain('(555) 123-4567')

      // Verify transaction info
      expect(formattedHTML).toContain('<strong>Receipt:</strong> R-2024-001234')
      expect(formattedHTML).toContain('<strong>Cashier:</strong> John Doe')
      expect(formattedHTML).toContain('<strong>Customer:</strong> Jane Smith')

      // Verify line items table
      expect(formattedHTML).toContain('<table>')
      expect(formattedHTML).toContain('<th>QTY</th>')
      expect(formattedHTML).toContain('<th>ITEM</th>')
      expect(formattedHTML).toContain('<td>2</td>')
      expect(formattedHTML).toContain('Premium Vape Juice - Strawberry')
      expect(formattedHTML).toContain('SKU: VAPE-001')
      expect(formattedHTML).toContain('$24.99')
      expect(formattedHTML).toContain('$49.98')

      // Verify totals
      expect(formattedHTML).toContain('Subtotal: $84.93')
      expect(formattedHTML).toContain('Tax: $6.79')
      expect(formattedHTML).toContain('TOTAL: $91.72')

      // Verify loyalty section
      expect(formattedHTML).toContain('LOYALTY PROGRAM')
      expect(formattedHTML).toContain('Points Earned: 92')
      expect(formattedHTML).toContain('Current Balance: 1547')

      // Verify footer
      expect(formattedHTML).toContain('Thank you for your business!')
      expect(formattedHTML).toContain('All sales final on tobacco products')
    })

    it('should handle HTML receipt without customer', () => {
      const receiptWithoutCustomer = { ...mockReceipt, customer: undefined }
      const formattedHTML = receiptService.formatReceiptHTML(receiptWithoutCustomer)

      expect(formattedHTML).not.toContain('<strong>Customer:</strong>')
      expect(formattedHTML).toContain('<strong>Cashier:</strong> John Doe')
    })

    it('should handle HTML receipt without loyalty points', () => {
      const receiptWithoutLoyalty = { ...mockReceipt, loyaltyPoints: undefined }
      const formattedHTML = receiptService.formatReceiptHTML(receiptWithoutLoyalty)

      expect(formattedHTML).not.toContain('LOYALTY PROGRAM')
    })
  })

  describe('Email Receipt', () => {
    it('should email receipt to customer', async () => {
      const transactionId = 'txn-123'
      const customerEmail = 'customer@example.com'
      mockedApi.post.mockResolvedValue({ data: { success: true } })

      await receiptService.emailReceipt(transactionId, customerEmail)

      expect(mockedApi.post).toHaveBeenCalledWith('/api/transactions/txn-123/email', {
        email: customerEmail
      })
    })

    it('should handle email errors', async () => {
      const transactionId = 'txn-123'
      const customerEmail = 'invalid-email'
      const emailError = new Error('Invalid email address')
      mockedApi.post.mockRejectedValue(emailError)

      await expect(receiptService.emailReceipt(transactionId, customerEmail)).rejects.toThrow('Invalid email address')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty line items', () => {
      const receiptWithNoItems = {
        ...mockReceipt,
        lineItems: []
      }
      const formattedText = receiptService.formatReceiptText(receiptWithNoItems)

      expect(formattedText).toContain('QTY  ITEM                    PRICE   TOTAL')
      expect(formattedText).toContain('Subtotal:')
      expect(formattedText).toContain('TOTAL:')
    })

    it('should handle zero amounts correctly', () => {
      const receiptWithZeros = {
        ...mockReceipt,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        lineItems: []
      }
      const formattedText = receiptService.formatReceiptText(receiptWithZeros)

      expect(formattedText).toContain('$0.00')
    })

    it('should handle high quantity numbers', () => {
      const receiptWithHighQty = {
        ...mockReceipt,
        lineItems: [{
          sku: 'BULK-001',
          name: 'Bulk Item',
          quantity: 999,
          unitPrice: 0.50,
          lineTotal: 499.50
        }]
      }
      const formattedText = receiptService.formatReceiptText(receiptWithHighQty)

      expect(formattedText).toContain('999')
      expect(formattedText).toContain('Bulk Item')
      expect(formattedText).toContain('$0.50')
      expect(formattedText).toContain('$499.50')
    })
  })
})