import { auditLoggingService } from '../../../shared/services/auditLogging'

// Mock the api module
jest.mock('../../../shared/services/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn()
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)'
  }
})

const { api } = require('../../../shared/services/api')

describe('Audit Logging Service - CRITICAL COMPLIANCE TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    api.post.mockResolvedValue({ data: { success: true } })
  })

  describe('Core Audit Logging - COMPLIANCE CRITICAL', () => {
    it('should log audit events with complete metadata', async () => {
      const auditEntry = {
        userId: 'user-123',
        userRole: 'CASHIER',
        storeId: 'store-456',
        action: 'transaction_created' as const,
        entityType: 'transaction' as const,
        entityId: 'trans-789',
        details: { amount: 25.99, paymentMethod: 'CASH' },
        severity: 'low' as const
      }

      await auditLoggingService.logEvent(auditEntry)

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        ...auditEntry,
        timestamp: expect.any(String),
        metadata: expect.objectContaining({
          clientVersion: '1.0.0',
          userAgent: 'Mozilla/5.0 (Test Browser)'
        })
      }))
    })

    it('should store audit entries locally for immediate access', async () => {
      const auditEntry = {
        userId: 'user-123',
        userRole: 'CASHIER',
        storeId: 'store-456',
        action: 'login' as const,
        entityType: 'user' as const,
        details: {},
        severity: 'low' as const
      }

      await auditLoggingService.logEvent(auditEntry)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('audit_logs', expect.any(String))
    })

    it('should handle audit logging failures gracefully', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'))

      const auditEntry = {
        userId: 'user-123',
        userRole: 'CASHIER',
        storeId: 'store-456',
        action: 'login' as const,
        entityType: 'user' as const,
        details: {},
        severity: 'low' as const
      }

      // Should not throw error
      await expect(auditLoggingService.logEvent(auditEntry)).resolves.toBeUndefined()

      // Should store failed log for retry
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('failed_audit_logs', expect.any(String))
    })
  })

  describe('Authentication Event Logging', () => {
    it('should log successful login events', async () => {
      await auditLoggingService.logAuthEvent('login', 'user-123', {
        userRole: 'CASHIER',
        storeId: 'store-456',
        ipAddress: '192.168.1.1'
      })

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'login',
        entityType: 'user',
        entityId: 'user-123',
        severity: 'low',
        details: expect.objectContaining({
          userRole: 'CASHIER',
          storeId: 'store-456',
          ipAddress: '192.168.1.1'
        })
      }))
    })

    it('should log failed login attempts with higher severity', async () => {
      await auditLoggingService.logAuthEvent('login_failed', 'user-123', {
        attemptedUsername: 'admin',
        failureReason: 'Invalid password'
      })

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'login_failed',
        severity: 'medium',
        details: expect.objectContaining({
          attemptedUsername: 'admin',
          failureReason: 'Invalid password'
        })
      }))
    })

    it('should log logout events', async () => {
      await auditLoggingService.logAuthEvent('logout', 'user-123')

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'logout',
        severity: 'low'
      }))
    })
  })

  describe('Transaction Event Logging - FINANCIAL CRITICAL', () => {
    it('should log transaction creation with complete details', async () => {
      await auditLoggingService.logTransactionEvent(
        'transaction_created',
        'trans-123',
        'user-456',
        'CASHIER',
        'store-789',
        {
          amount: 125.50,
          paymentMethod: 'CARD',
          itemCount: 3,
          customerId: 'cust-111'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: 'trans-123',
        severity: 'low',
        details: expect.objectContaining({
          transactionId: 'trans-123',
          amount: 125.50,
          paymentMethod: 'CARD',
          itemCount: 3,
          customerId: 'cust-111'
        })
      }))
    })

    it('should log transaction voids with medium severity', async () => {
      await auditLoggingService.logTransactionEvent(
        'transaction_voided',
        'trans-123',
        'user-456',
        'MANAGER',
        'store-789',
        {
          voidReason: 'Customer changed mind',
          originalAmount: 125.50
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'transaction_voided',
        severity: 'medium',
        details: expect.objectContaining({
          voidReason: 'Customer changed mind',
          originalAmount: 125.50
        })
      }))
    })

    it('should log refunds with proper tracking', async () => {
      await auditLoggingService.logTransactionEvent(
        'transaction_refunded',
        'trans-123',
        'user-456',
        'MANAGER',
        'store-789',
        {
          refundAmount: 50.00,
          refundReason: 'Defective product',
          refundMethod: 'ORIGINAL_PAYMENT'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'transaction_refunded',
        severity: 'medium'
      }))
    })
  })

  describe('Age Verification Logging - COMPLIANCE CRITICAL', () => {
    it('should log successful age verification', async () => {
      await auditLoggingService.logAgeVerificationEvent(
        'age_verification_passed',
        'verify-123',
        'user-456',
        'CASHIER',
        'store-789',
        {
          customerId: 'cust-111',
          customerAge: 25,
          idType: 'drivers_license',
          verificationMethod: 'manual'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'age_verification_passed',
        entityType: 'age_verification',
        severity: 'medium'
      }))
    })

    it('should log failed age verification with high severity', async () => {
      await auditLoggingService.logAgeVerificationEvent(
        'age_verification_failed',
        'verify-123',
        'user-456',
        'CASHIER',
        'store-789',
        {
          customerId: 'cust-111',
          customerAge: 19,
          failureReason: 'Under minimum age'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'age_verification_failed',
        severity: 'high'
      }))
    })

    it('should log manager overrides with complete details', async () => {
      await auditLoggingService.logAgeVerificationEvent(
        'manager_override_applied',
        'verify-123',
        'manager-789',
        'MANAGER',
        'store-789',
        {
          originalCashier: 'user-456',
          overrideReason: 'Customer appears mature',
          customerAge: 20,
          managerNotes: 'Additional verification performed'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'manager_override_applied',
        severity: 'medium',
        details: expect.objectContaining({
          originalCashier: 'user-456',
          overrideReason: 'Customer appears mature'
        })
      }))
    })
  })

  describe('Payment Event Logging - PCI COMPLIANCE', () => {
    it('should log payment processing with sanitized data', async () => {
      await auditLoggingService.logPaymentEvent(
        'payment_processed',
        'pay-123',
        'user-456',
        'CASHIER',
        'store-789',
        {
          amount: 125.50,
          paymentMethod: 'CARD',
          cardNumber: '4532015112830366',
          cvv: '123',
          authCode: 'ABC123'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'payment_processed',
        entityType: 'payment',
        severity: 'low',
        details: expect.objectContaining({
          amount: 125.50,
          paymentMethod: 'CARD',
          cardNumber: '************0366', // Should be masked
          authCode: 'ABC123'
          // cvv should be removed
        })
      }))

      // Verify CVV was removed
      const callArgs = api.post.mock.calls[0][1]
      expect(callArgs.details.cvv).toBeUndefined()
    })

    it('should log payment failures with medium severity', async () => {
      await auditLoggingService.logPaymentEvent(
        'payment_failed',
        'pay-123',
        'user-456',
        'CASHIER',
        'store-789',
        {
          amount: 125.50,
          failureReason: 'Insufficient funds',
          cardNumber: '4532015112830366'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'payment_failed',
        severity: 'medium'
      }))
    })
  })

  describe('System Error Logging', () => {
    it('should log system errors with complete context', async () => {
      const error = new Error('Database connection failed')
      error.stack = 'Error: Database connection failed\n    at line 1'

      await auditLoggingService.logSystemError(
        error,
        'user-123',
        'CASHIER',
        'store-456',
        { operation: 'transaction_save', attemptCount: 3 }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'system_error',
        entityType: 'system',
        severity: 'high',
        details: expect.objectContaining({
          errorMessage: 'Database connection failed',
          errorStack: 'Error: Database connection failed\n    at line 1',
          context: { operation: 'transaction_save', attemptCount: 3 }
        })
      }))
    })

    it('should handle system errors without user context', async () => {
      const error = new Error('Background process failed')

      await auditLoggingService.logSystemError(error)

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        userId: 'system',
        userRole: 'system',
        storeId: 'system',
        action: 'system_error',
        severity: 'high'
      }))
    })
  })

  describe('Compliance Violation Logging', () => {
    it('should log compliance violations with critical severity', async () => {
      await auditLoggingService.logComplianceViolation(
        'UNDERAGE_SALE_ATTEMPTED',
        'Attempted sale to customer under 21',
        'user-123',
        'CASHIER',
        'store-456',
        'trans-789',
        {
          customerAge: 19,
          productType: 'tobacco',
          preventionAction: 'Sale blocked by system'
        }
      )

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'compliance_violation',
        entityType: 'system',
        entityId: 'trans-789',
        severity: 'critical',
        details: expect.objectContaining({
          violationType: 'UNDERAGE_SALE_ATTEMPTED',
          description: 'Attempted sale to customer under 21',
          customerAge: 19,
          productType: 'tobacco'
        })
      }))
    })
  })

  describe('Data Sanitization - PCI COMPLIANCE', () => {
    it('should mask credit card numbers correctly', () => {
      expect(auditLoggingService.maskCardNumber('4532015112830366')).toBe('************0366')
      expect(auditLoggingService.maskCardNumber('378282246310005')).toBe('***********0005')
      expect(auditLoggingService.maskCardNumber('123')).toBe('****') // Too short
    })

    it('should mask account numbers correctly', () => {
      expect(auditLoggingService.maskAccountNumber('1234567890')).toBe('******7890')
      expect(auditLoggingService.maskAccountNumber('123')).toBe('****') // Too short
    })

    it('should sanitize payment data comprehensively', () => {
      const paymentDetails = {
        cardNumber: '4532015112830366',
        cvv: '123',
        accountNumber: '9876543210',
        authCode: 'ABC123',
        amount: 125.50
      }

      const sanitized = auditLoggingService.sanitizePaymentData(paymentDetails)

      expect(sanitized.cardNumber).toBe('************0366')
      expect(sanitized.cvv).toBeUndefined() // Should be removed
      expect(sanitized.accountNumber).toBe('******3210')
      expect(sanitized.authCode).toBe('ABC123') // Should remain
      expect(sanitized.amount).toBe(125.50) // Should remain
    })
  })

  describe('Local Storage Management', () => {
    it('should store audit entries locally with size limit', () => {
      const mockExistingLogs = Array(999).fill({
        id: 'existing',
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'test'
      })

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockExistingLogs))

      const newEntry = {
        id: 'new-entry',
        timestamp: '2024-01-02T00:00:00.000Z',
        userId: 'user-123',
        action: 'test',
        severity: 'low'
      }

      auditLoggingService.storeLocalAuditEntry(newEntry as any)

      // Should store only 1000 entries max
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(storedData).toHaveLength(1000)
      expect(storedData[0]).toEqual(newEntry) // New entry should be first
    })

    it('should retrieve local logs with filtering', () => {
      const mockLogs = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          userId: 'user-123',
          action: 'login',
          severity: 'low'
        },
        {
          timestamp: '2024-01-02T00:00:00.000Z',
          userId: 'user-456',
          action: 'transaction_created',
          severity: 'low'
        },
        {
          timestamp: '2024-01-03T00:00:00.000Z',
          userId: 'user-123',
          action: 'logout',
          severity: 'low'
        }
      ]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockLogs))

      const filtered = auditLoggingService.getLocalAuditLogs({
        userId: 'user-123',
        startDate: '2024-01-01T00:00:00.000Z',
        limit: 10
      })

      expect(filtered).toHaveLength(2)
      expect(filtered[0].userId).toBe('user-123')
      expect(filtered[1].userId).toBe('user-123')
    })
  })

  describe('Failed Log Retry Mechanism', () => {
    it('should store failed logs for retry', () => {
      const failedEntry = {
        userId: 'user-123',
        action: 'test',
        severity: 'low'
      }

      auditLoggingService.handleAuditLoggingFailure(failedEntry as any)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'failed_audit_logs',
        expect.stringContaining('failedAt')
      )
    })

    it('should retry failed logs successfully', async () => {
      const failedLogs = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          userId: 'user-123',
          action: 'test',
          failedAt: '2024-01-01T01:00:00.000Z'
        }
      ]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(failedLogs))
      api.post.mockResolvedValueOnce({ data: { success: true } })

      await auditLoggingService.retryFailedLogs()

      expect(api.post).toHaveBeenCalledWith('/api/audit/log', failedLogs[0])
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('failed_audit_logs', '[]')
    })

    it('should handle partial retry failures', async () => {
      const failedLogs = [
        { timestamp: '2024-01-01T00:00:00.000Z', action: 'test1' },
        { timestamp: '2024-01-02T00:00:00.000Z', action: 'test2' }
      ]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(failedLogs))
      api.post
        .mockResolvedValueOnce({ data: { success: true } }) // First succeeds
        .mockRejectedValueOnce(new Error('Still failing')) // Second fails

      await auditLoggingService.retryFailedLogs()

      // Should remove only the successful retry
      const remainingLogs = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(remainingLogs).toHaveLength(1)
      expect(remainingLogs[0].action).toBe('test2')
    })
  })

  describe('Query and Export Functions', () => {
    it('should query audit logs from API', async () => {
      const mockLogs = [
        { id: '1', action: 'login', timestamp: '2024-01-01T00:00:00.000Z' }
      ]

      api.get.mockResolvedValueOnce({
        data: {
          logs: mockLogs,
          totalCount: 1,
          hasMore: false
        }
      })

      const result = await auditLoggingService.queryLogs({
        startDate: '2024-01-01',
        userId: 'user-123'
      })

      expect(result.logs).toEqual(mockLogs)
      expect(result.totalCount).toBe(1)
      expect(api.get).toHaveBeenCalledWith('/api/audit/query', {
        params: { startDate: '2024-01-01', userId: 'user-123' }
      })
    })

    it('should fallback to local logs on API failure', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'))

      const result = await auditLoggingService.queryLogs({ limit: 10 })

      expect(result.logs).toEqual([]) // Empty local logs
      expect(result.totalCount).toBe(0)
    })

    it('should export audit logs with proper tracking', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })
      api.post.mockResolvedValueOnce({ data: mockBlob })

      const result = await auditLoggingService.exportAuditLogs(
        '2024-01-01',
        '2024-01-31',
        'store-123',
        'csv'
      )

      expect(result).toEqual(mockBlob)
      expect(api.post).toHaveBeenCalledWith(
        '/api/audit/export',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          storeId: 'store-123',
          format: 'csv'
        },
        { responseType: 'blob' }
      )

      // Should also log the export event
      expect(api.post).toHaveBeenCalledWith('/api/audit/log', expect.objectContaining({
        action: 'data_export'
      }))
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      // Should not throw error
      expect(() => {
        auditLoggingService.storeLocalAuditEntry({
          timestamp: '2024-01-01T00:00:00.000Z',
          userId: 'user-123'
        } as any)
      }).not.toThrow()
    })

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const result = auditLoggingService.getLocalAuditLogs()

      expect(result).toEqual([])
    })

    it('should handle large audit entries', async () => {
      const largeDetails = {}
      for (let i = 0; i < 1000; i++) {
        largeDetails[`field${i}`] = `value${i}`.repeat(100)
      }

      const largeEntry = {
        userId: 'user-123',
        userRole: 'CASHIER',
        storeId: 'store-456',
        action: 'transaction_created' as const,
        entityType: 'transaction' as const,
        details: largeDetails,
        severity: 'low' as const
      }

      // Should handle large entries without errors
      await expect(auditLoggingService.logEvent(largeEntry)).resolves.toBeUndefined()
    })
  })
})