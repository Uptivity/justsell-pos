# Data-TestID Conventions - JustSell POS System

## 🧪 Testing Strategy Overview
**Mandatory Requirement:** ALL interactive elements MUST have data-testid attributes  
**Testing Framework:** Playwright for E2E testing  
**Naming Convention:** Kebab-case with hierarchical structure  
**Purpose:** Enable reliable automated testing of financial POS operations

---

## 📝 Naming Convention Rules

### 1. Basic Structure
```
data-testid="{screen}-{component}-{action/element}"
```

**Examples:**
- `sales-product-search` (Sales screen, product search input)
- `admin-customer-add-button` (Admin screen, customer add button)
- `payment-terminal-connect` (Payment screen, terminal connect button)

### 2. Dynamic Elements (with IDs)
```
data-testid="{screen}-{component}-{id}"
```

**Examples:**
- `sales-product-card-uuid123` (Product card with specific ID)
- `admin-user-row-uuid456` (User table row with specific ID)
- `cart-item-remove-uuid789` (Remove button for specific cart item)

### 3. Indexed Elements (lists/arrays)
```
data-testid="{screen}-{component}-{index}"
```

**Examples:**
- `sales-cart-item-0` (First item in shopping cart)
- `reports-chart-data-point-5` (Sixth data point in chart)
- `payment-split-method-2` (Third split payment method)

---

## 🏪 POS Application TestIDs

### Sales Screen (`/pos/sales`)
```typescript
// Product Search & Selection
"sales-product-search"              // Main product search input
"sales-barcode-scan-button"         // Barcode scanner trigger
"sales-product-search-clear"        // Clear search button
"sales-product-suggestions"         // Search suggestions dropdown

// Category Filters
"sales-category-all"                // All categories filter
"sales-category-devices"            // Vape devices category
"sales-category-liquids"            // E-liquids category
"sales-category-accessories"        // Accessories category
"sales-category-{category-slug}"    // Dynamic category filters

// Product Grid & Cards
"sales-product-grid"                // Product grid container
"sales-product-card-{productId}"    // Individual product card
"sales-product-image-{productId}"   // Product image
"sales-product-name-{productId}"    // Product name
"sales-product-price-{productId}"   // Product price
"sales-add-to-cart-{productId}"     // Add to cart button
"sales-product-details-{productId}" // View details button

// Customer Section
"sales-customer-search"             // Customer search input
"sales-customer-info"               // Customer info display
"sales-customer-name"               // Customer name display
"sales-customer-phone"              // Customer phone display
"sales-customer-loyalty-points"     // Loyalty points display
"sales-new-customer-button"         // Create new customer
"sales-customer-clear"              // Clear customer selection

// Shopping Cart
"sales-cart"                        // Cart container
"sales-cart-empty-state"            // Empty cart message
"sales-cart-item-{index}"           // Cart item row
"sales-cart-item-name-{index}"      // Item name in cart
"sales-cart-item-quantity-{index}"  // Quantity input
"sales-cart-item-price-{index}"     // Item price
"sales-cart-remove-item-{index}"    // Remove item button
"sales-cart-item-total-{index}"     // Item total price

// Cart Totals
"sales-subtotal-amount"             // Subtotal display
"sales-discount-amount"             // Discount display
"sales-tax-amount"                  // Tax amount display
"sales-tax-breakdown"               // Detailed tax breakdown
"sales-total-amount"                // Final total display

// Action Buttons
"sales-age-verify-button"           // Age verification button
"sales-apply-discount-button"       // Apply discount button
"sales-payment-button"              // Proceed to payment
"sales-clear-cart-button"           // Clear entire cart
"sales-save-cart-button"            // Save cart for later
"sales-settings-menu"               // Settings menu trigger
"sales-logout-button"               // Logout button

// Age Verification Modal
"age-verify-modal"                  // Modal container
"age-verify-customer-appears-under-30" // Under 30 checkbox
"age-verify-id-required"            // ID required indicator
"age-verify-scan-id-button"         // Scan ID button
"age-verify-manual-entry-button"    // Manual entry button
"age-verify-birth-date-input"       // Birth date input
"age-verify-id-type-select"         // ID type dropdown
"age-verify-scanner-result"         // Scanner result display
"age-verify-approve-sale"           // Approve sale button
"age-verify-deny-sale"              // Deny sale button
"age-verify-manager-override"       // Manager override option
"age-verify-close-modal"            // Close modal button

// Discount Modal
"discount-modal"                    // Discount modal container
"discount-type-percentage"          // Percentage discount radio
"discount-type-fixed"               // Fixed amount discount radio
"discount-value-input"              // Discount value input
"discount-apply-button"             // Apply discount button
"discount-cancel-button"            // Cancel discount button
```

### Payment Screen (`/pos/payment`)
```typescript
// Payment Methods
"payment-method-cash"               // Cash payment option
"payment-method-card"               // Card payment option
"payment-method-gift-card"          // Gift card option
"payment-method-split"              // Split payment option

// Terminal Integration
"payment-terminal-status"           // Terminal connection status
"payment-terminal-connect"          // Connect terminal button
"payment-terminal-disconnect"       // Disconnect terminal
"payment-terminal-switch"           // Switch to backup terminal
"payment-terminal-retry"            // Retry connection

// Cash Payment
"payment-cash-amount-input"         // Cash amount input
"payment-cash-tendered"             // Cash tendered display
"payment-cash-change"               // Change amount display
"payment-cash-quick-amount-{amount}" // Quick cash buttons ($20, $50, etc.)

// Card Payment
"payment-card-terminal-prompt"      // Terminal instruction display
"payment-card-processing"           // Processing indicator
"payment-card-approval-code"        // Approval code display
"payment-card-last-four"            // Last 4 digits display

// Split Payment
"payment-split-container"           // Split payment container
"payment-split-method-{index}"      // Split payment method
"payment-split-amount-{index}"      // Split payment amount
"payment-split-add-button"          // Add split payment
"payment-split-remove-{index}"      // Remove split payment

// Action Buttons
"payment-back-to-cart"              // Back to cart button
"payment-complete-transaction"      // Complete transaction
"payment-cancel-transaction"        // Cancel transaction
"payment-print-receipt"             // Print receipt option
"payment-email-receipt"             // Email receipt option
"payment-sms-receipt"               // SMS receipt option
```

### Receipt Screen (`/pos/receipt`)
```typescript
"receipt-container"                 // Receipt display container
"receipt-header"                    // Store info header
"receipt-transaction-number"        // Transaction number
"receipt-date-time"                 // Transaction date/time
"receipt-cashier-name"              // Cashier name
"receipt-items-list"                // Items list
"receipt-item-{index}"              // Individual receipt item
"receipt-totals-section"            // Totals section
"receipt-subtotal"                  // Subtotal amount
"receipt-tax"                       // Tax amount
"receipt-total"                     // Total amount
"receipt-payment-method"            // Payment method used
"receipt-print-button"              // Print receipt
"receipt-email-button"              // Email receipt
"receipt-sms-button"                // SMS receipt
"receipt-new-transaction"           // Start new transaction
"receipt-return-exchange"           // Return/exchange option
```

---

## 🏢 Admin Application TestIDs

### Dashboard (`/admin/dashboard`)
```typescript
// Header & Navigation
"admin-header"                      // Admin header
"admin-nav-dashboard"               // Dashboard nav link
"admin-nav-products"                // Products nav link
"admin-nav-customers"               // Customers nav link
"admin-nav-reports"                 // Reports nav link
"admin-nav-settings"                // Settings nav link
"admin-user-menu"                   // User menu dropdown
"admin-logout"                      // Logout button

// Metrics Cards
"dashboard-revenue-today"           // Today's revenue
"dashboard-revenue-change"          // Revenue change %
"dashboard-transactions-today"      // Today's transactions
"dashboard-transactions-change"     // Transaction change %
"dashboard-customers-today"         // Today's customers
"dashboard-customers-change"        // Customer change %
"dashboard-avg-ticket"              // Average ticket size
"dashboard-loyalty-rate"            // Loyalty enrollment rate
"dashboard-age-denials"             // Age verification denials

// Charts & Graphs
"dashboard-sales-chart"             // Main sales chart
"dashboard-category-chart"          // Category performance
"dashboard-hourly-chart"            // Hourly sales pattern

// Alerts & Notifications
"dashboard-alerts-container"        // Alerts section
"dashboard-low-stock-alert"         // Low stock alert
"dashboard-expiring-products-alert" // Expiring products alert
"dashboard-compliance-alert"        // Compliance alert
"dashboard-alert-dismiss-{id}"      // Dismiss alert button

// Quick Actions
"dashboard-action-inventory"        // Manage inventory
"dashboard-action-customers"        // View customers
"dashboard-action-reports"          // View reports
"dashboard-action-settings"         // System settings
```

### Product Management (`/admin/products`)
```typescript
// Header Actions
"products-add-button"               // Add new product
"products-import-csv"               // Import CSV
"products-export-csv"               // Export CSV
"products-bulk-actions"             // Bulk actions dropdown

// Search & Filters
"products-search-input"             // Product search
"products-search-clear"             // Clear search
"products-filter-category"          // Category filter
"products-filter-vendor"            // Vendor filter
"products-filter-status"            // Status filter
"products-filter-low-stock"         // Low stock filter
"products-filter-expiring"          // Expiring products filter
"products-filter-compliance"        // Compliance issues filter
"products-filter-clear-all"         // Clear all filters

// Product Table
"products-table"                    // Main products table
"products-table-header"             // Table header
"products-table-sort-{column}"      // Column sort buttons
"products-row-{productId}"          // Product table row
"products-image-{productId}"        // Product image
"products-name-{productId}"         // Product name
"products-sku-{productId}"          // Product SKU
"products-price-{productId}"        // Product price
"products-stock-{productId}"        // Stock quantity
"products-status-{productId}"       // Product status
"products-actions-{productId}"      // Actions dropdown
"products-edit-{productId}"         // Edit product
"products-duplicate-{productId}"    // Duplicate product
"products-delete-{productId}"       // Delete product

// Product Modal (Add/Edit)
"product-modal"                     // Product modal container
"product-modal-title"               // Modal title
"product-form"                      // Product form
"product-name-input"                // Product name input
"product-sku-input"                 // SKU input
"product-price-input"               // Price input
"product-cost-input"                // Cost input
"product-category-select"           // Category dropdown
"product-vendor-input"              // Vendor input
"product-description-textarea"      // Description textarea
"product-image-upload"              // Image upload
"product-flavor-select"             // Flavor profile select
"product-volume-input"              // Volume input
"product-cartridges-input"          // Cartridges input
"product-age-restricted-checkbox"   // Age restricted checkbox
"product-synthetic-nicotine-checkbox" // Synthetic nicotine checkbox
"product-stock-input"               // Stock quantity input
"product-min-stock-input"           // Minimum stock input
"product-expiration-date"           // Expiration date picker
"product-save-button"               // Save product button
"product-cancel-button"             // Cancel button
"product-modal-close"               // Close modal button
```

### Customer Management (`/admin/customers`)
```typescript
// Customer Actions
"customers-add-button"              // Add new customer
"customers-import-csv"              // Import customers
"customers-export-csv"              // Export customers

// Search & Filters
"customers-search-input"            // Customer search
"customers-filter-state"            // State filter
"customers-filter-loyalty-tier"     // Loyalty tier filter
"customers-filter-last-purchase"    // Last purchase filter

// Customer Table
"customers-table"                   // Customers table
"customers-row-{customerId}"        // Customer table row
"customers-name-{customerId}"       // Customer name
"customers-email-{customerId}"      // Customer email
"customers-phone-{customerId}"      // Customer phone
"customers-loyalty-{customerId}"    // Loyalty points
"customers-last-purchase-{customerId}" // Last purchase date
"customers-actions-{customerId}"    // Actions dropdown
"customers-edit-{customerId}"       // Edit customer
"customers-view-history-{customerId}" // View purchase history
"customers-send-offer-{customerId}" // Send personalized offer

// Customer Modal
"customer-modal"                    // Customer modal
"customer-first-name-input"         // First name input
"customer-last-name-input"          // Last name input
"customer-email-input"              // Email input
"customer-phone-input"              // Phone input
"customer-birth-date-input"         // Birth date input
"customer-address-inputs"           // Address section
"customer-marketing-opt-in"         // Marketing opt-in checkbox
"customer-save-button"              // Save customer button
"customer-cancel-button"            // Cancel button
```

---

## 🧪 Testing Patterns & Best Practices

### 1. Component Testing Pattern
```typescript
// Good: Specific and descriptive
<button data-testid="sales-add-to-cart-product-123">
  Add to Cart
</button>

// Bad: Generic and not useful
<button data-testid="button">
  Add to Cart
</button>
```

### 2. Dynamic ID Pattern
```typescript
// For product cards with dynamic IDs
const ProductCard = ({ product }) => (
  <div data-testid={`sales-product-card-${product.id}`}>
    <img data-testid={`sales-product-image-${product.id}`} />
    <h3 data-testid={`sales-product-name-${product.id}`}>{product.name}</h3>
    <button data-testid={`sales-add-to-cart-${product.id}`}>
      Add to Cart
    </button>
  </div>
);
```

### 3. State-Based TestIDs
```typescript
// Include state information when relevant
<button 
  data-testid={`payment-terminal-${isConnected ? 'connected' : 'disconnected'}`}
  disabled={!isConnected}
>
  {isConnected ? 'Process Payment' : 'Connect Terminal'}
</button>
```

### 4. Modal and Overlay Pattern
```typescript
// Always include container and close button
<div data-testid="age-verify-modal" role="dialog">
  <button data-testid="age-verify-modal-close" aria-label="Close">×</button>
  <div data-testid="age-verify-modal-content">
    {/* Modal content */}
  </div>
</div>
```

---

## 🔍 Playwright Test Selectors

### Common Selector Patterns
```typescript
// Page Object Model example
class SalesPage {
  constructor(page) {
    this.page = page;
    
    // Product search
    this.productSearch = page.locator('[data-testid="sales-product-search"]');
    this.productGrid = page.locator('[data-testid="sales-product-grid"]');
    
    // Cart
    this.cartTotal = page.locator('[data-testid="sales-total-amount"]');
    this.paymentButton = page.locator('[data-testid="sales-payment-button"]');
    
    // Age verification
    this.ageVerifyModal = page.locator('[data-testid="age-verify-modal"]');
    this.approveSaleButton = page.locator('[data-testid="age-verify-approve-sale"]');
  }
  
  async addProductToCart(productId) {
    await this.page.locator(`[data-testid="sales-add-to-cart-${productId}"]`).click();
  }
  
  async getCartItemQuantity(index) {
    return await this.page.locator(`[data-testid="sales-cart-item-quantity-${index}"]`).inputValue();
  }
}
```

### Test Implementation Examples
```typescript
test('Complete sale with age verification', async ({ page }) => {
  const salesPage = new SalesPage(page);
  
  // Add age-restricted product
  await salesPage.addProductToCart('age-restricted-product-123');
  
  // Proceed to payment
  await salesPage.paymentButton.click();
  
  // Age verification should appear
  await expect(salesPage.ageVerifyModal).toBeVisible();
  
  // Approve sale
  await salesPage.approveSaleButton.click();
  
  // Verify age verification modal closes
  await expect(salesPage.ageVerifyModal).not.toBeVisible();
});
```

---

## ✅ TestID Validation Rules

### Mandatory Requirements
1. **ALL interactive elements** must have data-testid
2. **ALL form inputs** must have data-testid
3. **ALL navigation elements** must have data-testid
4. **ALL modals and overlays** must have data-testid
5. **ALL dynamic content** must have predictable data-testid

### Validation Checklist
```typescript
// Automated validation in development
const validateTestIds = () => {
  const interactiveElements = document.querySelectorAll(
    'button, input, select, textarea, a[href], [onclick], [role="button"]'
  );
  
  const missingTestIds = Array.from(interactiveElements)
    .filter(el => !el.getAttribute('data-testid'))
    .map(el => ({
      tag: el.tagName,
      classes: el.className,
      text: el.textContent?.slice(0, 50)
    }));
  
  if (missingTestIds.length > 0) {
    console.error('Elements missing data-testid:', missingTestIds);
  }
};
```

### Code Review Requirements
- [ ] All new interactive elements have data-testid
- [ ] TestIDs follow naming convention
- [ ] Dynamic TestIDs use consistent patterns
- [ ] No duplicate TestIDs on same page
- [ ] TestIDs are descriptive and meaningful

This comprehensive TestID specification ensures that all UI elements can be reliably tested, supporting the critical testing requirements of a financial POS system.