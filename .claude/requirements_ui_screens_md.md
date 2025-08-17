# UI Screen Specifications - JustSell POS System

## 🎯 Design Philosophy
**Clover Compatibility:** Maintain familiar workflow patterns for easy transition  
**Modern Enhancement:** Improve visual design while preserving usability  
**Accessibility First:** WCAG 2.1 AA compliance throughout  
**Speed Optimized:** Designed for high-volume retail environments

---

## 🏪 POS Application Screens

### 1. Sales Screen (Primary Transaction Interface)
**Route:** `/pos/sales`  
**Priority:** CRITICAL - This is the most-used screen  
**Permissions:** CASHIER, MANAGER, ADMIN

**Description:** Main point-of-sale interface for processing customer transactions. Must be lightning-fast and intuitive for retail cashiers.

**Layout Pattern (Clover-inspired):**
```
┌──────────────────────────────┬──────────────────────────┐
│        PRODUCT AREA          │      TRANSACTION CART    │
│  ┌─────────────────────────┐ │  ┌────────────────────┐  │
│  │    Search Products      │ │  │   Customer Info    │  │
│  │  [🔍 Search or Scan]    │ │  │   John Smith       │  │
│  └─────────────────────────┘ │  │   📞 555-1234      │  │
│                              │  └────────────────────┘  │
│  ┌─────────────────────────┐ │                          │
│  │   Category Filters      │ │  ┌────────────────────┐  │
│  │  [Devices] [E-Liquids]  │ │  │    Order Items     │  │
│  │  [Accessories] [All]    │ │  │                    │  │
│  └─────────────────────────┘ │  │  • Vape Kit x1     │  │
│                              │  │    $29.99          │  │
│  ┌─────────────────────────┐ │  │  • E-Liquid x2     │  │
│  │     Product Grid        │ │  │    $15.98          │  │
│  │                         │ │  │                    │  │
│  │  [Product Card]         │ │  │  ───────────────   │  │
│  │  [Product Card]         │ │  │  Subtotal: $45.97 │  │
│  │  [Product Card]         │ │  │  Tax: $3.68        │  │
│  │  [Product Card]         │ │  │  Total: $49.65     │  │
│  └─────────────────────────┘ │  └────────────────────┘  │
└──────────────────────────────┴──────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│                    ACTION BUTTONS                        │
│  [Age Verify] [Discount] [💳 Payment] [🗑️ Clear] [⚙️]    │
└──────────────────────────────────────────────────────────┘
```

**Key Components & Data-TestIDs:**

*Search & Product Selection:*
- Product Search Input: `data-testid="sales-product-search"`
- Barcode Scanner Button: `data-testid="sales-barcode-scan"`
- Category Filter Buttons: `data-testid="sales-category-{category}"`
- Product Grid Container: `data-testid="sales-product-grid"`
- Product Card: `data-testid="sales-product-card-{productId}"`
- Add to Cart Button: `data-testid="sales-add-to-cart-{productId}"`

*Customer Section:*
- Customer Search: `data-testid="sales-customer-search"`
- Customer Info Display: `data-testid="sales-customer-info"`
- New Customer Button: `data-testid="sales-new-customer"`

*Transaction Cart:*
- Cart Container: `data-testid="sales-cart"`
- Cart Item: `data-testid="sales-cart-item-{index}"`
- Item Quantity Input: `data-testid="sales-item-quantity-{index}"`
- Remove Item Button: `data-testid="sales-remove-item-{index}"`
- Subtotal Display: `data-testid="sales-subtotal"`
- Tax Display: `data-testid="sales-tax"`
- Total Display: `data-testid="sales-total"`

*Action Buttons:*
- Age Verification Button: `data-testid="sales-age-verify"`
- Apply Discount Button: `data-testid="sales-apply-discount"`
- Payment Button: `data-testid="sales-payment"`
- Clear Cart Button: `data-testid="sales-clear-cart"`
- Settings Menu: `data-testid="sales-settings-menu"`

**Critical Features:**
1. **Instant Product Search:** As-you-type search with barcode scanning
2. **Age Verification Modal:** Triggered automatically for restricted items
3. **Real-time Tax Calculation:** Updates automatically based on location and products
4. **Quick Payment Processing:** Single-click payment for common amounts
5. **Error Handling:** Clear error messages with recovery suggestions

**Age Verification Modal (Compliance Critical):**
```
┌─────────────────────────────────────────┐
│              AGE VERIFICATION            │
│                                         │
│  ⚠️  This transaction contains age-      │
│     restricted items                    │
│                                         │
│  Customer appears under 30?             │
│  [ ] Yes - ID Required                  │
│  [ ] No - Visual verification OK        │
│                                         │
│  [📷 Scan ID] [✋ Manual Entry]          │
│                                         │
│  ID Scanner Result:                     │
│  ✅ APPROVED - Customer is 25 years old │
│                                         │
│  [🚫 Deny Sale] [✅ Complete Sale]      │
└─────────────────────────────────────────┘
```

**Performance Requirements:**
- Page load: <1 second
- Product search results: <200ms
- Add to cart: <100ms
- Payment processing: <3 seconds

---

### 2. Payment Processing Screen
**Route:** `/pos/payment`  
**Priority:** CRITICAL - Financial transactions  
**Permissions:** CASHIER, MANAGER, ADMIN

**Description:** Secure payment processing interface with multiple payment method support.

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│                    PAYMENT PROCESSING                  │
│                                                        │
│  Order Total: $49.65                                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │           PAYMENT METHODS                        │ │
│  │                                                  │ │
│  │  [💳 Credit/Debit]  [💵 Cash]  [🎁 Gift Card]   │ │
│  │                                                  │ │
│  │  Selected: Credit/Debit Card                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │           TERMINAL STATUS                        │ │
│  │                                                  │ │
│  │  🟢 Square Terminal Connected                    │ │
│  │  💳 Insert, Tap, or Swipe Card                  │ │
│  │                                                  │ │
│  │  [⚙️ Switch Terminal] [🔄 Retry Connection]      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │               SPLIT PAYMENT                      │ │
│  │                                                  │ │
│  │  $25.00 Card  [✅ Completed]                     │ │
│  │  $24.65 Cash  [⏳ Pending]                       │ │
│  │                                                  │ │
│  │  [+ Add Split Payment]                           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [⬅️ Back to Cart] [✅ Complete Transaction]          │
└────────────────────────────────────────────────────────┘
```

**Key Components & Data-TestIDs:**
- Payment Method Buttons: `data-testid="payment-method-{method}"`
- Terminal Status: `data-testid="payment-terminal-status"`
- Terminal Connection Button: `data-testid="payment-connect-terminal"`
- Split Payment Container: `data-testid="payment-split-container"`
- Complete Transaction Button: `data-testid="payment-complete"`
- Back Button: `data-testid="payment-back"`

---

### 3. Receipt Screen
**Route:** `/pos/receipt`  
**Priority:** HIGH - Transaction completion  

**Description:** Receipt display and printing interface with email/SMS options.

**Features:**
- Print receipt to thermal printer
- Email receipt to customer
- SMS receipt option
- Reprint previous receipts
- Return/exchange initiation

---

## 🏢 Admin Application Screens

### 1. Dashboard Overview
**Route:** `/admin/dashboard`  
**Priority:** HIGH - Main admin landing page  
**Permissions:** MANAGER, ADMIN

**Description:** Executive dashboard with key business metrics and real-time store performance.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                        │
│  Welcome back, Sarah! | Store: Downtown Seattle             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    TODAY'S METRICS                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   Revenue    │ │ Transactions │ │   Customers  │       │
│  │   $2,847     │ │      76      │ │      68      │       │
│  │   +12% ↗️    │ │   +8% ↗️     │ │   +5% ↗️     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Avg Ticket   │ │   Loyalty    │ │   Age Denials│       │
│  │   $37.46     │ │   Rate: 64%  │ │       3      │       │
│  │   +2% ↗️     │ │   +3% ↗️     │ │   Same ➡️    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   SALES CHART (7 DAYS)                     │
│   $3k ┤                                                    │
│       │     ●                                              │
│   $2k ┤   ●   ●     ●                                      │
│       │ ●       ● ●   ●                                    │
│   $1k ┤●             ● ●                                   │
│       └─────────────────────────────────────────────────   │
│        Mon Tue Wed Thu Fri Sat Sun                         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│              QUICK ACTIONS & ALERTS                        │
│                                                             │
│  🚨 Low Stock: 5 items need reordering                     │
│  ⚠️  2 products expiring within 30 days                    │
│  ✅ Compliance: All rules up to date                       │
│                                                             │
│  [📦 Manage Inventory] [👥 View Customers] [📊 Reports]   │
└─────────────────────────────────────────────────────────────┘
```

**Key Components & Data-TestIDs:**
- Revenue Metric: `data-testid="dashboard-revenue"`
- Transaction Count: `data-testid="dashboard-transactions"`
- Customer Count: `data-testid="dashboard-customers"`
- Sales Chart: `data-testid="dashboard-sales-chart"`
- Low Stock Alert: `data-testid="dashboard-low-stock-alert"`
- Quick Action Buttons: `data-testid="dashboard-action-{action}"`

---

### 2. Product Management Screen
**Route:** `/admin/products`  
**Priority:** HIGH - Core inventory management  
**Permissions:** MANAGER, ADMIN

**Description:** Comprehensive product catalog management with compliance features.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT MANAGEMENT                       │
│                                                             │
│  [+ Add Product] [📤 Import CSV] [📥 Export] [🔍 Search]   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  FILTERS: [All Categories ▼] [All Vendors ▼] [Active Only] │
│           [Low Stock] [Expiring Soon] [Compliance Issues]   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT TABLE                            │
│ ┌─────┬────────────┬─────────┬─────────┬─────────┬──────┐   │
│ │Image│ Name/SKU   │ Price   │ Stock   │ Status  │Action│   │
│ ├─────┼────────────┼─────────┼─────────┼─────────┼──────┤   │
│ │[📷] │Vape Kit Pro│ $49.99  │   47    │ ✅Active│ [⚙️] │   │
│ │     │SKU: VK-001 │         │         │         │      │   │
│ ├─────┼────────────┼─────────┼─────────┼─────────┼──────┤   │
│ │[📷] │E-Liquid    │ $12.99  │ ⚠️ 5    │ ✅Active│ [⚙️] │   │
│ │     │SKU: EL-042 │         │         │         │      │   │
│ ├─────┼────────────┼─────────┼─────────┼─────────┼──────┤   │
│ │[📷] │Mint Pod    │ $8.99   │   0     │🚫Banned │ [⚙️] │   │
│ │     │SKU: MP-015 │         │         │(CA only)│      │   │
│ └─────┴────────────┴─────────┴─────────┴─────────┴──────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Product Detail Modal (Edit/Add):**
```
┌─────────────────────────────────────────────────────┐
│                 EDIT PRODUCT                        │
│                                                     │
│  Basic Information:                                 │
│  Name: [Vape Kit Pro                    ]          │
│  SKU:  [VK-001                          ]          │
│  Price: [$49.99] Cost: [$28.50]                   │
│                                                     │
│  Compliance Information:                            │
│  Category: [Vape Device     ▼]                     │
│  Flavor: [Tobacco          ▼]                      │
│  Volume: [2.0] mL  Cartridges: [1]                │
│  ☑️ Age Restricted  ☐ Synthetic Nicotine          │
│                                                     │
│  Inventory:                                         │
│  Current Stock: [47]                               │
│  Min Stock Level: [10]                             │
│  Expiration Date: [2025-12-31]                     │
│                                                     │
│  [Cancel] [Save Product]                           │
└─────────────────────────────────────────────────────┘
```

**Key Components & Data-TestIDs:**
- Add Product Button: `data-testid="products-add-button"`
- Product Search: `data-testid="products-search"`
- Product Table: `data-testid="products-table"`
- Product Row: `data-testid="products-row-{productId}"`
- Edit Button: `data-testid="products-edit-{productId}"`
- Filter Dropdowns: `data-testid="products-filter-{filterType}"`

---

### 3. Customer Management Screen
**Route:** `/admin/customers`  
**Priority:** MEDIUM - Customer service and loyalty  
**Permissions:** MANAGER, ADMIN

**Description:** Customer database with purchase history and loyalty management.

**Key Features:**
- Customer search and filtering
- Purchase history analysis
- Loyalty points management
- Marketing communication preferences
- Age verification history

---

### 4. Reports & Analytics Screen
**Route:** `/admin/reports`  
**Priority:** HIGH - Business intelligence  
**Permissions:** MANAGER, ADMIN

**Description:** Comprehensive reporting dashboard with compliance reports.

**Report Categories:**
- Sales Reports (daily, weekly, monthly)
- Inventory Reports (stock levels, turnover, waste)
- Customer Reports (loyalty, demographics, behavior)
- Compliance Reports (age verification logs, PACT Act, tax reports)
- Employee Reports (performance, transaction logs)

---

### 5. Settings & Configuration Screen
**Route:** `/admin/settings`  
**Priority:** HIGH - System configuration  
**Permissions:** ADMIN

**Description:** System-wide configuration including compliance rules and integrations.

**Settings Categories:**
- Store Information
- Payment Terminal Configuration
- Compliance Rule Management
- User Management & Permissions
- Tax Configuration
- Loyalty Program Settings
- Integration Settings (email, SMS, etc.)

---

## 📱 Responsive Design Requirements

### Mobile/Tablet Adaptations
- **POS on Tablet:** Optimized for 10-12" tablets in landscape
- **Admin on Mobile:** Responsive design for 6"+ phones
- **Touch Targets:** Minimum 44px for reliable finger interaction
- **Gesture Support:** Swipe for navigation, pinch for zoom

### Accessibility Requirements
- **WCAG 2.1 AA Compliance:** All screens meet accessibility standards
- **Screen Reader Support:** Proper semantic HTML and ARIA labels
- **Keyboard Navigation:** Complete functionality without mouse
- **Color Contrast:** 4.5:1 minimum ratio for all text
- **Focus Indicators:** Clear visual focus for all interactive elements

### Performance Standards
- **First Contentful Paint:** <1.5 seconds
- **Time to Interactive:** <3 seconds
- **Largest Contentful Paint:** <2.5 seconds
- **60fps Animations:** Smooth interactions throughout

## 🔧 Technical Implementation Notes

### Component Architecture
- **Shared Design System:** Consistent components across POS and Admin
- **Atomic Design:** Button → Card → Screen hierarchy
- **State Management:** Zustand for global state, React Query for server state
- **Error Boundaries:** Graceful failure handling for all screens

### Data Loading Patterns
- **Optimistic Updates:** Immediate UI feedback for user actions
- **Background Sync:** Offline queue for critical operations
- **Lazy Loading:** Code splitting for non-critical screens
- **Prefetching:** Anticipate user navigation patterns

This comprehensive UI specification ensures that the POS system will provide an excellent user experience that matches Clover's familiarity while exceeding its visual design and accessibility standards.