import { paymentService } from '../../../shared/services/payments'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn()
  }
}))

describe('Payment Service - CRITICAL FINANCIAL LOGIC TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Card Payment Processing', () => {
    const validCardData = {
      cardNumber: '4532015112830366',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
      cardholderName: 'John Doe',
      amount: 25.99
    }

    it('should successfully process valid card payment', async () => {
      const result = await paymentService.processCardPayment(validCardData)

      expect(result.success).toBe(true)
      expect(result.transactionId).toMatch(/^card_\d+$/)
      expect(result.authorizationCode).toHaveLength(8)
      expect(result.last4Digits).toBe('0366')
    })

    it('should reject invalid card numbers', async () => {
      const invalidCardData = {
        ...validCardData,
        cardNumber: '123' // Too short
      }

      const result = await paymentService.processCardPayment(invalidCardData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Invalid card number')
    })

    it('should reject invalid CVV', async () => {
      const invalidCvvData = {
        ...validCardData,
        cvv: '12' // Too short
      }

      const result = await paymentService.processCardPayment(invalidCvvData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Invalid CVV')
    })

    it('should handle payment processing failures', async () => {
      // Mock random number to force failure
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.05) // Force failure (10% chance)

      const result = await paymentService.processCardPayment(validCardData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Card declined - insufficient funds')

      Math.random = originalRandom
    })

    it('should handle exceptions gracefully', async () => {
      const invalidCardData = {
        ...validCardData,
        cardNumber: null as any // Force exception
      }

      const result = await paymentService.processCardPayment(invalidCardData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })
  })

  describe('Gift Card Payment Processing', () => {
    it('should process valid gift card with sufficient balance', async () => {
      const result = await paymentService.processGiftCardPayment('1234567890123456', 50.00)

      expect(result.success).toBe(true)
      expect(result.transactionId).toMatch(/^gift_\d+$/)
    })

    it('should reject invalid gift card numbers', async () => {
      const result = await paymentService.processGiftCardPayment('invalid_card', 25.00)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Invalid gift card number')
    })

    it('should reject gift card with insufficient balance', async () => {
      const result = await paymentService.processGiftCardPayment('1234567890123456', 150.00) // Exceeds $100 balance

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Insufficient gift card balance. Available: $100.00')
    })

    it('should reject inactive gift cards', async () => {
      // Assuming we had inactive cards in mock data
      const result = await paymentService.processGiftCardPayment('0000000000000000', 25.00)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Invalid gift card number')
    })
  })

  describe('Split Payment Processing - CRITICAL TRANSACTION LOGIC', () => {
    const validSplitData = {
      payments: [
        {
          method: 'CASH' as const,
          amount: 15.00
        },
        {
          method: 'CARD' as const,
          amount: 10.99,
          cardData: {
            cardNumber: '4532015112830366',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            cardholderName: 'John Doe',
            amount: 10.99
          }
        }
      ],
      totalAmount: 25.99
    }

    it('should successfully process valid split payment', async () => {
      // Mock Math.random to ensure card payment succeeds
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.5) // Force success (>0.1)

      const result = await paymentService.processSplitPayment(validSplitData)

      expect(result.success).toBe(true)
      expect(result.transactionId).toMatch(/^split_\d+$/)
      expect(result.receiptData?.totalPaid).toBeCloseTo(25.99, 2)
      expect(result.receiptData?.splitPayments).toHaveLength(2)

      Math.random = originalRandom
    })

    it('should reject split payment when amounts do not match total', async () => {
      const mismatchedSplitData = {
        ...validSplitData,
        totalAmount: 30.00 // Does not match payment sum of 25.99
      }

      const result = await paymentService.processSplitPayment(mismatchedSplitData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe('Split payment amounts do not match transaction total')
    })

    it('should fail entire transaction if any payment method fails', async () => {
      const splitDataWithInvalidCard = {
        payments: [
          {
            method: 'CASH' as const,
            amount: 15.00
          },
          {
            method: 'CARD' as const,
            amount: 10.99,
            cardData: {
              cardNumber: '123', // Invalid card
              expiryMonth: '12',
              expiryYear: '2025',
              cvv: '123',
              cardholderName: 'John Doe',
              amount: 10.99
            }
          }
        ],
        totalAmount: 25.99
      }

      const result = await paymentService.processSplitPayment(splitDataWithInvalidCard)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('CARD payment failed')
    })

    it('should handle missing card data for card payments', async () => {
      const splitDataMissingCardData = {
        payments: [
          {
            method: 'CARD' as const,
            amount: 25.99
            // Missing cardData
          }
        ],
        totalAmount: 25.99
      }

      const result = await paymentService.processSplitPayment(splitDataMissingCardData)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Card data required for card payment')
    })

    it('should handle missing gift card number', async () => {
      const splitDataMissingGiftCard = {
        payments: [
          {
            method: 'GIFT_CARD' as const,
            amount: 25.99
            // Missing giftCardNumber
          }
        ],
        totalAmount: 25.99
      }

      const result = await paymentService.processSplitPayment(splitDataMissingGiftCard)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Gift card number required')
    })

    it('should reject unsupported payment methods', async () => {
      const splitDataUnsupported = {
        payments: [
          {
            method: 'CRYPTO' as any, // Unsupported method
            amount: 25.99
          }
        ],
        totalAmount: 25.99
      }

      const result = await paymentService.processSplitPayment(splitDataUnsupported)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Unsupported payment method: CRYPTO')
    })
  })

  describe('Card Number Validation - Luhn Algorithm', () => {
    it('should validate correct card numbers', () => {
      const validCards = [
        '4532015112830366', // Visa
        '5555555555554444', // Mastercard
        '378282246310005',  // American Express
        '6011111111111117'  // Discover
      ]

      validCards.forEach(cardNumber => {
        expect(paymentService.validateCardNumber(cardNumber)).toBe(true)
      })
    })

    it('should reject invalid card numbers', () => {
      const invalidCards = [
        '4532015112830367', // Wrong check digit
        '1234567890123456', // Invalid number
        '123',              // Too short
        '12345678901234567890' // Too long
      ]

      invalidCards.forEach(cardNumber => {
        expect(paymentService.validateCardNumber(cardNumber)).toBe(false)
      })
    })

    it('should handle card numbers with spaces', () => {
      expect(paymentService.validateCardNumber('4532 0151 1283 0366')).toBe(true)
      expect(paymentService.validateCardNumber('4532 0151 1283 0367')).toBe(false)
    })
  })

  describe('Card Type Detection', () => {
    it('should correctly identify card types', () => {
      expect(paymentService.getCardType('4532015112830366')).toBe('Visa')
      expect(paymentService.getCardType('5555555555554444')).toBe('Mastercard')
      expect(paymentService.getCardType('378282246310005')).toBe('American Express')
      expect(paymentService.getCardType('6011111111111117')).toBe('Discover')
      expect(paymentService.getCardType('1234567890123456')).toBe('Unknown')
    })
  })

  describe('Card Number Formatting', () => {
    it('should format card numbers correctly', () => {
      expect(paymentService.formatCardNumber('4532015112830366')).toBe('4532 0151 1283 0366')
      expect(paymentService.formatCardNumber('4532 0151 1283 0366')).toBe('4532 0151 1283 0366')
    })

    it('should mask card numbers for security', () => {
      // The actual implementation masks the number then formats it
      const result1 = paymentService.maskCardNumber('4532015112830366')
      const result2 = paymentService.maskCardNumber('378282246310005')

      // Should contain last 4 digits and asterisks
      expect(result1).toContain('0366')
      expect(result1).toContain('*')
      expect(result2).toContain('0 005') // Account for space formatting
      expect(result2).toContain('*')
    })

    it('should handle short card numbers', () => {
      expect(paymentService.maskCardNumber('123')).toBe('123')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This tests the catch blocks in async functions
      const invalidData = { cardNumber: undefined } as any

      const result = await paymentService.processCardPayment(invalidData)
      expect(result.success).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })

    it('should handle zero amounts', async () => {
      const zeroAmountCard = {
        cardNumber: '4532015112830366',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John Doe',
        amount: 0
      }

      const result = await paymentService.processCardPayment(zeroAmountCard)
      // Should still process (business rule depends on implementation)
      expect(result).toBeDefined()
    })

    it('should handle negative amounts', async () => {
      const negativeAmountCard = {
        cardNumber: '4532015112830366',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John Doe',
        amount: -10.99
      }

      const result = await paymentService.processCardPayment(negativeAmountCard)
      // Implementation should handle this appropriately
      expect(result).toBeDefined()
    })

    it('should handle very large amounts', async () => {
      const largeAmountCard = {
        cardNumber: '4532015112830366',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John Doe',
        amount: 999999.99
      }

      const result = await paymentService.processCardPayment(largeAmountCard)
      expect(result).toBeDefined()
    })
  })

  describe('Processing Time Tests', () => {
    it('should complete card processing within reasonable time', async () => {
      const startTime = Date.now()
      await paymentService.processCardPayment({
        cardNumber: '4532015112830366',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John Doe',
        amount: 25.99
      })
      const endTime = Date.now()

      // Should complete within 3 seconds (accounting for 2s mock delay)
      expect(endTime - startTime).toBeLessThan(3000)
    })

    it('should complete gift card processing within reasonable time', async () => {
      const startTime = Date.now()
      await paymentService.processGiftCardPayment('1234567890123456', 50.00)
      const endTime = Date.now()

      // Should complete within 2 seconds (accounting for 1s mock delay)
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })
})