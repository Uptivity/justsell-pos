import { api } from './api'

export interface AgeVerificationData {
  customerId?: string
  transactionId?: string
  idType: 'drivers_license' | 'state_id' | 'passport' | 'military_id'
  idNumber: string
  idIssuingState?: string
  idExpirationDate: string
  customerDob: string
  calculatedAge: number
  verificationMethod: 'manual' | 'scanner' | 'digital'
  scannerData?: {
    model?: string
    softwareVersion?: string
    confidenceScore?: number
    rawData?: any
  }
  employeeId: string
  storeId: string
}

export interface AgeVerificationResult {
  isVerified: boolean
  verificationId: string
  calculatedAge: number
  minAge: number
  reasonForDenial?: string
  requiresManagerOverride?: boolean
  complianceWarnings?: string[]
}

export interface ManagerOverride {
  verificationId: string
  managerId: string
  reason: string
  notes?: string
}

export const ageVerificationService = {
  // Verify customer age
  async verifyAge(data: AgeVerificationData): Promise<AgeVerificationResult> {
    try {
      // Calculate age from DOB
      const birthDate = new Date(data.customerDob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      // Check if ID is expired
      const expirationDate = new Date(data.idExpirationDate)
      const isExpired = expirationDate < today

      // Compliance checks
      const warnings: string[] = []
      
      if (isExpired) {
        warnings.push('ID has expired')
      }

      if (age < 18) {
        warnings.push('Customer is under 18')
      }

      if (age >= 18 && age < 21) {
        warnings.push('Customer is under 21 (tobacco age restriction)')
      }

      // Determine verification result
      const minAge = 21 // Tobacco age requirement
      const isVerified = age >= minAge && !isExpired
      
      let reasonForDenial: string | undefined
      if (age < minAge) {
        reasonForDenial = `Customer age (${age}) is below minimum age requirement (${minAge})`
      } else if (isExpired) {
        reasonForDenial = 'Expired identification document'
      }

      // Create verification log
      const response = await api.post('/api/age-verification', {
        ...data,
        calculatedAge: age,
        isVerified,
        reasonForDenial,
        complianceWarnings: warnings
      })

      return {
        isVerified,
        verificationId: response.data.verificationId,
        calculatedAge: age,
        minAge,
        reasonForDenial,
        requiresManagerOverride: !isVerified && age >= 18,
        complianceWarnings: warnings
      }
    } catch (error) {
      console.error('Age verification error:', error)
      throw new Error('Age verification failed')
    }
  },

  // Process manager override
  async processManagerOverride(override: ManagerOverride): Promise<boolean> {
    try {
      await api.post('/api/age-verification/override', override)
      return true
    } catch (error) {
      console.error('Manager override error:', error)
      return false
    }
  },

  // Get verification history
  async getVerificationHistory(customerId?: string, days = 30) {
    try {
      const response = await api.get('/api/age-verification/history', {
        params: { customerId, days }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching verification history:', error)
      return []
    }
  },

  // Validate ID format
  validateIdFormat(idType: string, idNumber: string, state?: string): boolean {
    const cleanId = idNumber.replace(/\s+/g, '').toUpperCase()

    switch (idType) {
      case 'drivers_license':
      case 'state_id':
        // State ID formats vary widely, basic validation only
        return cleanId.length >= 6 && cleanId.length <= 15

      case 'passport':
        // US passport format: 9 characters (letters and numbers)
        return /^[A-Z0-9]{9}$/.test(cleanId)

      case 'military_id':
        // Basic military ID validation
        return cleanId.length >= 8 && cleanId.length <= 12

      default:
        return false
    }
  },

  // Calculate age from date string
  calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  },

  // Check if ID is expired
  isIdExpired(expirationDate: string): boolean {
    return new Date(expirationDate) < new Date()
  },

  // Mock ID scanner integration
  async scanId(scannerType: 'barcode' | 'magnetic' | 'rfid'): Promise<{
    success: boolean
    data?: {
      idType: string
      idNumber: string
      firstName: string
      lastName: string
      dateOfBirth: string
      expirationDate: string
      issuingState: string
      address?: string
    }
    error?: string
  }> {
    // Simulate scanner processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock successful scan (80% success rate)
    if (Math.random() > 0.2) {
      return {
        success: true,
        data: {
          idType: 'drivers_license',
          idNumber: 'DL123456789',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-05-15',
          expirationDate: '2025-05-15',
          issuingState: 'NY',
          address: '123 Main St, Anytown, NY 12345'
        }
      }
    } else {
      return {
        success: false,
        error: 'Failed to read ID. Please try again or enter information manually.'
      }
    }
  },

  // Get state-specific compliance rules
  getStateCompliance(state: string) {
    const stateRules: Record<string, {
      tobaccoAge: number
      acceptableIds: string[]
      specialRequirements: string[]
    }> = {
      'NY': {
        tobaccoAge: 21,
        acceptableIds: ['drivers_license', 'state_id', 'passport'],
        specialRequirements: ['Must be valid (not expired)', 'Photo must be clearly visible']
      },
      'CA': {
        tobaccoAge: 21,
        acceptableIds: ['drivers_license', 'state_id', 'passport', 'military_id'],
        specialRequirements: ['Must be valid (not expired)', 'Real ID compliant preferred']
      },
      'TX': {
        tobaccoAge: 21,
        acceptableIds: ['drivers_license', 'state_id', 'passport', 'military_id'],
        specialRequirements: ['Must be valid (not expired)', 'Out-of-state IDs require additional verification']
      }
    }

    return stateRules[state] || {
      tobaccoAge: 21,
      acceptableIds: ['drivers_license', 'state_id', 'passport'],
      specialRequirements: ['Must be valid (not expired)']
    }
  }
}