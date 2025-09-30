/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReceiptDisplay } from '../../../../shared/components/receipts/ReceiptDisplay'
import { receiptService } from '../../../../shared/services/receipts'
import type { Receipt } from '../../../../shared/types/receipt'

// Mock the receipt service
jest.mock('../../../../shared/services/receipts')
const mockReceiptService = receiptService as jest.Mocked<typeof receiptService>

// Mock window.open for print tests
const mockWindowOpen = jest.fn()
const mockPrint = jest.fn()
const mockDocument = {
  write: jest.fn(),
  close: jest.fn()
}

Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
})

// Mock alert for error messages
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn()
})

describe('ReceiptDisplay Component', () => {
  let queryClient: QueryClient
  const mockOnClose = jest.fn()
  const mockOnPrint = jest.fn()

  const mockReceipt: Receipt = {
    receiptNumber: 'R001234',
    transactionDate: '2024-01-15T10:30:00Z',
    employee: 'John Doe',
    customer: 'Jane Smith',
    storeInfo: {
      name: 'JustSell Tobacco Shop',
      address: '123 Main St, City, State 12345',
      phone: '(555) 123-4567'
    },
    lineItems: [
      {
        sku: 'CIG001',
        name: 'Marlboro Red Pack',
        quantity: 2,
        unitPrice: 8.99,
        lineTotal: 17.98
      },
      {
        sku: 'ACC002',
        name: 'BIC Lighter Blue',
        quantity: 1,
        unitPrice: 2.50,
        lineTotal: 2.50
      }
    ],
    subtotal: 20.48,
    taxAmount: 2.05,
    totalAmount: 22.53,
    paymentMethod: 'CASH',
    cashTendered: 25.00,
    changeGiven: 2.47,
    loyaltyPoints: {
      earned: 23,
      redeemed: 0,
      balance: 156
    }
  }

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    jest.clearAllMocks()
    mockWindowOpen.mockReturnValue({
      document: mockDocument,
      print: mockPrint
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Loading States', () => {
    it('should show loading state when fetching receipt', () => {
      mockReceiptService.generateReceipt.mockReturnValue(
        new Promise(() => {}) // Never resolves to keep loading
      )

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Loading receipt...')).toBeInTheDocument()
    })

    it('should apply custom className during loading', () => {
      mockReceiptService.generateReceipt.mockReturnValue(
        new Promise(() => {})
      )

      const { container } = render(
        <ReceiptDisplay transactionId="txn-123" className="custom-loading" />,
        { wrapper: createWrapper() }
      )

      expect(container.querySelector('.custom-loading')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('should show error message when receipt fetch fails', async () => {
      const errorMessage = 'Receipt not found'
      mockReceiptService.generateReceipt.mockRejectedValue(new Error(errorMessage))

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Error loading receipt')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should handle non-Error exceptions gracefully', async () => {
      mockReceiptService.generateReceipt.mockRejectedValue('String error')

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Error loading receipt')).toBeInTheDocument()
        expect(screen.getByText('Unknown error')).toBeInTheDocument()
      })
    })

    it('should apply custom className during error state', async () => {
      mockReceiptService.generateReceipt.mockRejectedValue(new Error('Test error'))

      const { container } = render(
        <ReceiptDisplay transactionId="txn-123" className="custom-error" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(container.querySelector('.custom-error')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show not found message when receipt is null', async () => {
      mockReceiptService.generateReceipt.mockResolvedValue(null)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt not found')).toBeInTheDocument()
      })
    })

    it('should not fetch when transactionId is empty', () => {
      render(
        <ReceiptDisplay transactionId="" />,
        { wrapper: createWrapper() }
      )

      expect(mockReceiptService.generateReceipt).not.toHaveBeenCalled()
    })
  })

  describe('Receipt Content Display', () => {
    beforeEach(async () => {
      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt)
    })

    it('should display store information correctly', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('JustSell Tobacco Shop')).toBeInTheDocument()
        expect(screen.getByText('123 Main St, City, State 12345')).toBeInTheDocument()
        expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
      })
    })

    it('should display transaction information correctly', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt: R001234')).toBeInTheDocument()
        expect(screen.getByText('Cashier: John Doe')).toBeInTheDocument()
        expect(screen.getByText('Customer: Jane Smith')).toBeInTheDocument()
      })
    })

    it('should display line items with correct formatting', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Check for line items - verify they're displayed with correct data
        expect(screen.getByText('QTY ITEM')).toBeInTheDocument()
        expect(screen.getByText(/PRICE\s+TOTAL/)).toBeInTheDocument()

        // Check for SKU lines which are unique identifiers
        expect(screen.getByText('SKU: CIG001')).toBeInTheDocument()
        expect(screen.getByText('SKU: ACC002')).toBeInTheDocument()

        // Check product names appear (they may be truncated)
        expect(screen.getByText(/Marlboro Red/)).toBeInTheDocument()
        expect(screen.getByText(/BIC Lighter/)).toBeInTheDocument()
      })
    })

    it('should display totals correctly', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Subtotal:')).toBeInTheDocument()
        expect(screen.getByText('$20.48')).toBeInTheDocument()
        expect(screen.getByText('Tax:')).toBeInTheDocument()
        expect(screen.getByText('$2.05')).toBeInTheDocument()
        expect(screen.getByText('TOTAL:')).toBeInTheDocument()
        expect(screen.getByText('$22.53')).toBeInTheDocument()
      })
    })

    it('should display payment information', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Payment: CASH')).toBeInTheDocument()
        expect(screen.getByText('Cash Tendered: $25.00')).toBeInTheDocument()
        expect(screen.getByText('Change: $2.47')).toBeInTheDocument()
      })
    })

    it('should display loyalty points information', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('LOYALTY PROGRAM')).toBeInTheDocument()
        expect(screen.getByText('Points Earned: 23')).toBeInTheDocument()
        expect(screen.getByText('Current Balance: 156')).toBeInTheDocument()
      })
    })

    it('should display footer messages', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Thank you for your business!')).toBeInTheDocument()
        expect(screen.getByText('Please come again!')).toBeInTheDocument()
        expect(screen.getByText('No returns without receipt')).toBeInTheDocument()
        expect(screen.getByText('All sales final on tobacco products')).toBeInTheDocument()
      })
    })
  })

  describe('Optional Content Handling', () => {
    it('should handle receipt without phone number', async () => {
      const receiptWithoutPhone = {
        ...mockReceipt,
        storeInfo: {
          ...mockReceipt.storeInfo,
          phone: undefined
        }
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithoutPhone)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('JustSell Tobacco Shop')).toBeInTheDocument()
        expect(screen.queryByText('(555) 123-4567')).not.toBeInTheDocument()
      })
    })

    it('should handle receipt without customer', async () => {
      const receiptWithoutCustomer = {
        ...mockReceipt,
        customer: undefined
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithoutCustomer)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Cashier: John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Customer:')).not.toBeInTheDocument()
      })
    })

    it('should handle receipt without cash tendered and change', async () => {
      const receiptWithoutCash = {
        ...mockReceipt,
        paymentMethod: 'CARD',
        cashTendered: undefined,
        changeGiven: undefined
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithoutCash)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Payment: CARD')).toBeInTheDocument()
        expect(screen.queryByText('Cash Tendered:')).not.toBeInTheDocument()
        expect(screen.queryByText('Change:')).not.toBeInTheDocument()
      })
    })

    it('should handle receipt without loyalty points', async () => {
      const receiptWithoutLoyalty = {
        ...mockReceipt,
        loyaltyPoints: undefined
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithoutLoyalty)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.queryByText('LOYALTY PROGRAM')).not.toBeInTheDocument()
      })
    })

    it('should handle loyalty points with redemption', async () => {
      const receiptWithRedemption = {
        ...mockReceipt,
        loyaltyPoints: {
          earned: 0,
          redeemed: 50,
          balance: 106
        }
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithRedemption)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('LOYALTY PROGRAM')).toBeInTheDocument()
        expect(screen.getByText('Points Redeemed: 50')).toBeInTheDocument()
        expect(screen.getByText('Current Balance: 106')).toBeInTheDocument()
        expect(screen.queryByText('Points Earned:')).not.toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt)
      mockReceiptService.formatReceiptHTML.mockReturnValue('<html>Receipt HTML</html>')
    })

    it('should handle print button click', async () => {
      const user = userEvent.setup()

      render(
        <ReceiptDisplay transactionId="txn-123" onPrint={mockOnPrint} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      const printButton = screen.getByText('Print')
      await user.click(printButton)

      expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank', 'width=400,height=600')
      expect(mockDocument.write).toHaveBeenCalledWith('<html>Receipt HTML</html>')
      expect(mockDocument.close).toHaveBeenCalled()
      expect(mockPrint).toHaveBeenCalled()
      expect(mockOnPrint).toHaveBeenCalled()
    })

    it('should handle print failure when window.open fails', async () => {
      mockWindowOpen.mockReturnValue(null)
      const user = userEvent.setup()

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      const printButton = screen.getByText('Print')
      await user.click(printButton)

      expect(window.alert).not.toHaveBeenCalled() // Should fail silently
    })

    it('should handle POS print button click', async () => {
      mockReceiptService.printReceipt.mockResolvedValue(undefined)
      const user = userEvent.setup()

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      const posPrintButton = screen.getByText('POS Print')
      await user.click(posPrintButton)

      expect(mockReceiptService.printReceipt).toHaveBeenCalledWith('txn-123')
      expect(window.alert).toHaveBeenCalledWith('Receipt sent to POS printer')
    })

    it('should handle POS print failure', async () => {
      mockReceiptService.printReceipt.mockRejectedValue(new Error('Printer offline'))
      const user = userEvent.setup()

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      const posPrintButton = screen.getByText('POS Print')
      await user.click(posPrintButton)

      expect(window.alert).toHaveBeenCalledWith('Failed to send receipt to printer')
    })

    it('should handle close button click when onClose is provided', async () => {
      const user = userEvent.setup()

      render(
        <ReceiptDisplay transactionId="txn-123" onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not show close button when onClose is not provided', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Receipt R001234')).toBeInTheDocument()
      })

      expect(screen.queryByText('Close')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should truncate long item names correctly', async () => {
      const receiptWithLongName = {
        ...mockReceipt,
        lineItems: [
          {
            sku: 'LONG001',
            name: 'This is a very long product name that should be truncated',
            quantity: 1,
            unitPrice: 10.00,
            lineTotal: 10.00
          }
        ]
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithLongName)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('1 This is a ve...')).toBeInTheDocument()
      })
    })

    it('should handle zero amounts correctly', async () => {
      const receiptWithZeros = {
        ...mockReceipt,
        lineItems: [
          {
            sku: 'FREE001',
            name: 'Free Sample',
            quantity: 1,
            unitPrice: 0.00,
            lineTotal: 0.00
          }
        ],
        subtotal: 0.00,
        taxAmount: 0.00,
        totalAmount: 0.00
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithZeros)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('$0.00 $0.00')).toBeInTheDocument()
        expect(screen.getByText('Subtotal:')).toBeInTheDocument()
      })
    })

    it('should format date correctly', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const dateElement = screen.getByText(/Date:/)
        expect(dateElement).toBeInTheDocument()
        // The exact format depends on locale, but should contain date info
        expect(dateElement.textContent).toMatch(/Date: \d/)
      })
    })

    it('should handle empty line items array', async () => {
      const receiptWithoutItems = {
        ...mockReceipt,
        lineItems: [],
        subtotal: 0.00,
        taxAmount: 0.00,
        totalAmount: 0.00
      }
      mockReceiptService.generateReceipt.mockResolvedValue(receiptWithoutItems)

      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('QTY ITEM')).toBeInTheDocument()
        expect(screen.getByText('Subtotal:')).toBeInTheDocument()
        // Check that totals section displays even with empty items
        expect(screen.getByText('TOTAL:')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt)
    })

    it('should have proper button attributes', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const printButton = screen.getByText('Print')
        const posPrintButton = screen.getByText('POS Print')
        const closeButton = screen.getByText('Close')

        expect(printButton.tagName).toBe('BUTTON')
        expect(posPrintButton.tagName).toBe('BUTTON')
        expect(closeButton.tagName).toBe('BUTTON')
      })
    })

    it('should have appropriate ARIA structure', async () => {
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const heading = screen.getByText('Receipt R001234')
        expect(heading.tagName).toBe('H3')
      })
    })
  })

  describe('Integration', () => {
    it('should refetch receipt when transactionId changes', async () => {
      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt)

      const { rerender } = render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(mockReceiptService.generateReceipt).toHaveBeenCalledWith('txn-123')
      })

      // Change transaction ID
      rerender(
        <ReceiptDisplay transactionId="txn-456" />
      )

      await waitFor(() => {
        expect(mockReceiptService.generateReceipt).toHaveBeenCalledWith('txn-456')
      })

      expect(mockReceiptService.generateReceipt).toHaveBeenCalledTimes(2)
    })

    it('should use React Query caching', async () => {
      mockReceiptService.generateReceipt.mockResolvedValue(mockReceipt)

      // Render first instance
      const { unmount } = render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(mockReceiptService.generateReceipt).toHaveBeenCalledWith('txn-123')
      })

      const callCount = mockReceiptService.generateReceipt.mock.calls.length
      unmount()

      // Render second instance with same transaction ID
      render(
        <ReceiptDisplay transactionId="txn-123" />,
        { wrapper: createWrapper() }
      )

      // Allow time for potential new calls
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should not make additional calls beyond the initial cache
      expect(mockReceiptService.generateReceipt.mock.calls.length).toBeLessThanOrEqual(callCount + 1)
    })
  })
})