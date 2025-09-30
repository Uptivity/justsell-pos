import { api } from './api'

export interface AuditLogEntry {
  id?: string
  timestamp: string
  userId: string
  userRole: string
  storeId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  details: Record<string, any>
  metadata?: {
    ipAddress?: string
    userAgent?: string
    sessionId?: string
    clientVersion?: string
  }
  severity: AuditSeverity
}

export type AuditAction = 
  // Authentication actions
  | 'login' | 'logout' | 'login_failed' | 'password_changed' | 'account_locked'
  // Product actions
  | 'product_created' | 'product_updated' | 'product_deleted' | 'inventory_adjusted'
  // Customer actions
  | 'customer_created' | 'customer_updated' | 'customer_deleted'
  // Transaction actions
  | 'transaction_created' | 'transaction_voided' | 'transaction_refunded'
  | 'payment_processed' | 'payment_failed' | 'payment_refunded'
  // Age verification actions
  | 'age_verification_passed' | 'age_verification_failed' | 'manager_override_applied'
  // System actions
  | 'system_error' | 'data_export' | 'settings_changed' | 'user_permissions_changed'
  // Compliance actions
  | 'tax_exemption_applied' | 'compliance_violation' | 'audit_report_generated'

export type AuditEntityType = 
  | 'user' | 'product' | 'customer' | 'transaction' | 'payment'
  | 'age_verification' | 'tax_calculation' | 'system' | 'report'

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface AuditQuery {
  startDate?: string
  endDate?: string
  userId?: string
  storeId?: string
  action?: AuditAction
  entityType?: AuditEntityType
  severity?: AuditSeverity
  limit?: number
  offset?: number
}

export const auditLoggingService = {
  // Log an audit event
  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
        metadata: {
          ...entry.metadata,
          clientVersion: '1.0.0',
          userAgent: navigator.userAgent
        }
      }

      // Store locally for immediate access
      this.storeLocalAuditEntry(auditEntry)

      // Send to server
      await api.post('/api/audit/log', auditEntry)
    } catch (error) {
      console.error('Audit logging failed:', error)
      // In production, we might want to store failed logs locally and retry later
      this.handleAuditLoggingFailure(entry)
    }
  },

  // Log authentication events
  async logAuthEvent(
    action: 'login' | 'logout' | 'login_failed',
    userId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      userRole: details.userRole || 'unknown',
      storeId: details.storeId || 'unknown',
      action,
      entityType: 'user',
      entityId: userId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      severity: action === 'login_failed' ? 'medium' : 'low'
    })
  },

  // Log transaction events
  async logTransactionEvent(
    action: 'transaction_created' | 'transaction_voided' | 'transaction_refunded',
    transactionId: string,
    userId: string,
    userRole: string,
    storeId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      userRole,
      storeId,
      action,
      entityType: 'transaction',
      entityId: transactionId,
      details: {
        ...details,
        transactionId,
        timestamp: new Date().toISOString()
      },
      severity: action === 'transaction_created' ? 'low' : 'medium'
    })
  },

  // Log age verification events
  async logAgeVerificationEvent(
    action: 'age_verification_passed' | 'age_verification_failed' | 'manager_override_applied',
    verificationId: string,
    userId: string,
    userRole: string,
    storeId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      userRole,
      storeId,
      action,
      entityType: 'age_verification',
      entityId: verificationId,
      details: {
        ...details,
        verificationId,
        timestamp: new Date().toISOString()
      },
      severity: action === 'age_verification_failed' ? 'high' : 'medium'
    })
  },

  // Log payment events
  async logPaymentEvent(
    action: 'payment_processed' | 'payment_failed' | 'payment_refunded',
    paymentId: string,
    userId: string,
    userRole: string,
    storeId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    // Mask sensitive payment data
    const sanitizedDetails = this.sanitizePaymentData(details)

    await this.logEvent({
      userId,
      userRole,
      storeId,
      action,
      entityType: 'payment',
      entityId: paymentId,
      details: {
        ...sanitizedDetails,
        paymentId,
        timestamp: new Date().toISOString()
      },
      severity: action === 'payment_failed' ? 'medium' : 'low'
    })
  },

  // Log system errors
  async logSystemError(
    error: Error,
    userId?: string,
    userRole?: string,
    storeId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId: userId || 'system',
      userRole: userRole || 'system',
      storeId: storeId || 'system',
      action: 'system_error',
      entityType: 'system',
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        timestamp: new Date().toISOString()
      },
      severity: 'high'
    })
  },

  // Log compliance violations
  async logComplianceViolation(
    violationType: string,
    description: string,
    userId: string,
    userRole: string,
    storeId: string,
    entityId?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent({
      userId,
      userRole,
      storeId,
      action: 'compliance_violation',
      entityType: 'system',
      entityId,
      details: {
        violationType,
        description,
        ...details,
        timestamp: new Date().toISOString()
      },
      severity: 'critical'
    })
  },

  // Query audit logs
  async queryLogs(query: AuditQuery): Promise<{
    logs: AuditLogEntry[]
    totalCount: number
    hasMore: boolean
  }> {
    try {
      const response = await api.get('/api/audit/query', { params: query })
      return response.data
    } catch (error) {
      console.error('Audit query failed:', error)
      return {
        logs: this.getLocalAuditLogs(query),
        totalCount: 0,
        hasMore: false
      }
    }
  },

  // Get audit summary for dashboard
  async getAuditSummary(storeId?: string, days = 30): Promise<{
    totalEvents: number
    criticalEvents: number
    highSeverityEvents: number
    loginEvents: number
    transactionEvents: number
    complianceEvents: number
    recentEvents: AuditLogEntry[]
  }> {
    try {
      const response = await api.get('/api/audit/summary', {
        params: { storeId, days }
      })
      return response.data
    } catch (error) {
      console.error('Audit summary failed:', error)
      return {
        totalEvents: 0,
        criticalEvents: 0,
        highSeverityEvents: 0,
        loginEvents: 0,
        transactionEvents: 0,
        complianceEvents: 0,
        recentEvents: []
      }
    }
  },

  // Export audit logs for compliance
  async exportAuditLogs(
    startDate: string,
    endDate: string,
    storeId?: string,
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await api.post('/api/audit/export', {
        startDate,
        endDate,
        storeId,
        format
      }, {
        responseType: 'blob'
      })

      // Log the export event
      await this.logEvent({
        userId: 'current_user', // Would be filled with actual user ID
        userRole: 'admin',
        storeId: storeId || 'all',
        action: 'data_export',
        entityType: 'report',
        details: {
          exportType: 'audit_logs',
          startDate,
          endDate,
          format,
          timestamp: new Date().toISOString()
        },
        severity: 'medium'
      })

      return response.data
    } catch (error) {
      console.error('Audit export failed:', error)
      throw error
    }
  },

  // Store audit entry locally (for offline capability)
  storeLocalAuditEntry(entry: AuditLogEntry): void {
    try {
      const localLogs = this.getLocalAuditLogs()
      localLogs.unshift(entry)
      
      // Keep only last 1000 entries locally
      const truncatedLogs = localLogs.slice(0, 1000)
      
      localStorage.setItem('audit_logs', JSON.stringify(truncatedLogs))
    } catch (error) {
      console.error('Failed to store local audit entry:', error)
    }
  },

  // Get local audit logs
  getLocalAuditLogs(query: AuditQuery = {}): AuditLogEntry[] {
    try {
      const logsJson = localStorage.getItem('audit_logs')
      if (!logsJson) return []
      
      let logs: AuditLogEntry[] = JSON.parse(logsJson)
      
      // Apply filters
      if (query.startDate) {
        logs = logs.filter(log => log.timestamp >= query.startDate!)
      }
      if (query.endDate) {
        logs = logs.filter(log => log.timestamp <= query.endDate!)
      }
      if (query.userId) {
        logs = logs.filter(log => log.userId === query.userId)
      }
      if (query.action) {
        logs = logs.filter(log => log.action === query.action)
      }
      if (query.severity) {
        logs = logs.filter(log => log.severity === query.severity)
      }
      
      // Apply pagination
      if (query.offset) {
        logs = logs.slice(query.offset)
      }
      if (query.limit) {
        logs = logs.slice(0, query.limit)
      }
      
      return logs
    } catch (error) {
      console.error('Failed to get local audit logs:', error)
      return []
    }
  },

  // Handle audit logging failures
  handleAuditLoggingFailure(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    // Store failed logs for retry later
    try {
      const failedLogs = JSON.parse(localStorage.getItem('failed_audit_logs') || '[]')
      failedLogs.push({
        ...entry,
        timestamp: new Date().toISOString(),
        failedAt: new Date().toISOString()
      })
      
      // Keep only last 100 failed entries
      const truncatedLogs = failedLogs.slice(-100)
      localStorage.setItem('failed_audit_logs', JSON.stringify(truncatedLogs))
    } catch (error) {
      console.error('Failed to store failed audit log:', error)
    }
  },

  // Retry failed audit logs
  async retryFailedLogs(): Promise<void> {
    try {
      const failedLogsJson = localStorage.getItem('failed_audit_logs')
      if (!failedLogsJson) return

      const failedLogs = JSON.parse(failedLogsJson)
      const successfulRetries: string[] = []

      for (const log of failedLogs) {
        try {
          await api.post('/api/audit/log', log)
          successfulRetries.push(log.timestamp)
        } catch (error) {
          console.error('Failed to retry audit log:', error)
        }
      }

      // Remove successfully retried logs
      if (successfulRetries.length > 0) {
        const remainingLogs = failedLogs.filter(
          (log: any) => !successfulRetries.includes(log.timestamp)
        )
        localStorage.setItem('failed_audit_logs', JSON.stringify(remainingLogs))
      }
    } catch (error) {
      console.error('Failed to retry audit logs:', error)
    }
  },

  // Sanitize sensitive data from payment details
  sanitizePaymentData(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details }
    
    // Mask credit card numbers
    if (sanitized.cardNumber) {
      sanitized.cardNumber = this.maskCardNumber(sanitized.cardNumber)
    }
    
    // Remove CVV
    delete sanitized.cvv
    
    // Remove full account numbers
    if (sanitized.accountNumber) {
      sanitized.accountNumber = this.maskAccountNumber(sanitized.accountNumber)
    }
    
    return sanitized
  },

  // Mask card number for logging
  maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '')
    if (cleaned.length < 4) return '****'
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4)
  },

  // Mask account number for logging
  maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length < 4) return '****'
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
  }
}