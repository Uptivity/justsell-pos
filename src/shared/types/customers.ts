import type { LoyaltyTier } from './database'

export interface CreateCustomerData {
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  dateOfBirth?: string // ISO date string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  marketingOptIn?: boolean
  smsOptIn?: boolean
  loyaltyPoints?: number
  totalSpent?: number
}

export interface UpdateCustomerData {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  dateOfBirth?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  marketingOptIn?: boolean
  smsOptIn?: boolean
  dataRetentionConsent?: boolean
  loyaltyPoints?: number
  totalSpent?: number
  loyaltyTier?: LoyaltyTier
  isActive?: boolean
}

export interface CustomerResponse {
  id: string
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  dateOfBirth?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  loyaltyPoints: number
  loyaltyTier: LoyaltyTier
  pointsLifetimeEarned: number
  pointsLifetimeRedeemed: number
  totalSpent: number
  transactionCount: number
  lastPurchaseDate?: string
  firstPurchaseDate?: string
  averageTransactionValue?: number
  marketingOptIn: boolean
  smsOptIn: boolean
  dataRetentionConsent: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerSearchResult {
  id: string
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  loyaltyTier: LoyaltyTier
  loyaltyPoints: number
}

export interface CustomerListItem {
  id: string
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  loyaltyTier: LoyaltyTier
  loyaltyPoints: number
  totalSpent: number
  transactionCount: number
  lastPurchaseDate?: string
  createdAt: string
}

export interface LoyaltyPointsUpdate {
  points: number
  operation: 'earn' | 'redeem'
  reason: string
}

export interface LoyaltyCalculation {
  pointsEarned: number
  currentTier: LoyaltyTier
  nextTier?: LoyaltyTier
  progressToNext: number
  amountToNextTier: number
}

export interface CustomerStats {
  totalCustomers: number
  newCustomersToday: number
  newCustomersThisMonth: number
  averageTransactionValue: number
  averageLoyaltyPoints: number
  tierDistribution: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
}

export interface CustomerPurchaseHistory {
  id: string
  productId: string
  product: {
    id: string
    name: string
    category?: string
  }
  quantity: number
  unitPrice: number
  totalPrice: number
  purchaseDate: string
  transactionId: string
}

export interface CustomerTransaction {
  id: string
  receiptNumber: string
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  transactionDate: string
  loyaltyPointsEarned: number
  loyaltyPointsRedeemed: number
  lineItems: {
    id: string
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
}