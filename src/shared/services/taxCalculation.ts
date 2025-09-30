import { api } from './api'

export interface TaxJurisdiction {
  code: string
  name: string
  type: 'federal' | 'state' | 'county' | 'city'
  rate: number
  applicableProducts?: string[] // Product categories this tax applies to
  exemptions?: string[] // Product categories exempt from this tax
  minAmount?: number // Minimum purchase amount for tax to apply
  maxAmount?: number // Maximum tax amount
}

export interface TaxBreakdown {
  subtotal: number
  jurisdictions: {
    code: string
    name: string
    type: string
    rate: number
    taxableAmount: number
    taxAmount: number
  }[]
  totalTaxAmount: number
  totalAmount: number
  exemptAmount?: number
}

export interface TaxCalculationRequest {
  subtotal: number
  storeZipCode: string
  storeState: string
  customerZipCode?: string
  customerState?: string
  lineItems: {
    productId: string
    category: string
    amount: number
    isTaxExempt?: boolean
    specialTaxCategory?: string // tobacco, alcohol, etc.
  }[]
  customerId?: string
  taxExemptCustomer?: boolean
  taxExemptionNumber?: string
}

export const taxCalculationService = {
  // Calculate taxes for a transaction
  async calculateTax(request: TaxCalculationRequest): Promise<TaxBreakdown> {
    try {
      const response = await api.post('/api/tax/calculate', request)
      return response.data
    } catch (error) {
      console.error('Tax calculation error:', error)
      // Fallback to simple calculation
      return this.fallbackTaxCalculation(request)
    }
  },

  // Get tax jurisdictions for a location
  async getTaxJurisdictions(zipCode: string, state: string): Promise<TaxJurisdiction[]> {
    try {
      const response = await api.get('/api/tax/jurisdictions', {
        params: { zipCode, state }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching tax jurisdictions:', error)
      return this.getDefaultJurisdictions(state)
    }
  },

  // Fallback tax calculation (simplified)
  fallbackTaxCalculation(request: TaxCalculationRequest): TaxBreakdown {
    const baseTaxRate = this.getStateTaxRate(request.storeState)
    const specialTaxRate = this.getSpecialTaxRate(request.storeState, 'tobacco')
    
    let regularTaxableAmount = 0
    let specialTaxableAmount = 0
    let exemptAmount = 0

    // Categorize line items
    request.lineItems.forEach(item => {
      if (item.isTaxExempt || request.taxExemptCustomer) {
        exemptAmount += item.amount
      } else if (item.specialTaxCategory === 'tobacco') {
        specialTaxableAmount += item.amount
      } else {
        regularTaxableAmount += item.amount
      }
    })

    const jurisdictions = []
    let totalTaxAmount = 0

    // Regular sales tax
    if (regularTaxableAmount > 0) {
      const regularTax = regularTaxableAmount * baseTaxRate
      jurisdictions.push({
        code: `${request.storeState}_SALES`,
        name: `${request.storeState} Sales Tax`,
        type: 'state',
        rate: baseTaxRate,
        taxableAmount: regularTaxableAmount,
        taxAmount: regularTax
      })
      totalTaxAmount += regularTax
    }

    // Special tobacco tax
    if (specialTaxableAmount > 0) {
      const tobaccoTax = specialTaxableAmount * specialTaxRate
      jurisdictions.push({
        code: `${request.storeState}_TOBACCO`,
        name: `${request.storeState} Tobacco Tax`,
        type: 'state',
        rate: specialTaxRate,
        taxableAmount: specialTaxableAmount,
        taxAmount: tobaccoTax
      })
      totalTaxAmount += tobaccoTax

      // Regular sales tax on tobacco (in addition to special tax)
      const tobaccoSalesTax = specialTaxableAmount * baseTaxRate
      jurisdictions.push({
        code: `${request.storeState}_SALES_TOBACCO`,
        name: `${request.storeState} Sales Tax on Tobacco`,
        type: 'state',
        rate: baseTaxRate,
        taxableAmount: specialTaxableAmount,
        taxAmount: tobaccoSalesTax
      })
      totalTaxAmount += tobaccoSalesTax
    }

    return {
      subtotal: request.subtotal,
      jurisdictions,
      totalTaxAmount,
      totalAmount: request.subtotal + totalTaxAmount,
      exemptAmount: exemptAmount > 0 ? exemptAmount : undefined
    }
  },

  // Get state tax rates (simplified)
  getStateTaxRate(state: string): number {
    const stateTaxRates: Record<string, number> = {
      'AL': 0.04, 'AK': 0.00, 'AZ': 0.056, 'AR': 0.065, 'CA': 0.075,
      'CO': 0.029, 'CT': 0.0635, 'DE': 0.00, 'FL': 0.06, 'GA': 0.04,
      'HI': 0.04, 'ID': 0.06, 'IL': 0.0625, 'IN': 0.07, 'IA': 0.06,
      'KS': 0.065, 'KY': 0.06, 'LA': 0.045, 'ME': 0.055, 'MD': 0.06,
      'MA': 0.0625, 'MI': 0.06, 'MN': 0.0688, 'MS': 0.07, 'MO': 0.0423,
      'MT': 0.00, 'NE': 0.055, 'NV': 0.0685, 'NH': 0.00, 'NJ': 0.0663,
      'NM': 0.0513, 'NY': 0.08, 'NC': 0.0475, 'ND': 0.05, 'OH': 0.0575,
      'OK': 0.045, 'OR': 0.00, 'PA': 0.06, 'RI': 0.07, 'SC': 0.06,
      'SD': 0.045, 'TN': 0.07, 'TX': 0.0625, 'UT': 0.061, 'VT': 0.06,
      'VA': 0.053, 'WA': 0.065, 'WV': 0.06, 'WI': 0.05, 'WY': 0.04
    }
    return stateTaxRates[state] ?? 0.08 // Default 8%
  },

  // Get special tax rates (tobacco, alcohol, etc.)
  getSpecialTaxRate(state: string, category: 'tobacco' | 'alcohol'): number {
    if (category === 'tobacco') {
      // Tobacco tax rates vary significantly by state
      const tobaccoTaxRates: Record<string, number> = {
        'NY': 0.20, // 20% additional tax on tobacco
        'CA': 0.15,
        'TX': 0.10,
        'FL': 0.12,
        'IL': 0.18
      }
      return tobaccoTaxRates[state] || 0.05 // Default 5% tobacco tax
    }
    
    return 0
  },

  // Get default jurisdictions for a state
  getDefaultJurisdictions(state: string): TaxJurisdiction[] {
    const baseTaxRate = this.getStateTaxRate(state)
    const tobaccoTaxRate = this.getSpecialTaxRate(state, 'tobacco')

    return [
      {
        code: `${state}_SALES`,
        name: `${state} Sales Tax`,
        type: 'state',
        rate: baseTaxRate
      },
      {
        code: `${state}_TOBACCO`,
        name: `${state} Tobacco Tax`,
        type: 'state',
        rate: tobaccoTaxRate,
        applicableProducts: ['tobacco', 'vape', 'e-cigarette']
      }
    ]
  },

  // Validate tax exemption
  async validateTaxExemption(exemptionNumber: string, state: string): Promise<{
    valid: boolean
    exemptionType: string
    organizationName?: string
    expirationDate?: string
  }> {
    try {
      const response = await api.post('/api/tax/validate-exemption', {
        exemptionNumber,
        state
      })
      return response.data
    } catch (error) {
      console.error('Tax exemption validation error:', error)
      return {
        valid: false,
        exemptionType: 'unknown'
      }
    }
  },

  // Get tax rate for specific product category
  getTaxRateForCategory(category: string, state: string): number {
    const categoryRates: Record<string, Record<string, number>> = {
      'tobacco': this.getDefaultJurisdictions(state).reduce((acc, j) => {
        if (j.applicableProducts?.includes('tobacco')) {
          acc[j.code] = j.rate
        }
        return acc
      }, {} as Record<string, number>),
      'alcohol': {}, // Alcohol tax rates would go here
      'food': {} // Food tax rates (often reduced or exempt)
    }

    return categoryRates[category]?.[`${state}_${category.toUpperCase()}`] || 0
  },

  // Format tax breakdown for display
  formatTaxBreakdown(breakdown: TaxBreakdown): string {
    const lines: string[] = []
    
    lines.push(`Subtotal: $${breakdown.subtotal.toFixed(2)}`)
    
    if (breakdown.exemptAmount) {
      lines.push(`Tax Exempt: $${breakdown.exemptAmount.toFixed(2)}`)
    }

    breakdown.jurisdictions.forEach(jurisdiction => {
      lines.push(
        `${jurisdiction.name} (${(jurisdiction.rate * 100).toFixed(2)}%): $${jurisdiction.taxAmount.toFixed(2)}`
      )
    })

    lines.push(`Total Tax: $${breakdown.totalTaxAmount.toFixed(2)}`)
    lines.push(`Total: $${breakdown.totalAmount.toFixed(2)}`)

    return lines.join('\n')
  },

  // Check if product category is tax exempt in a state
  isCategoryTaxExempt(category: string, state: string): boolean {
    const exemptCategories: Record<string, string[]> = {
      'MT': ['clothing', 'food'], // Montana exempts clothing and food
      'OR': ['food', 'medicine'], // Oregon exempts food and medicine
      'NH': ['food', 'medicine', 'clothing'] // New Hampshire broader exemptions
    }

    return exemptCategories[state]?.includes(category) || false
  }
}