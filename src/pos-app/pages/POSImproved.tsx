import { useState, useEffect } from 'react'
import { ProductList } from '../../shared/components/products'
import { ProtectedRoute } from '../../shared/components/auth'
import { CustomerSearch } from '../../shared/components/customers'
import { useAuth } from '../../shared/hooks/useAuth'
import { useCreateTransaction } from '../../shared/hooks/useTransactions'
import type { Product, PaymentMethod } from '../../shared/types/database'
import type { CreateTransactionData } from '../../shared/types/transactions'
import type { CustomerSearchResult } from '../../shared/types/customers'
import '../../../styles/snowui-pos.css'

interface CartItem {
  product: Product
  quantity: number
  lineTotal: number
}

const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'All Products', icon: '📦' },
  { id: 'tobacco', label: 'Tobacco', icon: '🚬' },
  { id: 'vape', label: 'Vape', icon: '💨' },
  { id: 'accessories', label: 'Accessories', icon: '🔧' },
  { id: 'snacks', label: 'Snacks', icon: '🍿' },
  { id: 'drinks', label: 'Drinks', icon: '🥤' },
]

export function POSImproved() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchCode, setSearchCode] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [cashTendered, setCashTendered] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const { user } = useAuth()
  const createTransactionMutation = useCreateTransaction()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F2 for checkout
      if (e.key === 'F2' && cart.length > 0) {
        setShowPaymentModal(true)
      }
      // ESC to close modals
      if (e.key === 'Escape') {
        setShowPaymentModal(false)
        setShowCheckout(false)
      }
      // F3 to clear cart
      if (e.key === 'F3') {
        if (confirm('Clear the entire cart?')) {
          setCart([])
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart.length])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id)

      if (existingItem) {
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

  const getTaxAmount = () => {
    return getCartTotal() * 0.08 // 8% tax rate
  }

  const getFinalTotal = () => {
    return getCartTotal() + getTaxAmount()
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
        ageVerificationCompleted: hasAgeRestrictedItems() ? true : undefined,
        storeId: user?.storeId || undefined
      }

      const transaction = await createTransactionMutation.mutateAsync(transactionData)

      // Success!
      setCart([])
      setShowPaymentModal(false)
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
    return cash >= getFinalTotal()
  }

  const getChangeAmount = () => {
    if (paymentMethod !== 'CASH') return 0
    const cash = parseFloat(cashTendered) || 0
    return Math.max(0, cash - getFinalTotal())
  }

  return (
    <ProtectedRoute requiredPermission="transaction:create">
      <div className="pos-container">
        {/* Left Side - Product Selection */}
        <div className="pos-products">
          {/* Header */}
          <div className="pos-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--snow-gray-900)' }}>
                  JustSell POS
                </h1>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--snow-gray-600)' }}>
                  {user?.firstName} {user?.lastName} • {new Date().toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '8px 16px', fontSize: 'var(--text-sm)' }}>
                  Reports
                </button>
                <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '8px 16px', fontSize: 'var(--text-sm)' }}>
                  Settings
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="pos-search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Scan barcode or search product..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  // TODO: Implement product search
                  console.log('Search for:', searchCode)
                }
              }}
            />
            <button className="btn btn-primary" style={{ minHeight: '44px' }}>
              <span style={{ fontSize: '20px', marginRight: '8px' }}>📷</span>
              Scan
            </button>
          </div>

          {/* Categories */}
          <div className="pos-categories">
            {PRODUCT_CATEGORIES.map(category => (
              <button
                key={category.id}
                className={`category-pill ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span style={{ marginRight: '4px' }}>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="pos-product-grid">
            {/* Mock products - replace with actual product list */}
            {[
              { id: '1', name: 'Marlboro Gold', price: 8.99, icon: '🚬', category: 'tobacco', ageRestricted: true },
              { id: '2', name: 'Juul Pods', price: 15.99, icon: '💨', category: 'vape', ageRestricted: true },
              { id: '3', name: 'Lighter', price: 2.99, icon: '🔥', category: 'accessories' },
              { id: '4', name: 'Energy Drink', price: 3.49, icon: '🥤', category: 'drinks' },
              { id: '5', name: 'Chips', price: 2.99, icon: '🍿', category: 'snacks' },
              { id: '6', name: 'Disposable Vape', price: 24.99, icon: '💨', category: 'vape', ageRestricted: true },
            ]
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            .map(product => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => addToCart(product as any)}
              >
                <div className="product-card-image">
                  {product.icon}
                </div>
                <div className="product-card-body">
                  <div className="product-card-name">{product.name}</div>
                  {product.ageRestricted && (
                    <span className="age-restricted-badge">21+</span>
                  )}
                  <div className="product-card-price">{formatPrice(product.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Cart */}
        <div className="pos-cart">
          {/* Cart Header */}
          <div className="pos-cart-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Shopping Cart</span>
              <span style={{ fontSize: 'var(--text-sm)', opacity: 0.9 }}>
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="pos-cart-customer">
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--snow-gray-700)',
              marginBottom: 'var(--space-2)'
            }}>
              Customer
            </label>
            <CustomerSearch
              onSelectCustomer={setSelectedCustomer}
              onClearCustomer={() => setSelectedCustomer(null)}
              selectedCustomer={selectedCustomer}
              placeholder="Search customer or walk-in..."
              className="w-full"
            />
            {selectedCustomer && (
              <div style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-2)',
                background: 'var(--snow-success-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--snow-success)'
              }}>
                💎 {selectedCustomer.loyaltyTier} Member • {selectedCustomer.loyaltyPoints} pts
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <div className="empty-cart-text">Cart is empty</div>
                <div className="empty-cart-subtext">Add products to get started</div>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.product.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.product.name}</div>
                      <div className="cart-item-price">
                        {formatPrice(parseFloat(item.product.price.toString()))} each
                      </div>
                      {item.product.ageRestricted && (
                        <span className="age-restricted-badge">21+</span>
                      )}
                    </div>
                    <div className="cart-item-quantity">
                      <button
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-total">
                      {formatPrice(item.lineTotal)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="pos-cart-footer">
              <div className="cart-totals">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(getCartTotal())}</span>
                </div>
                <div className="total-row">
                  <span>Tax (8%)</span>
                  <span>{formatPrice(getTaxAmount())}</span>
                </div>
                {selectedCustomer && (
                  <div className="total-row" style={{ color: 'var(--snow-success)' }}>
                    <span>Points Earned</span>
                    <span>+{Math.floor(getFinalTotal())}</span>
                  </div>
                )}
                <div className="total-row total">
                  <span>Total</span>
                  <span>{formatPrice(getFinalTotal())}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCart([])}
                  style={{ flex: 1 }}
                >
                  Clear (F3)
                </button>
                <button
                  className="btn btn-success btn-lg"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={isProcessing}
                  style={{ flex: 2 }}
                >
                  {isProcessing ? 'Processing...' : `Pay ${formatPrice(getFinalTotal())} (F2)`}
                </button>
              </div>

              {hasAgeRestrictedItems() && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--snow-error-light)',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-sm)'
                }}>
                  <strong style={{ color: 'var(--snow-error)' }}>⚠️ Age Verification Required</strong>
                  <p style={{ color: 'var(--snow-gray-700)', marginTop: '4px' }}>
                    Customer must be 21+ with valid ID
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: '480px' }}>
            <h2 style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 600,
              marginBottom: 'var(--space-6)',
              color: 'var(--snow-gray-900)'
            }}>
              Complete Payment
            </h2>

            {/* Payment Method Grid */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--snow-gray-700)',
                marginBottom: 'var(--space-3)'
              }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <button
                  className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPaymentMethod('CASH')}
                  style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                >
                  <span style={{ fontSize: '24px' }}>💵</span>
                  <span>Cash</span>
                </button>
                <button
                  className={`btn ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPaymentMethod('CARD')}
                  style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                >
                  <span style={{ fontSize: '24px' }}>💳</span>
                  <span>Card</span>
                </button>
                <button
                  className={`btn ${paymentMethod === 'GIFT_CARD' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPaymentMethod('GIFT_CARD')}
                  style={{ minHeight: '60px', flexDirection: 'column', gap: '4px' }}
                >
                  <span style={{ fontSize: '24px' }}>🎁</span>
                  <span>Gift Card</span>
                </button>
              </div>
            </div>

            {/* Cash Payment */}
            {paymentMethod === 'CASH' && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: 'var(--snow-gray-700)',
                  marginBottom: 'var(--space-2)'
                }}>
                  Cash Received
                </label>
                <input
                  type="number"
                  className="search-input"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={formatPrice(getFinalTotal())}
                  style={{ width: '100%', fontSize: 'var(--text-xl)', fontWeight: 600 }}
                />

                {/* Quick cash buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-3)'
                }}>
                  {[20, 50, 100, 'Exact'].map(amount => (
                    <button
                      key={amount}
                      className="btn btn-secondary"
                      style={{ minHeight: '40px', padding: '8px' }}
                      onClick={() => {
                        if (amount === 'Exact') {
                          setCashTendered(getFinalTotal().toFixed(2))
                        } else {
                          setCashTendered(amount.toString())
                        }
                      }}
                    >
                      {amount === 'Exact' ? 'Exact' : `$${amount}`}
                    </button>
                  ))}
                </div>

                {/* Change display */}
                {cashTendered && validateCashPayment() && (
                  <div style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'var(--snow-success-light)',
                    borderRadius: 'var(--radius)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--snow-gray-600)' }}>
                      Change Due
                    </div>
                    <div style={{
                      fontSize: 'var(--text-3xl)',
                      fontWeight: 700,
                      color: 'var(--snow-success)',
                      marginTop: 'var(--space-1)'
                    }}>
                      {formatPrice(getChangeAmount())}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Summary */}
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--snow-gray-50)',
              borderRadius: 'var(--radius)',
              marginBottom: 'var(--space-6)'
            }}>
              <div className="total-row total">
                <span>Total Due</span>
                <span>{formatPrice(getFinalTotal())}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
                style={{ flex: 1 }}
              >
                Cancel (ESC)
              </button>
              <button
                className="btn btn-success btn-lg"
                onClick={handleCheckout}
                disabled={isProcessing || !validateCashPayment()}
                style={{ flex: 2 }}
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}