import { useState } from 'react'
import { ProductList } from '../../shared/components/products'
import { ProtectedRoute } from '../../shared/components/auth'
import { CustomerSearch } from '../../shared/components/customers'
import { useAuth } from '../../shared/hooks/useAuth'
import { useCreateTransaction } from '../../shared/hooks/useTransactions'
import type { Product, PaymentMethod } from '../../shared/types/database'
import type { CreateTransactionData } from '../../shared/types/transactions'
import type { CustomerSearchResult } from '../../shared/types/customers'

interface CartItem {
  product: Product
  quantity: number
  lineTotal: number
}

export function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchCode, setSearchCode] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [cashTendered, setCashTendered] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const { user } = useAuth()
  const createTransactionMutation = useCreateTransaction()

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)
      
      if (existingItem) {
        // Update quantity if item already exists
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * parseFloat(product.price.toString())
              }
            : item
        )
      } else {
        // Add new item to cart
        return [...prev, {
          product,
          quantity: 1,
          lineTotal: parseFloat(product.price.toString())
        }]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              lineTotal: quantity * parseFloat(item.product.price.toString())
            }
          : item
      )
    )
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.lineTotal, 0)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const hasAgeRestrictedItems = () => {
    return cart.some(item => item.product.ageRestricted)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)

    try {
      const transactionData: CreateTransactionData = {
        customerId: selectedCustomer?.id,
        cartItems: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        paymentMethod,
        cashTendered: paymentMethod === 'CASH' ? parseFloat(cashTendered) || undefined : undefined,
        ageVerificationCompleted: hasAgeRestrictedItems() ? true : undefined, // TODO: Implement proper age verification
        storeId: user?.storeId || undefined
      }

      const transaction = await createTransactionMutation.mutateAsync(transactionData)
      
      // Success! Clear cart and show success message
      setCart([])
      setShowCheckout(false)
      setCashTendered('')
      setSelectedCustomer(null)
      
      const loyaltyMessage = selectedCustomer && transaction.loyaltyPointsEarned > 0 
        ? `\nLoyalty Points Earned: ${transaction.loyaltyPointsEarned}`
        : ''
      
      alert(`Transaction completed successfully!\nReceipt: ${transaction.receiptNumber}\nTotal: ${formatPrice(transaction.totalAmount)}${loyaltyMessage}`)
      
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(`Checkout failed: ${error.response?.data?.message || error.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const validateCashPayment = () => {
    if (paymentMethod !== 'CASH') return true
    const cash = parseFloat(cashTendered) || 0
    const total = getCartTotal() * 1.08 // Including tax
    return cash >= total
  }

  return (
    <ProtectedRoute requiredPermission="transaction:create">
      <div className="min-h-screen bg-gray-50 flex">
        {/* Product Selection - Left Side */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Point of Sale</h1>
            <p className="text-gray-600">Cashier: {user?.firstName} {user?.lastName}</p>
          </div>

          {/* Quick Search */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or enter SKU/Barcode..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // TODO: Implement product search by code and auto-add to cart
                    console.log('Search for:', searchCode)
                  }
                }}
              />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  // TODO: Implement barcode scanning
                  console.log('Open barcode scanner')
                }}
              >
                Scan
              </button>
            </div>
          </div>

          {/* Product List */}
          <ProductList
            onSelectProduct={addToCart}
            selectable
            className="h-full"
          />
        </div>

        {/* Shopping Cart - Right Side */}
        <div className="w-96 bg-white shadow-lg border-l">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>Cart is empty</p>
                <p className="text-sm">Select products to add to cart</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatPrice(parseFloat(item.product.price.toString()))} each
                      </p>
                      {item.product.ageRestricted && (
                        <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded mt-1">
                          Age Verification Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(item.lineTotal)}</p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Total and Checkout */}
          {cart.length > 0 && (
            <div className="border-t p-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(getCartTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatPrice(getCartTotal() * 0.08)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(getCartTotal() * 1.08)}</span>
                </div>
              </div>
              
              <button
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400"
                onClick={() => setShowCheckout(true)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Checkout'}
              </button>
              
              <button
                className="w-full mt-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setCart([])}
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h2 className="text-xl font-bold mb-4">Complete Transaction</h2>
            
            {/* Age Verification Warning */}
            {hasAgeRestrictedItems() && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-red-800 font-medium text-sm">
                  ⚠️ Age Verification Required
                </p>
                <p className="text-red-700 text-xs">
                  Cart contains age-restricted products. Verify customer age before completing transaction.
                </p>
              </div>
            )}

            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Customer (Optional):</label>
              <CustomerSearch
                onSelectCustomer={setSelectedCustomer}
                onClearCustomer={() => setSelectedCustomer(null)}
                selectedCustomer={selectedCustomer}
                placeholder="Search by name, email, or phone..."
                className="w-full"
              />
              {selectedCustomer && (
                <div className="mt-2 text-sm text-green-600">
                  💰 Will earn {Math.floor(getCartTotal() * 1.08)} loyalty points!
                </div>
              )}
            </div>

            {/* Transaction Summary */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(getCartTotal())}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax:</span>
                <span>{formatPrice(getCartTotal() * 0.08)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatPrice(getCartTotal() * 1.08)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Method:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="GIFT_CARD">Gift Card</option>
              </select>
            </div>

            {/* Cash Payment Fields */}
            {paymentMethod === 'CASH' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Cash Tendered:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Minimum: ${formatPrice(getCartTotal() * 1.08)}`}
                />
                {cashTendered && parseFloat(cashTendered) >= (getCartTotal() * 1.08) && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: {formatPrice(parseFloat(cashTendered) - (getCartTotal() * 1.08))}
                  </p>
                )}
                {cashTendered && !validateCashPayment() && (
                  <p className="text-sm text-red-600 mt-1">
                    Insufficient cash amount
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={isProcessing || !validateCashPayment()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Processing...' : 'Complete Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}