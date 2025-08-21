# API Endpoints Specification - JustSell POS System

## 🔐 Authentication Requirements
All endpoints require JWT authentication unless marked as `[PUBLIC]`. Include `Authorization: Bearer <token>` header.

**Base URL:** `http://localhost:3000/api` (development)  
**Rate Limiting:** 1000 requests/hour per user, 100 requests/minute for payment endpoints

---

## 🔑 Authentication Endpoints

### POST /auth/login
**Description:** Authenticate user and return JWT tokens  
**Rate Limit:** 10 attempts/minute  

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "storeId": "uuid" // Optional, for multi-store users
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "ADMIN|MANAGER|CASHIER",
    "storeId": "uuid"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "jwt_token",
    "expiresIn": 900 // 15 minutes
  }
}
```

### POST /auth/refresh
**Description:** Refresh expired access token  

**Request:**
```json
{
  "refreshToken": "jwt_token"
}
```

**Response (200):**
```json
{
  "accessToken": "jwt_token",
  "expiresIn": 900
}
```

### POST /auth/logout
**Description:** Invalidate user session and tokens  

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📦 Product Management Endpoints

### GET /products
**Description:** Retrieve products with filtering and pagination  
**Permissions:** All authenticated users  

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50, max: 100)
- `search`: string (searches name, SKU, description)
- `category`: string
- `vendor`: string
- `isActive`: boolean
- `nearingExpiration`: boolean (products expiring within 30 days)
- `stateRestricted`: string (state code to check restrictions)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "sku": "string",
      "price": "decimal",
      "cost": "decimal",
      "quantity": "integer",
      "category": "string",
      "vendor": "string",
      "description": "string",
      "imageUrl": "string",
      "isActive": "boolean",
      "flavorProfile": "string",
      "isSyntheticNicotine": "boolean",
      "volumeInML": "decimal",
      "isClosedSystem": "boolean",
      "numCartridges": "integer",
      "expirationDate": "date",
      "reasonForExpiration": "string",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

### GET /products/{productId}
**Description:** Retrieve single product by ID  

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Same product object as above
  }
}
```

### POST /products
**Description:** Create new product  
**Permissions:** ADMIN, MANAGER  

**Request:**
```json
{
  "name": "string",
  "sku": "string",
  "price": "decimal",
  "cost": "decimal",
  "quantity": "integer",
  "category": "string",
  "vendor": "string",
  "description": "string",
  "imageUrl": "string",
  "flavorProfile": "string",
  "isSyntheticNicotine": "boolean",
  "volumeInML": "decimal",
  "isClosedSystem": "boolean",
  "numCartridges": "integer",
  "expirationDate": "date",
  "reasonForExpiration": "string"
}
```

**Response (201):** Same as GET single product

### PUT /products/{productId}
**Description:** Update existing product  
**Permissions:** ADMIN, MANAGER  

**Request:** Same as POST products  
**Response (200):** Updated product object

### DELETE /products/{productId}
**Description:** Soft delete product (sets isActive to false)  
**Permissions:** ADMIN  

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### GET /products/nearing-expiration
**Description:** Get products nearing expiration for targeted offers  

**Query Parameters:**
- `days`: number (default: 30) - days until expiration
- `storeId`: uuid

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      // Product object with additional fields:
      "daysUntilExpiration": "integer",
      "currentQuantity": "integer",
      "likelyCustomers": ["uuid", "uuid"] // Customer IDs who often buy this product
    }
  ]
}
```

---

## 👥 Customer Management Endpoints

### GET /customers
**Description:** Retrieve customers with filtering and pagination  

**Query Parameters:**
- `page`: number
- `limit`: number
- `search`: string (searches name, email, phone)
- `state`: string
- `loyaltyTier`: string
- `lastPurchaseAfter`: date

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phoneNumber": "string",
      "loyaltyPoints": "integer",
      "lastPurchaseDate": "datetime",
      "dateOfBirth": "date",
      "address": {
        "line1": "string",
        "line2": "string",
        "city": "string",
        "state": "string",
        "zipCode": "string"
      },
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1243,
    "totalPages": 25
  }
}
```

### GET /customers/{customerId}
**Description:** Retrieve single customer by ID  

**Response (200):** Single customer object with purchase history summary

### POST /customers
**Description:** Create new customer  

**Request:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string",
  "dateOfBirth": "date",
  "address": {
    "line1": "string",
    "line2": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string"
  }
}
```

**Response (201):** Created customer object

### PUT /customers/{customerId}
**Description:** Update customer information  

**Request:** Same as POST customers  
**Response (200):** Updated customer object

### GET /customers/{customerId}/purchase-history
**Description:** Get detailed purchase history for customer  

**Query Parameters:**
- `page`: number
- `limit`: number
- `startDate`: date
- `endDate`: date

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "uuid",
      "date": "datetime",
      "total": "decimal",
      "items": [
        {
          "productId": "uuid",
          "productName": "string",
          "quantity": "integer",
          "unitPrice": "decimal"
        }
      ],
      "paymentMethod": "string",
      "loyaltyPointsEarned": "integer"
    }
  ],
  "analytics": {
    "totalSpent": "decimal",
    "totalTransactions": "integer",
    "averageTransactionValue": "decimal",
    "favoriteProducts": ["string", "string"],
    "lastPurchase": "datetime"
  }
}
```

---

## 💳 Transaction Processing Endpoints

### POST /transactions
**Description:** Create and process new transaction  
**Critical:** This endpoint handles financial data - must be bulletproof  

**Request:**
```json
{
  "customerId": "uuid", // Optional for cash customers
  "employeeId": "uuid",
  "storeId": "uuid",
  "lineItems": [
    {
      "productId": "uuid",
      "quantity": "integer",
      "unitPrice": "decimal",
      "discountApplied": "decimal"
    }
  ],
  "discountAmount": "decimal",
  "paymentMethod": "CASH|CARD|GIFT_CARD|SPLIT",
  "paymentDetails": {
    "terminalId": "string", // For card payments
    "giftCardNumber": "string", // For gift card payments
    "cashTendered": "decimal", // For cash payments
    "splitPayments": [ // For split payments
      {
        "method": "CASH|CARD|GIFT_CARD",
        "amount": "decimal",
        "details": {}
      }
    ]
  },
  "ageVerificationDetails": {
    "isRequired": "boolean",
    "isVerified": "boolean",
    "idScanData": "object", // Raw ID scan data
    "customerDOB": "date",
    "idType": "string",
    "employeeOverride": "boolean" // For manual verification
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "receiptNumber": "string",
    "totalAmount": "decimal",
    "subTotalAmount": "decimal",
    "totalTaxAmount": "decimal",
    "taxBreakdown": [
      {
        "type": "STATE_SALES_TAX",
        "rate": "decimal",
        "amount": "decimal"
      },
      {
        "type": "EXCISE_TAX_PER_ML",
        "rate": "decimal",
        "amount": "decimal"
      }
    ],
    "paymentStatus": "COMPLETED|PENDING|FAILED",
    "loyaltyPointsEarned": "integer",
    "change": "decimal", // For cash payments
    "receiptData": {
      "storeName": "string",
      "storeAddress": "string",
      "transactionDate": "datetime",
      "items": [
        {
          "name": "string",
          "quantity": "integer",
          "unitPrice": "decimal",
          "total": "decimal"
        }
      ]
    }
  }
}
```

### GET /transactions/{transactionId}
**Description:** Retrieve transaction details  

**Response (200):** Complete transaction object with all details

### POST /transactions/{transactionId}/refund
**Description:** Process full or partial refund  
**Permissions:** MANAGER, ADMIN  

**Request:**
```json
{
  "reason": "string",
  "items": [ // For partial refunds
    {
      "lineItemId": "uuid",
      "quantity": "integer"
    }
  ],
  "refundMethod": "ORIGINAL|CASH|GIFT_CARD"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "refundId": "uuid",
    "originalTransactionId": "uuid",
    "refundAmount": "decimal",
    "refundMethod": "string",
    "refundDate": "datetime"
  }
}
```

### POST /transactions/{transactionId}/void
**Description:** Void entire transaction (same day only)  
**Permissions:** MANAGER, ADMIN  

**Request:**
```json
{
  "reason": "string",
  "managerAuthorization": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transaction voided successfully"
}
```

---

## 💰 Payment Processing Endpoints

### POST /payments/process
**Description:** Process payment through connected terminal  
**Rate Limit:** 100 requests/minute  

**Request:**
```json
{
  "transactionId": "uuid",
  "amount": "decimal",
  "paymentMethod": "CARD|CASH|GIFT_CARD",
  "terminalId": "string",
  "paymentData": {
    "cardToken": "string", // For tokenized card data
    "giftCardNumber": "string",
    "pin": "string" // Encrypted
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "paymentId": "uuid",
  "status": "APPROVED|DECLINED|ERROR",
  "approvalCode": "string",
  "last4": "string", // Last 4 digits of card
  "cardType": "VISA|MASTERCARD|AMEX|DISCOVER",
  "receiptData": {
    "merchantCopy": "string",
    "customerCopy": "string"
  }
}
```

### POST /payments/terminal/connect
**Description:** Connect to payment terminal  

**Request:**
```json
{
  "terminalType": "SQUARE|STRIPE",
  "terminalId": "string",
  "connectionString": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "terminalStatus": "CONNECTED|DISCONNECTED|ERROR",
  "capabilities": ["CHIP", "CONTACTLESS", "SWIPE"]
}
```

---

## 🎯 Loyalty & Offers Endpoints

### GET /loyalty/offers
**Description:** Get active offers for store  

**Query Parameters:**
- `customerId`: uuid (for personalized offers)
- `productId`: uuid (for product-specific offers)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "discountType": "PERCENTAGE|FIXED|BOGO|POINTS_MULTIPLIER",
      "discountValue": "decimal",
      "minPurchaseAmount": "decimal",
      "startDate": "datetime",
      "endDate": "datetime",
      "targetAudience": "ALL|LOYALTY_MEMBERS|SPECIFIC_SEGMENT",
      "applicableProducts": ["uuid"],
      "usageCount": "integer",
      "maxUsage": "integer"
    }
  ]
}
```

### POST /loyalty/offers
**Description:** Create new offer  
**Permissions:** ADMIN, MANAGER  

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "discountType": "PERCENTAGE|FIXED|BOGO|POINTS_MULTIPLIER",
  "discountValue": "decimal",
  "minPurchaseAmount": "decimal",
  "startDate": "datetime",
  "endDate": "datetime",
  "targetAudience": "ALL|LOYALTY_MEMBERS|SPECIFIC_SEGMENT",
  "applicableProducts": ["uuid"],
  "maxUsage": "integer"
}
```

### POST /loyalty/generate-personalized-offers
**Description:** AI-generated personalized offers  
**Permissions:** ADMIN, MANAGER  

**Request:**
```json
{
  "targetSegment": "FREQUENT_BUYERS|PRICE_SENSITIVE|PRODUCT_SPECIFIC",
  "productIds": ["uuid"], // Optional, for product-specific offers
  "maxOffers": "integer",
  "expirationDays": "integer"
}
```

**Response (200):**
```json
{
  "success": true,
  "offersGenerated": "integer",
  "offers": [
    {
      // Offer object
      "targetCustomers": ["uuid"],
      "expectedRedemptionRate": "decimal"
    }
  ]
}
```

### POST /loyalty/redeem-points
**Description:** Redeem loyalty points for discount  

**Request:**
```json
{
  "customerId": "uuid",
  "pointsToRedeem": "integer",
  "transactionId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "discountAmount": "decimal",
  "remainingPoints": "integer"
}
```

---

## 📊 Compliance & Reporting Endpoints

### GET /compliance/rules/{storeId}
**Description:** Get active compliance rules for store location  

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ruleType": "AGE_VERIFICATION|FLAVOR_BAN|TAX_RATE|PRODUCT_RESTRICTION",
      "jurisdictionType": "FEDERAL|STATE|CITY",
      "jurisdictionCode": "string",
      "ruleDetails": {
        // Dynamic JSON based on rule type
        "minAge": 21,
        "requireIdUnder": 30,
        "bannedFlavors": ["Fruit", "Candy"],
        "taxRate": 0.0529,
        "taxBasis": "PER_ML"
      },
      "effectiveDate": "date",
      "endDate": "date"
    }
  ]
}
```

### POST /compliance/age-verification-log
**Description:** Log age verification attempt  

**Request:**
```json
{
  "transactionId": "uuid",
  "customerId": "uuid",
  "employeeId": "uuid",
  "idType": "DRIVER_LICENSE|STATE_ID|PASSPORT",
  "idNumber": "string", // Hashed for privacy
  "idDateOfBirth": "date",
  "isVerified": "boolean",
  "reasonForDenial": "string",
  "scannerUsed": "string",
  "rawScanData": "object" // Encrypted
}
```

### GET /reports/pact-act
**Description:** Generate PACT Act compliance report  
**Permissions:** ADMIN, MANAGER  

**Query Parameters:**
- `startDate`: date
- `endDate`: date
- `stateCode`: string

**Response (200):**
```json
{
  "success": true,
  "reportData": [
    {
      "transactionId": "uuid",
      "customerName": "string",
      "customerAddress": "object",
      "productsBrand": "string",
      "quantity": "integer",
      "deliveryMethod": "string",
      "deliveryPerson": "string"
    }
  ],
  "summary": {
    "totalTransactions": "integer",
    "totalQuantity": "integer",
    "reportPeriod": "string"
  }
}
```

### GET /reports/age-verification-logs
**Description:** Age verification audit report  

**Query Parameters:**
- `startDate`: date
- `endDate`: date
- `employeeId`: uuid
- `status`: "VERIFIED|DENIED|ALL"

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "logId": "uuid",
      "transactionId": "uuid",
      "verificationDate": "datetime",
      "isVerified": "boolean",
      "employeeName": "string",
      "customerAge": "integer",
      "idType": "string"
    }
  ],
  "summary": {
    "totalVerifications": "integer",
    "successRate": "decimal",
    "failureReasons": {
      "Under Age": "integer",
      "Invalid ID": "integer",
      "Expired ID": "integer"
    }
  }
}
```

---

## ⚙️ System Administration Endpoints

### GET /users
**Description:** Get all system users  
**Permissions:** ADMIN  

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "ADMIN|MANAGER|CASHIER",
      "isActive": "boolean",
      "lastLogin": "datetime",
      "createdAt": "datetime"
    }
  ]
}
```

### POST /users
**Description:** Create new user  
**Permissions:** ADMIN  

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "ADMIN|MANAGER|CASHIER",
  "storeId": "uuid"
}
```

### GET /settings/{storeId}
**Description:** Get store configuration  
**Permissions:** ADMIN, MANAGER  

**Response (200):**
```json
{
  "success": true,
  "data": {
    "storeInfo": {
      "name": "string",
      "address": "object",
      "taxId": "string",
      "phone": "string"
    },
    "paymentSettings": {
      "squareTerminalId": "string",
      "stripeTerminalId": "string",
      "acceptedPaymentMethods": ["CASH", "CARD", "GIFT_CARD"]
    },
    "complianceSettings": {
      "ageVerificationRequired": "boolean",
      "idScannerEnabled": "boolean",
      "autoApplyTaxes": "boolean"
    },
    "loyaltySettings": {
      "pointsPerDollar": "decimal",
      "redemptionRate": "decimal",
      "autoGenerateOffers": "boolean"
    }
  }
}
```

---

## 🚨 Error Response Format

All endpoints return errors in consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "object", // Optional additional details
    "field": "string" // For validation errors
  }
}
```

### Common Error Codes:
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `PAYMENT_FAILED`: Payment processing error
- `COMPLIANCE_VIOLATION`: Age verification or other compliance failure
- `INVENTORY_INSUFFICIENT`: Not enough stock
- `EXTERNAL_SERVICE_ERROR`: Third-party service failure

---

## 🔒 Security Headers

All responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```