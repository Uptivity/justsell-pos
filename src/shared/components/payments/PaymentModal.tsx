import { useState } from 'react'
import { paymentService } from '../../services/payments'
import type { PaymentMethod } from '../../types/database'
import type { CardPaymentData, SplitPaymentData, PaymentResult } from '../../services/payments'

interface PaymentModalProps {
  totalAmount: number
  onComplete: (result: PaymentResult) => void
  onCancel: () => void
  isOpen: boolean
}

export function PaymentModal({ totalAmount, onComplete, onCancel, isOpen }: PaymentModalProps) {
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)

  // Cash payment state
  const [cashTendered, setCashTendered] = useState('')

  // Card payment state
  const [cardData, setCardData] = useState<CardPaymentData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    amount: totalAmount
  })

  // Gift card state
  const [giftCardNumber, setGiftCardNumber] = useState('')

  // Split payment state
  const [splitPayments, setSplitPayments] = useState<SplitPaymentData['payments']>([
    { method: 'CASH', amount: totalAmount }
  ])

  if (!isOpen) return null

  const handleSinglePayment = async () => {
    setIsProcessing(true)

    try {
      let result: PaymentResult

      switch (selectedMethod) {
        case 'CASH':
          const cashAmount = parseFloat(cashTendered)
          if (!cashAmount || cashAmount < totalAmount) {
            result = {
              success: false,
              errorMessage: 'Insufficient cash amount'
            }
          } else {
            result = {
              success: true,
              transactionId: `cash_${Date.now()}`
            }
          }
          break

        case 'CARD':
          result = await paymentService.processCardPayment({
            ...cardData,
            amount: totalAmount
          })
          break

        case 'GIFT_CARD':
          result = await paymentService.processGiftCardPayment(giftCardNumber, totalAmount)
          break

        default:
          result = {
            success: false,
            errorMessage: 'Unsupported payment method'
          }
      }

      onComplete(result)
    } catch (error) {
      onComplete({
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Payment failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSplitPayment = async () => {
    setIsProcessing(true)

    try {
      const result = await paymentService.processSplitPayment({
        payments: splitPayments,
        totalAmount
      })

      onComplete(result)
    } catch (error) {
      onComplete({
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Split payment failed'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const addSplitPayment = () => {
    const remainingAmount = totalAmount - splitPayments.reduce((sum, p) => sum + p.amount, 0)
    if (remainingAmount > 0) {
      setSplitPayments([
        ...splitPayments,
        { method: 'CASH', amount: Math.max(0.01, remainingAmount) }
      ])
    }
  }

  const removeSplitPayment = (index: number) => {
    if (splitPayments.length > 1) {
      setSplitPayments(splitPayments.filter((_, i) => i !== index))
    }
  }

  const updateSplitPayment = (index: number, field: string, value: any) => {
    const updated = [...splitPayments]
    updated[index] = { ...updated[index], [field]: value }
    setSplitPayments(updated)
  }

  const getSplitTotal = () => {
    return splitPayments.reduce((sum, payment) => sum + payment.amount, 0)
  }

  const isValidPayment = () => {
    if (paymentMode === 'single') {
      if (selectedMethod === 'CASH') {
        return parseFloat(cashTendered) >= totalAmount
      } else if (selectedMethod === 'CARD') {
        return cardData.cardNumber && cardData.cvv && cardData.cardholderName
      } else if (selectedMethod === 'GIFT_CARD') {
        return giftCardNumber.length >= 10
      }
    } else {
      return Math.abs(getSplitTotal() - totalAmount) < 0.01
    }
    return false
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Payment Processing</h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-lg font-semibold">
            Total Amount: ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Payment Mode Selection */}
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setPaymentMode('single')}
              className={`px-4 py-2 rounded ${
                paymentMode === 'single' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Single Payment
            </button>
            <button
              onClick={() => setPaymentMode('split')}
              className={`px-4 py-2 rounded ${
                paymentMode === 'split' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Split Payment
            </button>
          </div>
        </div>

        {/* Single Payment */}
        {paymentMode === 'single' && (
          <div className="space-y-4">
            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method:</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="GIFT_CARD">Gift Card</option>
              </select>
            </div>

            {/* Cash Payment Fields */}
            {selectedMethod === 'CASH' && (
              <div>
                <label className="block text-sm font-medium mb-2">Cash Tendered:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder={`Minimum: $${totalAmount.toFixed(2)}`}
                />
                {cashTendered && parseFloat(cashTendered) >= totalAmount && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: ${(parseFloat(cashTendered) - totalAmount).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Card Payment Fields */}
            {selectedMethod === 'CARD' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Cardholder Name:</label>
                  <input
                    type="text"
                    value={cardData.cardholderName}
                    onChange={(e) => setCardData({...cardData, cardholderName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number:</label>
                  <input
                    type="text"
                    value={paymentService.formatCardNumber(cardData.cardNumber)}
                    onChange={(e) => setCardData({...cardData, cardNumber: e.target.value.replace(/\s/g, '')})}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                  {cardData.cardNumber && (
                    <p className="text-sm text-gray-600 mt-1">
                      {paymentService.getCardType(cardData.cardNumber)}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Month:</label>
                    <select
                      value={cardData.expiryMonth}
                      onChange={(e) => setCardData({...cardData, expiryMonth: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">MM</option>
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={(i+1).toString().padStart(2, '0')}>
                          {(i+1).toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Year:</label>
                    <select
                      value={cardData.expiryYear}
                      onChange={(e) => setCardData({...cardData, expiryYear: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="">YY</option>
                      {Array.from({length: 10}, (_, i) => {
                        const year = (new Date().getFullYear() + i).toString().slice(-2)
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">CVV:</label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Gift Card Payment Fields */}
            {selectedMethod === 'GIFT_CARD' && (
              <div>
                <label className="block text-sm font-medium mb-2">Gift Card Number:</label>
                <input
                  type="text"
                  value={giftCardNumber}
                  onChange={(e) => setGiftCardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter gift card number"
                />
              </div>
            )}
          </div>
        )}

        {/* Split Payment */}
        {paymentMode === 'split' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Split Payments</h3>
              <button
                onClick={addSplitPayment}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                disabled={getSplitTotal() >= totalAmount}
              >
                Add Payment
              </button>
            </div>

            {splitPayments.map((payment, index) => (
              <div key={index} className="border border-gray-300 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Payment {index + 1}</span>
                  {splitPayments.length > 1 && (
                    <button
                      onClick={() => removeSplitPayment(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Method:</label>
                    <select
                      value={payment.method}
                      onChange={(e) => updateSplitPayment(index, 'method', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="GIFT_CARD">Gift Card</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={payment.amount}
                      onChange={(e) => updateSplitPayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between">
                <span>Split Total:</span>
                <span className={getSplitTotal() === totalAmount ? 'text-green-600' : 'text-red-600'}>
                  ${getSplitTotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Difference:</span>
                <span className={Math.abs(getSplitTotal() - totalAmount) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                  ${(getSplitTotal() - totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={paymentMode === 'single' ? handleSinglePayment : handleSplitPayment}
            disabled={isProcessing || !isValidPayment()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {isProcessing ? 'Processing...' : 'Process Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}