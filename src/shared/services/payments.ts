import { api } from './api'

export interface CardPaymentData {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardholderName: string
  amount: number
}

export interface SplitPaymentData {
  payments: {
    method: 'CASH' | 'CARD' | 'GIFT_CARD'
    amount: number
    cardData?: CardPaymentData
    giftCardNumber?: string
  }[]
  totalAmount: number
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  authorizationCode?: string
  last4Digits?: string
  errorMessage?: string
  receiptData?: any
}

export const paymentService = {
  // Process card payment (mock implementation)
  async processCardPayment(cardData: CardPaymentData): Promise<PaymentResult> {
    try {
      // In a real implementation, this would integrate with a payment processor
      // like Stripe, Square, or a traditional POS payment terminal
      
      // Mock validation
      if (!cardData.cardNumber || cardData.cardNumber.length < 13) {
        throw new Error('Invalid card number')
      }
      
      if (!cardData.cvv || cardData.cvv.length < 3) {
        throw new Error('Invalid CVV')
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock successful response (90% success rate for demo)
      const isSuccess = Math.random() > 0.1

      if (!isSuccess) {
        return {
          success: false,
          errorMessage: 'Card declined - insufficient funds'
        }
      }

      return {
        success: true,
        transactionId: `card_${Date.now()}`,
        authorizationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        last4Digits: cardData.cardNumber.slice(-4)
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Payment processing failed'
      }
    }
  },

  // Process gift card payment (mock implementation)
  async processGiftCardPayment(giftCardNumber: string, amount: number): Promise<PaymentResult> {
    try {
      // Mock gift card validation
      const mockGiftCards = {
        '1234567890123456': { balance: 100.00, active: true },
        '9876543210987654': { balance: 25.50, active: true },
        '1111222233334444': { balance: 0.00, active: true }
      }

      const giftCard = mockGiftCards[giftCardNumber as keyof typeof mockGiftCards]

      if (!giftCard) {
        return {
          success: false,
          errorMessage: 'Invalid gift card number'
        }
      }

      if (!giftCard.active) {
        return {
          success: false,
          errorMessage: 'Gift card is not active'
        }
      }

      if (giftCard.balance < amount) {
        return {
          success: false,
          errorMessage: `Insufficient gift card balance. Available: $${giftCard.balance.toFixed(2)}`
        }
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        transactionId: `gift_${Date.now()}`
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Gift card processing failed'
      }
    }
  },

  // Process split payment
  async processSplitPayment(splitData: SplitPaymentData): Promise<PaymentResult> {
    try {
      const results: PaymentResult[] = []
      let totalPaid = 0

      // Validate total amounts match
      const splitTotal = splitData.payments.reduce((sum, payment) => sum + payment.amount, 0)
      if (Math.abs(splitTotal - splitData.totalAmount) > 0.01) {
        return {
          success: false,
          errorMessage: 'Split payment amounts do not match transaction total'
        }
      }

      // Process each payment
      for (const payment of splitData.payments) {
        let result: PaymentResult

        switch (payment.method) {
          case 'CASH':
            // Cash payments are always successful (assuming correct change given)
            result = {
              success: true,
              transactionId: `cash_${Date.now()}`
            }
            break

          case 'CARD':
            if (!payment.cardData) {
              result = {
                success: false,
                errorMessage: 'Card data required for card payment'
              }
            } else {
              result = await this.processCardPayment({
                ...payment.cardData,
                amount: payment.amount
              })
            }
            break

          case 'GIFT_CARD':
            if (!payment.giftCardNumber) {
              result = {
                success: false,
                errorMessage: 'Gift card number required'
              }
            } else {
              result = await this.processGiftCardPayment(payment.giftCardNumber, payment.amount)
            }
            break

          default:
            result = {
              success: false,
              errorMessage: `Unsupported payment method: ${payment.method}`
            }
        }

        results.push(result)

        if (!result.success) {
          // If any payment fails, the entire split payment fails
          return {
            success: false,
            errorMessage: `${payment.method} payment failed: ${result.errorMessage}`
          }
        }

        totalPaid += payment.amount
      }

      return {
        success: true,
        transactionId: `split_${Date.now()}`,
        receiptData: {
          splitPayments: results.map((result, index) => ({
            method: splitData.payments[index].method,
            amount: splitData.payments[index].amount,
            transactionId: result.transactionId,
            authorizationCode: result.authorizationCode,
            last4Digits: result.last4Digits
          })),
          totalPaid
        }
      }
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Split payment processing failed'
      }
    }
  },

  // Validate card number using Luhn algorithm
  validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false
    }

    let sum = 0
    let isEven = false

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10)

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  },

  // Get card type from number
  getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    
    if (/^4/.test(cleaned)) return 'Visa'
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard'
    if (/^3[47]/.test(cleaned)) return 'American Express'
    if (/^6/.test(cleaned)) return 'Discover'
    
    return 'Unknown'
  },

  // Format card number for display
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ')
  },

  // Mask card number for security
  maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (cleaned.length < 4) return cleaned
    
    const last4 = cleaned.slice(-4)
    const masked = '*'.repeat(cleaned.length - 4)
    
    return this.formatCardNumber(masked + last4)
  }
}