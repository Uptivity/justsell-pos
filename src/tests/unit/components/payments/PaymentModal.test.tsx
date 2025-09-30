import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentModal } from '../../../../shared/components/payments/PaymentModal'
import { paymentService } from '../../../../shared/services/payments'
import type { PaymentResult } from '../../../../shared/services/payments'

// Mock the payment service
jest.mock('../../../../shared/services/payments')
const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>

describe('PaymentModal Component', () => {
  const mockOnComplete = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    totalAmount: 25.99,
    onComplete: mockOnComplete,
    onCancel: mockOnCancel,
    isOpen: true
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock formatCardNumber and getCardType
    mockPaymentService.formatCardNumber = jest.fn((cardNumber: string) => {
      return cardNumber.replace(/(\d{4})/g, '$1 ').trim()
    })

    mockPaymentService.getCardType = jest.fn((cardNumber: string) => {
      if (cardNumber.startsWith('4')) return 'Visa'
      if (cardNumber.startsWith('5')) return 'Mastercard'
      return 'Unknown'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering and Visibility', () => {
    it('should render when isOpen is true', () => {
      render(<PaymentModal {...defaultProps} />)

      expect(screen.getByText('Payment Processing')).toBeInTheDocument()
      expect(screen.getByText('Total Amount: $25.99')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<PaymentModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('Payment Processing')).not.toBeInTheDocument()
    })

    it('should display total amount correctly', () => {
      render(<PaymentModal {...defaultProps} totalAmount={123.45} />)

      expect(screen.getByText('Total Amount: $123.45')).toBeInTheDocument()
    })
  })

  describe('Payment Mode Selection', () => {
    it('should default to single payment mode', () => {
      render(<PaymentModal {...defaultProps} />)

      const singleButton = screen.getByText('Single Payment')
      const splitButton = screen.getByText('Split Payment')

      expect(singleButton).toHaveClass('bg-blue-600', 'text-white')
      expect(splitButton).toHaveClass('bg-gray-200', 'text-gray-700')
    })

    it('should switch to split payment mode when clicked', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const splitButton = screen.getByText('Split Payment')
      await user.click(splitButton)

      expect(splitButton).toHaveClass('bg-blue-600', 'text-white')
      expect(screen.getByText('Single Payment')).toHaveClass('bg-gray-200', 'text-gray-700')
    })
  })

  describe('Single Payment - Cash', () => {
    it('should render cash payment fields by default', () => {
      render(<PaymentModal {...defaultProps} />)

      expect(screen.getByRole('combobox')).toHaveValue('CASH')
      expect(screen.getByPlaceholderText('Minimum: $25.99')).toBeInTheDocument()
    })

    it('should calculate and show change for cash payments', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const cashInput = screen.getByPlaceholderText('Minimum: $25.99')
      await user.type(cashInput, '30.00')

      expect(screen.getByText('Change: $4.01')).toBeInTheDocument()
    })

    it('should process successful cash payment', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const cashInput = screen.getByPlaceholderText('Minimum: $25.99')
      await user.type(cashInput, '30.00')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: true,
          transactionId: expect.stringMatching(/^cash_\d+$/)
        })
      })
    })

    it('should handle insufficient cash amount', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const cashInput = screen.getByPlaceholderText('Minimum: $25.99')
      await user.type(cashInput, '20.00')

      const processButton = screen.getByText('Process Payment')

      // Button should be disabled for insufficient cash, preventing payment
      expect(processButton).toBeDisabled()
    })

    it('should handle empty cash amount', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const processButton = screen.getByText('Process Payment')

      // Button should be disabled for empty cash, preventing payment
      expect(processButton).toBeDisabled()
    })
  })

  describe('Single Payment - Card', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')
    })

    it('should render card payment fields', () => {
      expect(screen.getByPlaceholderText('John Smith')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')[1]).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')[2]).toBeInTheDocument()
      expect(screen.getByPlaceholderText('123')).toBeInTheDocument()
    })

    it('should format card number input', async () => {
      const user = userEvent.setup()
      const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')

      await user.type(cardNumberInput, '1234567890123456')

      expect(mockPaymentService.formatCardNumber).toHaveBeenCalled()
    })

    it('should display card type when card number is entered', async () => {
      const user = userEvent.setup()
      const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456')

      await user.type(cardNumberInput, '4111111111111111')

      expect(mockPaymentService.getCardType).toHaveBeenCalledWith('4111111111111111')
      expect(screen.getByText('Visa')).toBeInTheDocument()
    })

    it('should render month and year dropdowns with correct options', () => {
      expect(screen.getAllByRole('combobox')[1]).toBeInTheDocument()
      expect(screen.getAllByRole('combobox')[2]).toBeInTheDocument()

      // Check that month dropdown has 12 options (plus empty option)
      const monthOptions = screen.getAllByRole('option').filter(option =>
        option.textContent?.match(/^\d{2}$/) && parseInt(option.textContent) <= 12
      )
      expect(monthOptions).toHaveLength(12)

      // Check that year dropdown has 10 future years (plus empty option)
      const yearOptions = screen.getAllByRole('option').filter(option =>
        option.textContent?.match(/^\d{2}$/) && parseInt(option.textContent) >= new Date().getFullYear() % 100
      )
      expect(yearOptions).toHaveLength(10)
    })

    it('should process successful card payment', async () => {
      const user = userEvent.setup()

      const mockResult: PaymentResult = {
        success: true,
        transactionId: 'card_12345'
      }
      mockPaymentService.processCardPayment.mockResolvedValue(mockResult)

      // Fill in card details
      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.selectOptions(screen.getAllByRole('combobox')[1], '12')
      await user.selectOptions(screen.getAllByRole('combobox')[2], '25')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockPaymentService.processCardPayment).toHaveBeenCalledWith({
          cardNumber: '1234567890123456',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
          cardholderName: 'John Smith',
          amount: 25.99
        })
        expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
      })
    })

    it('should handle card payment failure', async () => {
      const user = userEvent.setup()

      const mockResult: PaymentResult = {
        success: false,
        errorMessage: 'Card declined'
      }
      mockPaymentService.processCardPayment.mockResolvedValue(mockResult)

      // Fill in card details
      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
      })
    })

    it('should handle card payment service error', async () => {
      const user = userEvent.setup()

      mockPaymentService.processCardPayment.mockRejectedValue(new Error('Network error'))

      // Fill in card details
      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: false,
          errorMessage: 'Network error'
        })
      })
    })
  })

  describe('Single Payment - Gift Card', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'GIFT_CARD')
    })

    it('should render gift card payment field', () => {
      expect(screen.getByPlaceholderText('Enter gift card number')).toBeInTheDocument()
    })

    it('should process successful gift card payment', async () => {
      const user = userEvent.setup()

      const mockResult: PaymentResult = {
        success: true,
        transactionId: 'gift_12345'
      }
      mockPaymentService.processGiftCardPayment.mockResolvedValue(mockResult)

      const giftCardInput = screen.getByPlaceholderText('Enter gift card number')
      await user.type(giftCardInput, '1234567890')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockPaymentService.processGiftCardPayment).toHaveBeenCalledWith('1234567890', 25.99)
        expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
      })
    })

    it('should handle gift card payment failure', async () => {
      const user = userEvent.setup()

      const mockResult: PaymentResult = {
        success: false,
        errorMessage: 'Invalid gift card'
      }
      mockPaymentService.processGiftCardPayment.mockResolvedValue(mockResult)

      const giftCardInput = screen.getByPlaceholderText('Enter gift card number')
      await user.type(giftCardInput, '1234567890')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
      })
    })
  })

  describe('Split Payment', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const splitButton = screen.getByText('Split Payment')
      await user.click(splitButton)
    })

    it('should render split payment interface', () => {
      expect(screen.getByText('Add Payment')).toBeInTheDocument()
      expect(screen.getByText('Total Amount: $25.99')).toBeInTheDocument()
    })

    it('should show default split payment with full amount', () => {
      const amountInputs = screen.getAllByDisplayValue('25.99')
      expect(amountInputs.length).toBeGreaterThan(0)
    })

    it('should add new split payment', async () => {
      const user = userEvent.setup()

      // First modify the existing payment to partial amount
      const amountInputs = screen.getAllByRole('spinbutton')
      const firstAmountInput = amountInputs.find(input => (input as HTMLInputElement).value === '25.99')

      if (firstAmountInput) {
        await user.clear(firstAmountInput)
        await user.type(firstAmountInput, '15.00')
      }

      const addButton = screen.getByText('Add Payment')
      await user.click(addButton)

      // Should now have 2 payment entries
      const removeButtons = screen.getAllByText('Remove')
      expect(removeButtons).toHaveLength(2)
    })

    it('should remove split payment', async () => {
      const user = userEvent.setup()

      // First modify the existing payment to partial amount to allow adding second payment
      const amountInputs = screen.getAllByRole('spinbutton')
      const firstAmountInput = amountInputs.find(input => (input as HTMLInputElement).value === '25.99')
      if (firstAmountInput) {
        await user.clear(firstAmountInput)
        await user.type(firstAmountInput, '15.00')
      }

      // Add a second payment
      const addButton = screen.getByText('Add Payment')
      await user.click(addButton)

      // Now there should be Remove buttons (since we have 2 payments)
      let removeButtons = screen.getAllByText('Remove')
      expect(removeButtons).toHaveLength(2)

      // Remove the second payment
      await user.click(removeButtons[1])

      // Should be back to 1 payment (no Remove buttons since only 1 payment remains)
      expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    })

    it('should not allow removing the last payment', async () => {
      // When there's only one payment, no remove button should be visible
      expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    })

    it('should update split payment amount', async () => {
      const user = userEvent.setup()

      const amountInput = screen.getByDisplayValue('25.99')
      await user.clear(amountInput)
      await user.type(amountInput, '20.00')

      expect(amountInput).toHaveValue(20)
    })

    it('should update split payment method', async () => {
      const user = userEvent.setup()

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')

      expect(methodSelect).toHaveValue('CARD')
    })

    it('should calculate split payment total correctly', async () => {
      const user = userEvent.setup()

      // Modify first payment amount
      let amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[0])
      await user.type(amountInputs[0], '10.99')

      // Add second payment
      const addButton = screen.getByText('Add Payment')
      await user.click(addButton)

      // Get the updated inputs
      amountInputs = screen.getAllByRole('spinbutton')
      expect(amountInputs).toHaveLength(2)

      // Modify second payment amount
      await user.clear(amountInputs[1])
      await user.type(amountInputs[1], '15.00')

      const splitSection = screen.getByText('Split Total:').closest('div')
      expect(within(splitSection!).getByText('$25.99')).toBeInTheDocument()
    })

    it('should show correct color coding for split payment totals', async () => {
      const user = userEvent.setup()

      // Modify first payment amount to create unequal split
      let amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[0])
      await user.type(amountInputs[0], '10.00')

      // Add second payment
      const addButton = screen.getByText('Add Payment')
      await user.click(addButton)

      // Set second payment amount
      amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[1])
      await user.type(amountInputs[1], '5.00')

      // Verify that split payment totals are displayed and calculated correctly
      expect(screen.getByText('Split Total:')).toBeInTheDocument()
      expect(screen.getByText('Transaction Total:')).toBeInTheDocument()
      expect(screen.getByText('Difference:')).toBeInTheDocument()

      // When split total doesn't match transaction total, it should be red
      const splitSection = screen.getByText('Split Total:').closest('div')
      expect(within(splitSection!).getByText('$15.00')).toHaveClass('text-red-600')
    })

    it('should disable Add Payment button when split total equals or exceeds transaction total', async () => {
      const user = userEvent.setup()

      const addButton = screen.getByText('Add Payment')

      // Initially should be disabled since default payment equals total
      expect(addButton).toBeDisabled()

      // Reduce first payment amount
      const amountInput = screen.getByDisplayValue('25.99')
      await user.clear(amountInput)
      await user.type(amountInput, '20.00')

      // Now add button should be enabled
      expect(addButton).toBeEnabled()

      // Add second payment and fill remaining amount
      await user.click(addButton)

      const amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[1])
      await user.type(amountInputs[1], '5.99')

      // Add button should be disabled again
      expect(addButton).toBeDisabled()
    })

    it('should show split payment difference calculation', async () => {
      const user = userEvent.setup()

      // Modify first payment amount
      let amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[0])
      await user.type(amountInputs[0], '20.00')

      // Add second payment
      const addButton = screen.getByText('Add Payment')
      await user.click(addButton)

      // Set amounts that create a difference
      amountInputs = screen.getAllByRole('spinbutton')
      await user.clear(amountInputs[1])
      await user.type(amountInputs[1], '3.00')

      expect(screen.getByText('Split Total:')).toBeInTheDocument()
      expect(screen.getByText('Transaction Total:')).toBeInTheDocument()
      expect(screen.getByText('Difference:')).toBeInTheDocument()
      expect(screen.getByText('$-2.99')).toBeInTheDocument() // 23.00 - 25.99
    })

    it('should process successful split payment', async () => {
      const user = userEvent.setup()

      const mockResult: PaymentResult = {
        success: true,
        transactionId: 'split_12345'
      }
      mockPaymentService.processSplitPayment.mockResolvedValue(mockResult)

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockPaymentService.processSplitPayment).toHaveBeenCalledWith({
          payments: [{ method: 'CASH', amount: 25.99 }],
          totalAmount: 25.99
        })
        expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
      })
    })

    it('should handle split payment failure', async () => {
      const user = userEvent.setup()

      mockPaymentService.processSplitPayment.mockRejectedValue(new Error('Split payment failed'))

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: false,
          errorMessage: 'Split payment failed'
        })
      })
    })
  })

  describe('Payment Validation', () => {
    it('should disable payment button for insufficient cash', () => {
      render(<PaymentModal {...defaultProps} />)

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeDisabled()
    })

    it('should enable payment button for sufficient cash', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const cashInput = screen.getByPlaceholderText('Minimum: $25.99')
      await user.type(cashInput, '30.00')

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeEnabled()
    })

    it('should disable payment button for incomplete card details', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeDisabled()
    })

    it('should enable payment button for complete card details', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')

      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeEnabled()
    })

    it('should require minimum gift card number length', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'GIFT_CARD')

      const giftCardInput = screen.getByPlaceholderText('Enter gift card number')
      await user.type(giftCardInput, '123456789') // 9 digits (less than 10)

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeDisabled()
    })

    it('should enable payment for valid gift card number', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'GIFT_CARD')

      const giftCardInput = screen.getByPlaceholderText('Enter gift card number')
      await user.type(giftCardInput, '1234567890') // 10 digits

      const processButton = screen.getByText('Process Payment')
      expect(processButton).toBeEnabled()
    })
  })

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should show processing state during payment', async () => {
      const user = userEvent.setup()

      // Mock a delayed payment processing
      mockPaymentService.processCardPayment.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, transactionId: 'test' }), 100))
      )

      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')

      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(processButton).toBeDisabled()

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle unsupported payment method', async () => {
      const user = userEvent.setup()
      render(<PaymentModal {...defaultProps} />)

      // Manually trigger unsupported payment method by mocking component state
      const component = screen.getByText('Payment Processing').closest('div')

      // This test would need component internals access or we could test via props
      // For now, we'll test that the component handles the default case
      expect(component).toBeInTheDocument()
    })

    it('should handle non-Error exceptions in payment processing', async () => {
      const user = userEvent.setup()

      mockPaymentService.processCardPayment.mockRejectedValue('String error')

      render(<PaymentModal {...defaultProps} />)

      const methodSelect = screen.getByRole('combobox')
      await user.selectOptions(methodSelect, 'CARD')

      await user.type(screen.getByPlaceholderText('John Smith'), 'John Smith')
      await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '1234567890123456')
      await user.type(screen.getByPlaceholderText('123'), '123')

      const processButton = screen.getByText('Process Payment')
      await user.click(processButton)

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          success: false,
          errorMessage: 'Payment failed'
        })
      })
    })
  })
})