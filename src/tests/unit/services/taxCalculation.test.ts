import { taxCalculationService } from '../../../shared/services/taxCalculation'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn()
  }
}))

describe('Tax Calculation Service - CRITICAL FINANCIAL LOGIC TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Fallback Tax Calculation - Core Money Logic', () => {
    const basicRequest = {
      subtotal: 100.00,
      storeZipCode: '10001',
      storeState: 'NY',
      lineItems: [
        {
          productId: 'prod-1',
          category: 'general',
          amount: 60.00,
          isTaxExempt: false
        },
        {
          productId: 'prod-2',
          category: 'tobacco',
          amount: 40.00,
          isTaxExempt: false,
          specialTaxCategory: 'tobacco'
        }
      ]
    }

    it('should calculate basic sales tax correctly', () => {
      const result = taxCalculationService.fallbackTaxCalculation({
        ...basicRequest,
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: 100.00,
            isTaxExempt: false
          }
        ]
      })

      // NY sales tax is 8% according to the service
      const expectedTax = 100.00 * 0.08
      expect(result.subtotal).toBe(100.00)
      expect(result.totalTaxAmount).toBeCloseTo(expectedTax, 2)
      expect(result.totalAmount).toBeCloseTo(100.00 + expectedTax, 2)
      expect(result.jurisdictions).toHaveLength(1)
      expect(result.jurisdictions[0].code).toBe('NY_SALES')
    })

    it('should calculate tobacco tax correctly - CRITICAL COMPLIANCE', () => {
      const result = taxCalculationService.fallbackTaxCalculation(basicRequest)

      // Should have:
      // 1. Regular sales tax on $60 general items = $60 * 0.08 = $4.80
      // 2. Tobacco tax on $40 tobacco items = $40 * 0.20 = $8.00 (NY tobacco tax)
      // 3. Sales tax on tobacco items = $40 * 0.08 = $3.20
      // Total tax = $4.80 + $8.00 + $3.20 = $16.00

      const expectedRegularTax = 60.00 * 0.08 // $4.80
      const expectedTobaccoTax = 40.00 * 0.20 // $8.00 (NY tobacco tax)
      const expectedTobaccoSalesTax = 40.00 * 0.08 // $3.20
      const expectedTotalTax = expectedRegularTax + expectedTobaccoTax + expectedTobaccoSalesTax

      expect(result.subtotal).toBe(100.00)
      expect(result.totalTaxAmount).toBeCloseTo(expectedTotalTax, 2)
      expect(result.totalAmount).toBeCloseTo(100.00 + expectedTotalTax, 2)
      expect(result.jurisdictions).toHaveLength(3) // Regular, tobacco special, tobacco sales
    })

    it('should handle tax exempt customers', () => {
      const exemptRequest = {
        ...basicRequest,
        taxExemptCustomer: true
      }

      const result = taxCalculationService.fallbackTaxCalculation(exemptRequest)

      expect(result.totalTaxAmount).toBe(0)
      expect(result.exemptAmount).toBe(100.00)
      expect(result.jurisdictions).toHaveLength(0)
    })

    it('should handle tax exempt line items', () => {
      const exemptItemsRequest = {
        ...basicRequest,
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: 60.00,
            isTaxExempt: true // Exempt item
          },
          {
            productId: 'prod-2',
            category: 'tobacco',
            amount: 40.00,
            isTaxExempt: false,
            specialTaxCategory: 'tobacco'
          }
        ]
      }

      const result = taxCalculationService.fallbackTaxCalculation(exemptItemsRequest)

      // Only tobacco should be taxed
      const expectedTobaccoTax = 40.00 * 0.20
      const expectedTobaccoSalesTax = 40.00 * 0.08
      const expectedTotalTax = expectedTobaccoTax + expectedTobaccoSalesTax

      expect(result.exemptAmount).toBe(60.00)
      expect(result.totalTaxAmount).toBeCloseTo(expectedTotalTax, 2)
    })

    it('should handle zero subtotal', () => {
      const zeroRequest = {
        ...basicRequest,
        subtotal: 0,
        lineItems: []
      }

      const result = taxCalculationService.fallbackTaxCalculation(zeroRequest)

      expect(result.subtotal).toBe(0)
      expect(result.totalTaxAmount).toBe(0)
      expect(result.totalAmount).toBe(0)
      expect(result.jurisdictions).toHaveLength(0)
    })

    it('should handle mixed exempt and taxable items correctly', () => {
      const mixedRequest = {
        ...basicRequest,
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: 30.00,
            isTaxExempt: false
          },
          {
            productId: 'prod-2',
            category: 'food',
            amount: 20.00,
            isTaxExempt: true
          },
          {
            productId: 'prod-3',
            category: 'tobacco',
            amount: 50.00,
            isTaxExempt: false,
            specialTaxCategory: 'tobacco'
          }
        ]
      }

      const result = taxCalculationService.fallbackTaxCalculation(mixedRequest)

      // Regular tax: $30 * 0.08 = $2.40
      // Tobacco special: $50 * 0.20 = $10.00
      // Tobacco sales: $50 * 0.08 = $4.00
      // Total: $16.40

      const expectedTotalTax = (30.00 * 0.08) + (50.00 * 0.20) + (50.00 * 0.08)

      expect(result.exemptAmount).toBe(20.00)
      expect(result.totalTaxAmount).toBeCloseTo(expectedTotalTax, 2)
    })
  })

  describe('State Tax Rate Calculations - Accuracy Tests', () => {
    it('should return correct tax rates for all states', () => {
      // Test key states with known rates from the actual implementation
      expect(taxCalculationService.getStateTaxRate('NY')).toBe(0.08)
      expect(taxCalculationService.getStateTaxRate('CA')).toBe(0.075)
      expect(taxCalculationService.getStateTaxRate('TX')).toBe(0.0625)
      expect(taxCalculationService.getStateTaxRate('FL')).toBe(0.06)

      expect(taxCalculationService.getStateTaxRate('DE')).toBe(0) // No sales tax

      expect(taxCalculationService.getStateTaxRate('MT')).toBe(0.00) // No sales tax
      expect(taxCalculationService.getStateTaxRate('NH')).toBe(0.00) // No sales tax
      expect(taxCalculationService.getStateTaxRate('OR')).toBe(0.00) // No sales tax
    })

    it('should return default rate for unknown states', () => {
      expect(taxCalculationService.getStateTaxRate('UNKNOWN')).toBe(0.08)
    })

    it('should handle null/undefined states', () => {
      expect(taxCalculationService.getStateTaxRate(null as any)).toBe(0.08)
      expect(taxCalculationService.getStateTaxRate(undefined as any)).toBe(0.08)
    })
  })

  describe('Special Tax Rate Calculations - Tobacco Compliance', () => {
    it('should return correct tobacco tax rates by state', () => {
      expect(taxCalculationService.getSpecialTaxRate('NY', 'tobacco')).toBe(0.20)
      expect(taxCalculationService.getSpecialTaxRate('CA', 'tobacco')).toBe(0.15)
      expect(taxCalculationService.getSpecialTaxRate('TX', 'tobacco')).toBe(0.10)
      expect(taxCalculationService.getSpecialTaxRate('FL', 'tobacco')).toBe(0.12)
      expect(taxCalculationService.getSpecialTaxRate('IL', 'tobacco')).toBe(0.18)
    })

    it('should return default tobacco tax for unknown states', () => {
      expect(taxCalculationService.getSpecialTaxRate('UNKNOWN', 'tobacco')).toBe(0.05)
    })

    it('should return zero for non-tobacco categories', () => {
      expect(taxCalculationService.getSpecialTaxRate('NY', 'alcohol' as any)).toBe(0)
      expect(taxCalculationService.getSpecialTaxRate('CA', 'food' as any)).toBe(0)
    })
  })

  describe('Tax Jurisdiction Logic', () => {
    it('should create correct jurisdiction objects', () => {
      const jurisdictions = taxCalculationService.getDefaultJurisdictions('NY')

      expect(jurisdictions).toHaveLength(2)

      const salesTax = jurisdictions.find(j => j.code === 'NY_SALES')
      const tobaccoTax = jurisdictions.find(j => j.code === 'NY_TOBACCO')

      expect(salesTax).toEqual({
        code: 'NY_SALES',
        name: 'NY Sales Tax',
        type: 'state',
        rate: 0.08
      })

      expect(tobaccoTax).toEqual({
        code: 'NY_TOBACCO',
        name: 'NY Tobacco Tax',
        type: 'state',
        rate: 0.20,
        applicableProducts: ['tobacco', 'vape', 'e-cigarette']
      })
    })
  })

  describe('Tax Exemption Categories', () => {
    it('should correctly identify tax exempt categories by state', () => {
      expect(taxCalculationService.isCategoryTaxExempt('clothing', 'MT')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('food', 'MT')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('tobacco', 'MT')).toBe(false)

      expect(taxCalculationService.isCategoryTaxExempt('food', 'OR')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('medicine', 'OR')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('clothing', 'OR')).toBe(false)

      expect(taxCalculationService.isCategoryTaxExempt('food', 'NH')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('medicine', 'NH')).toBe(true)
      expect(taxCalculationService.isCategoryTaxExempt('clothing', 'NH')).toBe(true)
    })

    it('should return false for states not in exemption list', () => {
      expect(taxCalculationService.isCategoryTaxExempt('food', 'NY')).toBe(false)
      expect(taxCalculationService.isCategoryTaxExempt('clothing', 'CA')).toBe(false)
    })
  })

  describe('Tax Breakdown Formatting', () => {
    it('should format tax breakdown correctly for display', () => {
      const breakdown = {
        subtotal: 100.00,
        jurisdictions: [
          {
            code: 'NY_SALES',
            name: 'NY Sales Tax',
            type: 'state',
            rate: 0.08,
            taxableAmount: 100.00,
            taxAmount: 8.00
          }
        ],
        totalTaxAmount: 8.00,
        totalAmount: 108.00
      }

      const formatted = taxCalculationService.formatTaxBreakdown(breakdown)

      expect(formatted).toContain('Subtotal: $100.00')
      expect(formatted).toContain('NY Sales Tax (8.00%): $8.00')
      expect(formatted).toContain('Total Tax: $8.00')
      expect(formatted).toContain('Total: $108.00')
    })

    it('should include exempt amount when present', () => {
      const breakdown = {
        subtotal: 100.00,
        jurisdictions: [],
        totalTaxAmount: 0.00,
        totalAmount: 100.00,
        exemptAmount: 25.00
      }

      const formatted = taxCalculationService.formatTaxBreakdown(breakdown)

      expect(formatted).toContain('Tax Exempt: $25.00')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty line items', () => {
      const result = taxCalculationService.fallbackTaxCalculation({
        subtotal: 0,
        storeZipCode: '10001',
        storeState: 'NY',
        lineItems: []
      })

      expect(result.totalTaxAmount).toBe(0)
      expect(result.totalAmount).toBe(0)
    })

    it('should handle very large amounts', () => {
      const result = taxCalculationService.fallbackTaxCalculation({
        subtotal: 999999.99,
        storeZipCode: '10001',
        storeState: 'NY',
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: 999999.99,
            isTaxExempt: false
          }
        ]
      })

      expect(result.totalTaxAmount).toBeCloseTo(999999.99 * 0.08, 2)
    })

    it('should handle negative amounts gracefully', () => {
      const result = taxCalculationService.fallbackTaxCalculation({
        subtotal: -100.00,
        storeZipCode: '10001',
        storeState: 'NY',
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: -100.00,
            isTaxExempt: false
          }
        ]
      })

      // Current implementation only processes positive amounts, so negative amounts result in 0 tax
      // This might be a business logic issue to address separately
      expect(result.totalTaxAmount).toBe(0)
      expect(result.totalAmount).toBe(-100.00)
    })

    it('should handle decimal precision correctly', () => {
      const result = taxCalculationService.fallbackTaxCalculation({
        subtotal: 33.33,
        storeZipCode: '10001',
        storeState: 'NY',
        lineItems: [
          {
            productId: 'prod-1',
            category: 'general',
            amount: 33.33,
            isTaxExempt: false
          }
        ]
      })

      // Should handle decimal precision without floating point errors
      const expectedTax = 33.33 * 0.08
      expect(result.totalTaxAmount).toBeCloseTo(expectedTax, 2)
      expect(result.totalAmount).toBeCloseTo(33.33 + expectedTax, 2)
    })
  })

  describe('Performance Tests', () => {
    it('should calculate tax for large number of line items efficiently', () => {
      const lineItems = []
      for (let i = 0; i < 1000; i++) {
        lineItems.push({
          productId: `prod-${i}`,
          category: i % 2 === 0 ? 'general' : 'tobacco',
          amount: 10.00,
          isTaxExempt: false,
          specialTaxCategory: i % 2 === 0 ? undefined : 'tobacco'
        })
      }

      const startTime = Date.now()
      const result = taxCalculationService.fallbackTaxCalculation({
        subtotal: 10000.00,
        storeZipCode: '10001',
        storeState: 'NY',
        lineItems
      })
      const endTime = Date.now()

      // Should complete within 100ms for 1000 items
      expect(endTime - startTime).toBeLessThan(100)
      expect(result.totalTaxAmount).toBeGreaterThan(0)
    })
  })

  describe('Complex Tax Scenarios', () => {
    it('should handle mixed product categories with different tax rules', () => {
      const complexRequest = {
        subtotal: 500.00,
        storeZipCode: '90210',
        storeState: 'CA',
        lineItems: [
          {
            productId: 'food-1',
            category: 'food',
            amount: 100.00,
            isTaxExempt: false
          },
          {
            productId: 'tobacco-1',
            category: 'tobacco',
            amount: 200.00,
            isTaxExempt: false,
            specialTaxCategory: 'tobacco'
          },
          {
            productId: 'general-1',
            category: 'general',
            amount: 150.00,
            isTaxExempt: false
          },
          {
            productId: 'exempt-1',
            category: 'medical',
            amount: 50.00,
            isTaxExempt: true
          }
        ]
      }

      const result = taxCalculationService.fallbackTaxCalculation(complexRequest)

      // CA rates: 7.5% sales, 15% tobacco
      // Taxable: $100 + $200 + $150 = $450 for sales tax
      // Tobacco: $200 for both sales (7.5%) and special (15%) tax
      // Exempt: $50

      const expectedSalesTax = (100.00 + 150.00) * 0.075 // Regular items
      const expectedTobaccoSalesTax = 200.00 * 0.075 // Tobacco sales tax
      const expectedTobaccoSpecialTax = 200.00 * 0.15 // Tobacco special tax
      const expectedTotalTax = expectedSalesTax + expectedTobaccoSalesTax + expectedTobaccoSpecialTax

      expect(result.exemptAmount).toBe(50.00)
      expect(result.totalTaxAmount).toBeCloseTo(expectedTotalTax, 2)
    })
  })
})