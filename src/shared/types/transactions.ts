import type { PaymentMethod } from '../types/database'

export interface CartItem {
  productId: string
  quantity: number
  product?: {
    id: string
    name: string
    price: number
    ageRestricted: boolean
  }
}

export interface CreateTransactionData {
  customerId?: string
  cartItems: CartItem[]
  paymentMethod: PaymentMethod
  cashTendered?: number
  ageVerificationCompleted?: boolean
  storeId?: string
  notes?: string
}

export interface TransactionResponse {
  id: string
  receiptNumber: string
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: string
  cashTendered?: number
  changeGiven?: number
  ageVerificationRequired: boolean
  ageVerificationCompleted: boolean
  loyaltyPointsEarned: number
  loyaltyPointsRedeemed: number
  transactionDate: string
  lineItems: TransactionLineItem[]
  customer?: {
    id: string
    firstName: string
    lastName: string
  }
  employee: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface TransactionLineItem {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  ageVerificationRequired: boolean
  product: {
    id: string
    name: string
    price: number
    sku: string
    ageRestricted: boolean
  }
}

export interface AgeVerificationData {
  customerId?: string
  idType: string
  idIssuingState?: string
  idExpirationDate?: string
  customerDob: string
  calculatedAge: number
  isVerified: boolean
  verificationMethod: string
  reasonForDenial?: string
  managerOverride?: boolean
  overrideReason?: string
}

export interface PaymentData {
  method: PaymentMethod
  cashTendered?: number
  cardReference?: string
  giftCardNumber?: string
  splitPayments?: {
    method: PaymentMethod
    amount: number
    reference?: string
  }[]
}

export interface TaxCalculation {
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  breakdown?: {
    stateTax?: number
    localTax?: number
    specialTax?: number
  }
}

export interface Receipt {
  transactionId: string
  receiptNumber: string
  storeInfo: {
    name: string
    address: string
    phone: string
    taxId?: string
  }
  transactionDate: string
  employee: string
  customer?: string
  lineItems: {
    name: string
    sku: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  cashTendered?: number
  changeGiven?: number
  loyaltyPoints?: {
    earned: number
    redeemed: number
    balance: number
  }
}