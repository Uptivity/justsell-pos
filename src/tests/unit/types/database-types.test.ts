import type {
  User,
  UserRole,
  Product,
  Customer,
  PaymentMethod,
  ComplianceRuleDetails,
  CreateTransactionData,
} from '../../../shared/types/database'
import { Decimal } from '@prisma/client/runtime/library'

describe('Database Types', () => {
  describe('User Types', () => {
    it('should enforce UserRole enum values', () => {
      const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'CASHIER']

      validRoles.forEach((role) => {
        expect(['ADMIN', 'MANAGER', 'CASHIER']).toContain(role)
      })
    })

    it('should type User interface correctly', () => {
      const mockUser: Partial<User> = {
        id: 'user-1',
        username: 'testuser',
        role: 'CASHIER',
        isActive: true,
      }

      expect(mockUser.id).toBe('user-1')
      expect(mockUser.username).toBe('testuser')
      expect(mockUser.role).toBe('CASHIER')
      expect(mockUser.isActive).toBe(true)
    })
  })

  describe('Product Types', () => {
    it('should enforce compliance-specific product fields', () => {
      const mockProduct: Partial<Product> = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: new Decimal(19.99),
        flavorProfile: 'Tobacco',
        isSyntheticNicotine: false,
        volumeInMl: new Decimal(2.0),
        nicotineStrength: new Decimal(35.0),
        ageRestricted: true,
      }

      expect(mockProduct.flavorProfile).toBe('Tobacco')
      expect(mockProduct.isSyntheticNicotine).toBe(false)
      expect(mockProduct.ageRestricted).toBe(true)
      expect(mockProduct.volumeInMl).toBeInstanceOf(Decimal)
    })
  })

  describe('Transaction Types', () => {
    it('should enforce PaymentMethod enum values', () => {
      const validMethods: PaymentMethod[] = ['CASH', 'CARD', 'GIFT_CARD', 'SPLIT']

      validMethods.forEach((method) => {
        expect(['CASH', 'CARD', 'GIFT_CARD', 'SPLIT']).toContain(method)
      })
    })

    it('should type CreateTransactionData correctly', () => {
      const mockTransactionData: CreateTransactionData = {
        receiptNumber: 'RCP-001',
        storeId: 'store-1',
        employeeId: 'user-1',
        subtotalAmount: 25.99,
        taxAmount: 2.34,
        totalAmount: 28.33,
        paymentMethod: 'CARD',
        ageVerificationRequired: true,
        ageVerificationCompleted: true,
        lineItems: [
          {
            productId: 'prod-1',
            productName: 'Test Product',
            productSku: 'TEST-001',
            quantity: 1,
            unitPrice: 25.99,
            lineTotal: 25.99,
          },
        ],
      }

      expect(mockTransactionData.receiptNumber).toBe('RCP-001')
      expect(mockTransactionData.paymentMethod).toBe('CARD')
      expect(mockTransactionData.ageVerificationRequired).toBe(true)
      expect(mockTransactionData.lineItems).toHaveLength(1)
    })
  })

  describe('Compliance Types', () => {
    it('should allow flexible ComplianceRuleDetails structure', () => {
      // Age verification rule details
      const ageVerificationDetails: ComplianceRuleDetails = {
        minAge: 21,
        requireIdUnder: 30,
        acceptableIds: ['DRIVER_LICENSE', 'STATE_ID', 'PASSPORT'],
      }

      // Flavor ban rule details
      const flavorBanDetails: ComplianceRuleDetails = {
        bannedFlavors: ['Fruit', 'Candy'],
        exceptions: ['Tobacco', 'Menthol'],
        effectiveProducts: ['disposable_vapes'],
      }

      // Tax rule details
      const taxRuleDetails: ComplianceRuleDetails = {
        taxType: 'PER_ML',
        rate: 0.0529,
        basis: 'WHOLESALE',
      }

      expect(ageVerificationDetails.minAge).toBe(21)
      expect(flavorBanDetails.bannedFlavors).toContain('Fruit')
      expect(taxRuleDetails.taxType).toBe('PER_ML')
    })
  })

  describe('Customer Types', () => {
    it('should type Customer with loyalty fields', () => {
      const mockCustomer: Partial<Customer> = {
        id: 'cust-1',
        firstName: 'John',
        lastName: 'Doe',
        loyaltyPoints: 250,
        loyaltyTier: 'SILVER',
        totalSpent: new Decimal(125.5),
        transactionCount: 8,
        marketingOptIn: true,
      }

      expect(mockCustomer.loyaltyTier).toBe('SILVER')
      expect(mockCustomer.loyaltyPoints).toBe(250)
      expect(mockCustomer.totalSpent).toBeInstanceOf(Decimal)
      expect(mockCustomer.marketingOptIn).toBe(true)
    })
  })
})
