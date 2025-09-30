// Export all Prisma generated types for use throughout the application
export type {
  User,
  UserRole,
  StoreLocation,
  Product,
  Customer,
  LoyaltyTier,
  Transaction,
  TransactionType,
  PaymentMethod,
  PaymentStatus,
  LineItem,
  Offer,
  OfferType,
  TargetAudience,
  CustomerPurchaseHistory,
  ComplianceRule,
  RuleType,
  JurisdictionType,
  EnforcementPriority,
  AgeVerificationLog,
} from '../../generated/prisma'

// Import Decimal from Prisma client library
import { Decimal } from '@prisma/client/runtime/library'
export type { Decimal }

// Import the types we need for interfaces
import type { UserRole, PaymentMethod, LoyaltyTier } from '../../generated/prisma'

// Additional utility types
export interface CreateUserData {
  username: string
  passwordHash: string
  firstName?: string
  lastName?: string
  role: UserRole
  storeId?: string
}

export interface CreateTransactionData {
  receiptNumber: string
  storeId: string
  customerId?: string
  employeeId: string
  subtotalAmount: number
  discountAmount?: number
  taxAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  ageVerificationRequired: boolean
  ageVerificationCompleted: boolean
  lineItems: CreateLineItemData[]
}

export interface CreateLineItemData {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  lineDiscount?: number
  lineTotal: number
  lineTaxAmount?: number
  ageVerificationRequired?: boolean
}

export interface ComplianceRuleDetails {
  // Age verification rules
  minAge?: number
  requireIdUnder?: number
  acceptableIds?: string[]

  // Flavor ban rules
  bannedFlavors?: string[]
  exceptions?: string[]
  effectiveProducts?: string[]

  // Tax rules
  taxType?: 'PERCENTAGE' | 'PER_ML' | 'PER_CARTRIDGE' | 'FIXED'
  rate?: number
  basis?: 'WHOLESALE' | 'RETAIL'

  // Product restrictions
  maxQuantityPerTransaction?: number
  maxQuantityPerDay?: number
  restrictedHours?: { start: string; end: string }[]
}

export interface CustomerSegments {
  tiers?: LoyaltyTier[]
  minSpent?: number
  maxSpent?: number
  ageRange?: { min: number; max: number }
  lastPurchaseDays?: number
  favoriteCategories?: string[]
}
