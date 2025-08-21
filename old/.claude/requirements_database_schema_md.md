# Database Schema Specification - JustSell POS System

## 🗄️ Database Technology & Configuration

**Database:** PostgreSQL 15+  
**ORM:** Prisma  
**Connection Pool:** 20 connections (production)  
**Backup Strategy:** Point-in-time recovery with 7-day retention  
**Encryption:** AES-256 encryption at rest for sensitive fields

---

## 📋 Schema Design Principles

1. **Financial Data Integrity:** All monetary transactions use DECIMAL(10,2) for precision
2. **Audit Trails:** Complete audit logging for all financial and compliance operations
3. **Soft Deletes:** Critical data uses `isActive` flags instead of hard deletes
4. **Compliance First:** Schema supports dynamic regulatory requirements
5. **Performance Optimized:** Strategic indexing for high-frequency queries
6. **Scalability Ready:** Designed to handle millions of transactions

---

## 👥 Users Table
**Purpose:** Employee authentication and role-based access control

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt with 12 rounds
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
  store_id UUID REFERENCES store_locations(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_role ON users(role);
```

**Key Fields:**
- `password_hash`: bcrypt hashed passwords only, no plaintext storage
- `role`: Enum for role-based access control
- `failed_login_attempts`: Brute force protection
- `locked_until`: Account lockout mechanism

---

## 🏪 Store Locations Table
**Purpose:** Multi-store support with location-specific compliance rules

```sql
CREATE TABLE store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_code VARCHAR(2) NOT NULL, -- Critical for compliance rules
  zip_code VARCHAR(10),
  country_code VARCHAR(2) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255),
  tax_id VARCHAR(50), -- Federal EIN
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_store_locations_state_code ON store_locations(state_code);
CREATE INDEX idx_store_locations_active ON store_locations(is_active);
```

**Key Fields:**
- `state_code`: Critical for applying state-specific compliance rules
- `timezone`: Important for accurate transaction timestamps

---

## 📦 Products Table
**Purpose:** Product catalog with extensive compliance attributes

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(10,2) CHECK (cost >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock_level INTEGER DEFAULT 0,
  category VARCHAR(100),
  vendor VARCHAR(255),
  description TEXT,
  image_url VARCHAR(255),
  
  -- Compliance-specific fields
  flavor_profile VARCHAR(100), -- 'Tobacco', 'Menthol', 'Fruit', 'Dessert', etc.
  is_synthetic_nicotine BOOLEAN DEFAULT FALSE,
  volume_in_ml DECIMAL(10,2), -- For milliliter-based taxes
  is_closed_system BOOLEAN, -- For tax differentiation
  num_cartridges INTEGER, -- For cartridge-based taxes
  nicotine_strength DECIMAL(5,2), -- mg/ml
  age_restricted BOOLEAN DEFAULT TRUE,
  
  -- Inventory management
  expiration_date DATE,
  reason_for_expiration VARCHAR(100), -- 'Manufacturer', 'Regulatory', 'Recall'
  lot_number VARCHAR(100),
  supplier_item_id VARCHAR(100),
  
  -- System fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_flavor_profile ON products(flavor_profile);
CREATE INDEX idx_products_expiration_date ON products(expiration_date);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));
```

**Key Fields:**
- `flavor_profile`: Critical for flavor ban enforcement
- `volume_in_ml`: Required for per-milliliter excise taxes
- `is_closed_system`: Affects tax calculations in many states
- `expiration_date`: Inventory management and targeted offers

---

## 👤 Customers Table
**Purpose:** Customer profiles with loyalty and compliance data

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20),
  date_of_birth DATE, -- Critical for age verification
  
  -- Address information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  
  -- Loyalty program
  loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
  loyalty_tier VARCHAR(20) DEFAULT 'BRONZE',
  points_lifetime_earned INTEGER DEFAULT 0,
  points_lifetime_redeemed INTEGER DEFAULT 0,
  
  -- Customer analytics
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  transaction_count INTEGER DEFAULT 0,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  first_purchase_date TIMESTAMP WITH TIME ZONE,
  average_transaction_value DECIMAL(10,2),
  
  -- Privacy and compliance
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  data_retention_consent BOOLEAN DEFAULT TRUE,
  
  -- System fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_date_of_birth ON customers(date_of_birth);
CREATE INDEX idx_customers_loyalty_points ON customers(loyalty_points DESC);
CREATE INDEX idx_customers_last_purchase ON customers(last_purchase_date DESC);
CREATE INDEX idx_customers_name_search ON customers USING gin(to_tsvector('english', first_name || ' ' || last_name));
```

**Key Fields:**
- `date_of_birth`: Essential for age verification compliance
- `loyalty_points`: Real-time loyalty program balance
- `total_spent`: Customer lifetime value tracking

---

## 💳 Transactions Table
**Purpose:** Complete transaction records with compliance audit trails

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  store_id UUID NOT NULL REFERENCES store_locations(id),
  customer_id UUID REFERENCES customers(id), -- Nullable for cash customers
  employee_id UUID NOT NULL REFERENCES users(id),
  
  -- Transaction amounts
  subtotal_amount DECIMAL(10,2) NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_amount DECIMAL(10,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Tax breakdown (JSONB for flexibility)
  tax_breakdown JSONB, -- Detailed tax calculations
  
  -- Payment information
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'GIFT_CARD', 'SPLIT')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'VOIDED')),
  payment_processor VARCHAR(50), -- 'SQUARE', 'STRIPE', etc.
  payment_reference VARCHAR(100), -- External payment ID
  cash_tendered DECIMAL(10,2),
  change_given DECIMAL(10,2),
  
  -- Compliance fields
  age_verification_required BOOLEAN DEFAULT FALSE,
  age_verification_completed BOOLEAN DEFAULT FALSE,
  compliance_flags JSONB, -- Any compliance issues or notes
  
  -- Loyalty program
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_redeemed INTEGER DEFAULT 0,
  offers_applied JSONB, -- Applied offers and discounts
  
  -- Transaction metadata
  transaction_type VARCHAR(20) DEFAULT 'SALE' CHECK (transaction_type IN ('SALE', 'RETURN', 'VOID', 'EXCHANGE')),
  original_transaction_id UUID REFERENCES transactions(id), -- For returns/voids
  notes TEXT,
  
  -- System fields
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_store_id ON transactions(store_id);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_employee_id ON transactions(employee_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX idx_transactions_receipt_number ON transactions(receipt_number);
```

**Key Fields:**
- `receipt_number`: Human-readable transaction identifier
- `tax_breakdown`: JSONB field for complex tax calculations
- `compliance_flags`: Flexible storage for regulatory compliance data
- `age_verification_completed`: Critical compliance field

---

## 📄 Line Items Table
**Purpose:** Individual products within transactions

```sql
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  -- Product information (snapshot at time of sale)
  product_name VARCHAR(255) NOT NULL, -- Snapshot for historical accuracy
  product_sku VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  line_discount DECIMAL(10,2) DEFAULT 0.00 CHECK (line_discount >= 0),
  line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
  
  -- Tax information per line item
  line_tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_details JSONB, -- Detailed tax breakdown per item
  
  -- Compliance tracking
  age_verification_required BOOLEAN DEFAULT FALSE,
  compliance_checked BOOLEAN DEFAULT FALSE,
  
  -- Inventory tracking
  lot_number VARCHAR(100),
  expiration_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_line_items_transaction_id ON line_items(transaction_id);
CREATE INDEX idx_line_items_product_id ON line_items(product_id);
CREATE INDEX idx_line_items_created_at ON line_items(created_at);
```

**Key Fields:**
- `product_name`: Snapshot to preserve historical data
- `tax_details`: JSONB for complex per-item tax calculations
- `age_verification_required`: Item-level compliance tracking

---

## 🎯 Offers Table
**Purpose:** Loyalty offers and promotional campaigns

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  offer_type VARCHAR(50) NOT NULL CHECK (offer_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'BOGO', 'POINTS_MULTIPLIER', 'FREE_SHIPPING')),
  
  -- Discount configuration
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
  max_discount_amount DECIMAL(10,2), -- Cap for percentage discounts
  
  -- Targeting
  target_audience VARCHAR(50) DEFAULT 'ALL' CHECK (target_audience IN ('ALL', 'LOYALTY_MEMBERS', 'NEW_CUSTOMERS', 'VIP', 'EXPIRING_PRODUCT_BUYERS')),
  customer_segments JSONB, -- Flexible customer targeting
  applicable_products JSONB, -- Array of product IDs
  excluded_products JSONB, -- Array of excluded product IDs
  
  -- Usage limits
  max_uses_total INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Timing
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- AI-generated offer metadata
  generated_by_ai BOOLEAN DEFAULT FALSE,
  ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  expected_redemption_rate DECIMAL(5,4), -- AI prediction
  target_customer_count INTEGER,
  
  -- System fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_offers_start_date ON offers(start_date);
CREATE INDEX idx_offers_end_date ON offers(end_date);
CREATE INDEX idx_offers_target_audience ON offers(target_audience);
CREATE INDEX idx_offers_active ON offers(is_active);
```

**Key Fields:**
- `customer_segments`: JSONB for flexible AI-driven customer targeting
- `generated_by_ai`: Track AI vs manual offer creation
- `expected_redemption_rate`: AI prediction for offer performance

---

## 📊 Customer Purchase History Table
**Purpose:** Detailed purchase tracking for AI-driven personalization

```sql
CREATE TABLE customer_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  
  -- Purchase details
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Product characteristics at time of purchase
  product_category VARCHAR(100),
  flavor_profile VARCHAR(100),
  brand VARCHAR(100),
  
  -- Purchase context
  store_id UUID NOT NULL REFERENCES store_locations(id),
  time_of_day INTEGER, -- Hour of day (0-23)
  day_of_week INTEGER, -- 1-7 (Monday=1)
  season VARCHAR(20), -- 'SPRING', 'SUMMER', 'FALL', 'WINTER'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_purchase_history_customer_id ON customer_purchase_history(customer_id);
CREATE INDEX idx_purchase_history_product_id ON customer_purchase_history(product_id);
CREATE INDEX idx_purchase_history_purchase_date ON customer_purchase_history(purchase_date DESC);
CREATE INDEX idx_purchase_history_customer_product ON customer_purchase_history(customer_id, product_id);
```

**Key Fields:**
- `time_of_day`: For timing-based AI recommendations
- `season`: Seasonal purchasing pattern analysis
- `flavor_profile`: Critical for personalized recommendations

---

## ⚖️ Compliance Rules Table
**Purpose:** Dynamic regulatory compliance configuration

```sql
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('AGE_VERIFICATION', 'FLAVOR_BAN', 'TAX_RATE', 'PRODUCT_RESTRICTION', 'QUANTITY_LIMIT')),
  jurisdiction_type VARCHAR(20) NOT NULL CHECK (jurisdiction_type IN ('FEDERAL', 'STATE', 'COUNTY', 'CITY')),
  jurisdiction_code VARCHAR(20) NOT NULL, -- 'US', 'CA', 'NY', 'NYC', etc.
  
  -- Rule configuration (flexible JSONB)
  rule_details JSONB NOT NULL,
  -- Examples:
  -- Age verification: {"minAge": 21, "requireIdUnder": 30}
  -- Flavor ban: {"bannedFlavors": ["Fruit", "Candy"], "exceptions": ["Tobacco"]}
  -- Tax rate: {"taxType": "PER_ML", "rate": 0.0529, "basis": "WHOLESALE"}
  
  -- Effective period
  effective_date DATE NOT NULL,
  end_date DATE, -- NULL means indefinite
  
  -- Rule metadata
  rule_source VARCHAR(100), -- 'FDA', 'State Legislature', etc.
  reference_url VARCHAR(255),
  enforcement_priority VARCHAR(20) DEFAULT 'HIGH' CHECK (enforcement_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- System fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction_type, jurisdiction_code);
CREATE INDEX idx_compliance_rules_effective_date ON compliance_rules(effective_date);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active);
```

**Key Fields:**
- `rule_details`: JSONB for flexible rule configuration
- `jurisdiction_code`: Maps to store locations for rule application
- `enforcement_priority`: Critical for compliance violation handling

---

## 🔍 Age Verification Log Table
**Purpose:** Complete audit trail for age verification compliance

```sql
CREATE TABLE age_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  customer_id UUID REFERENCES customers(id),
  employee_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES store_locations(id),
  
  -- Verification details
  verification_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  id_type VARCHAR(50), -- 'DRIVER_LICENSE', 'STATE_ID', 'PASSPORT'
  id_issuing_state VARCHAR(2),
  id_expiration_date DATE,
  customer_dob DATE,
  calculated_age INTEGER,
  
  -- Verification result
  is_verified BOOLEAN NOT NULL,
  verification_method VARCHAR(50), -- 'ID_SCANNER', 'MANUAL_ENTRY', 'VISUAL_INSPECTION'
  reason_for_denial VARCHAR(255),
  
  -- Scanner data (if applicable)
  scanner_model VARCHAR(100),
  scanner_software_version VARCHAR(50),
  scan_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  raw_scan_data JSONB, -- Encrypted scanner output
  
  -- Override information
  manager_override BOOLEAN DEFAULT FALSE,
  override_manager_id UUID REFERENCES users(id),
  override_reason VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_age_verification_transaction_id ON age_verification_logs(transaction_id);
CREATE INDEX idx_age_verification_customer_id ON age_verification_logs(customer_id);
CREATE INDEX idx_age_verification_date ON age_verification_logs(verification_date DESC);
CREATE INDEX idx_age_verification_employee ON age_verification_logs(employee_id);
CREATE INDEX idx_age_verification_result ON age_verification_logs(is_verified);
```

**Key Fields:**
- `raw_scan_data`: Encrypted storage of ID scanner data
- `scan_confidence_score`: ID scanner reliability metric
- `manager_override`: For exceptional circumstances

---

## 💰 Payment Transactions Table
**Purpose:** Detailed payment processing records

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  processor VARCHAR(50), -- 'SQUARE', 'STRIPE', etc.
  processor_transaction_id VARCHAR(100),
  
  -- Card information (if applicable)
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20), -- 'VISA', 'MASTERCARD', etc.
  card_token VARCHAR(255), -- Tokenized card reference
  terminal_id VARCHAR(100),
  
  -- Processing details
  authorization_code VARCHAR(20),
  processor_fee DECIMAL(10,2),
  processing_time_ms INTEGER,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'VOIDED')),
  failure_reason VARCHAR(255),
  
  -- Timestamps
  authorized_at TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX idx_payment_transactions_processor_id ON payment_transactions(processor_transaction_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
```

**Key Fields:**
- `card_token`: Tokenized card data for PCI compliance
- `processor_fee`: Track payment processing costs
- `processing_time_ms`: Performance monitoring

---

## 📈 Inventory Movements Table
**Purpose:** Track all inventory changes for audit and analytics

```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  store_id UUID NOT NULL REFERENCES store_locations(id),
  
  -- Movement details
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('SALE', 'RETURN', 'ADJUSTMENT', 'RECEIVING', 'WASTE', 'TRANSFER', 'THEFT')),
  quantity_change INTEGER NOT NULL, -- Negative for outbound, positive for inbound
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  
  -- Cost tracking
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  
  -- Reference information
  reference_type VARCHAR(50), -- 'TRANSACTION', 'PURCHASE_ORDER', 'MANUAL_ADJUSTMENT'
  reference_id UUID, -- ID of related transaction, PO, etc.
  reason VARCHAR(255),
  
  -- User tracking
  employee_id UUID REFERENCES users(id),
  notes TEXT,
  
  -- Batch/lot tracking
  lot_number VARCHAR(100),
  expiration_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_store_id ON inventory_movements(store_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
```

**Key Fields:**
- `quantity_change`: Positive/negative for in/out movements
- `reference_type`: Links to triggering event
- `lot_number`: Batch tracking for expiration management

---

## 🔐 Audit Logs Table
**Purpose:** System-wide audit trail for security and compliance

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'TRANSACTION', 'REFUND', 'CONFIG_CHANGE'
  event_description TEXT NOT NULL,
  
  -- User context
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(20),
  ip_address INET,
  user_agent TEXT,
  
  -- Resource context
  resource_type VARCHAR(50), -- 'TRANSACTION', 'CUSTOMER', 'PRODUCT', 'USER'
  resource_id UUID,
  
  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  store_id UUID REFERENCES store_locations(id),
  session_id UUID,
  request_id UUID,
  
  -- Risk assessment
  risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
```

**Key Fields:**
- `old_values`/`new_values`: JSONB change tracking
- `risk_level`: Automated risk scoring
- `request_id`: Request tracing

---

## 🚀 Performance Optimization

### Indexes Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_transactions_store_date ON transactions(store_id, transaction_date DESC);
CREATE INDEX idx_line_items_product_date ON line_items(product_id, created_at DESC);
CREATE INDEX idx_purchase_history_customer_date ON customer_purchase_history(customer_id, purchase_date DESC);

-- Full-text search indexes
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
```

### Partitioning Strategy
```sql
-- Partition large tables by date
CREATE TABLE transactions_2024 PARTITION OF transactions 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE audit_logs_2024 PARTITION OF audit_logs 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Views for Common Queries
```sql
-- Customer analytics view
CREATE VIEW customer_analytics AS
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.loyalty_points,
  COUNT(t.id) as transaction_count,
  SUM(t.total_amount) as total_spent,
  AVG(t.total_amount) as avg_transaction_value,
  MAX(t.transaction_date) as last_purchase_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
WHERE c.is_active = true
GROUP BY c.id, c.first_name, c.last_name, c.loyalty_points;

-- Product performance view
CREATE VIEW product_performance AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.quantity,
  COALESCE(SUM(li.quantity), 0) as total_sold,
  COALESCE(SUM(li.line_total), 0) as total_revenue,
  COUNT(DISTINCT li.transaction_id) as transaction_count
FROM products p
LEFT JOIN line_items li ON p.id = li.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category, p.quantity;
```

---

## 📊 Data Retention & Archival

### Retention Policies
- **Transaction Data:** 7 years (regulatory requirement)
- **Audit Logs:** 3 years
- **Customer Data:** Until consent withdrawal + 30 days
- **Age Verification Logs:** 4 years (PACT Act requirement)
- **Inventory Movements:** 5 years

### Archival Strategy
```sql
-- Archive old transactions to separate tables
CREATE TABLE transactions_archive (LIKE transactions INCLUDING ALL);

-- Move data older than 2 years to archive
INSERT INTO transactions_archive 
SELECT * FROM transactions 
WHERE transaction_date < NOW() - INTERVAL '2 years';
```

This schema provides the foundation for a robust, compliant, and scalable POS system that can handle the complex requirements of the vape/tobacco retail industry while maintaining data integrity and regulatory compliance.