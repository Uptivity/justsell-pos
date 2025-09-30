import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import crypto from 'crypto'
import { prisma } from '../../shared/utils/database'

// Security event types for audit logging
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_ATTACK_ATTEMPTED = 'CSRF_ATTACK_ATTEMPTED',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  PAYMENT_VALIDATION_FAILED = 'PAYMENT_VALIDATION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
}

// Security event logging function
export async function logSecurityEvent(
  eventType: SecurityEventType,
  userId: string | undefined,
  ipAddress: string,
  userAgent: string | undefined,
  details: any
): Promise<void> {
  try {
    // Note: AuditLog model needs to be added to Prisma schema
    console.log('Security Event:', {
      eventType,
      userId,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date().toISOString()
    })
    // await prisma.auditLog.create({
    //   data: {
    //     eventType: 'SECURITY_EVENT',
    //     entityType: 'SYSTEM',
    //     entityId: 'security-system',
    //     userId: userId || null,
    //     ipAddress,
    //     userAgent: userAgent || '',
    //     eventData: {
    //       securityEventType: eventType,
    //       timestamp: new Date().toISOString(),
    //       ...details
    //     },
    //     severity: 'HIGH'
    //   }
    // })
  } catch (error) {
    console.error('Failed to log security event:', error)
    // Never let security logging failures break the application
  }
}

/**
 * Comprehensive security headers middleware using Helmet
 * Implements OWASP recommended security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})

/**
 * Rate limiting configurations for different endpoint types
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      undefined,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        endpoint: req.originalUrl,
        method: req.method,
        windowMs: 15 * 60 * 1000,
        maxAttempts: 5
      }
    )
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes'
    })
  }
})

export const transactionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Maximum 10 transactions per minute
  message: {
    error: 'Transaction rate limit exceeded',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      req.user?.id,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        endpoint: req.originalUrl,
        method: req.method,
        windowMs: 1 * 60 * 1000,
        maxAttempts: 10,
        userId: req.user?.id
      }
    )
    res.status(429).json({
      error: 'Transaction rate limit exceeded',
      retryAfter: '1 minute'
    })
  }
})

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests per window
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req: Request, res: Response) => {
    await logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      req.user?.id,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        endpoint: req.originalUrl,
        method: req.method,
        windowMs: 15 * 60 * 1000,
        maxAttempts: 100
      }
    )
    res.status(429).json({
      error: 'API rate limit exceeded',
      retryAfter: '15 minutes'
    })
  }
})

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */
export const csrfProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const token = req.headers['x-csrf-token'] as string
  const sessionToken = req.headers['x-session-token'] as string

  if (!token || !sessionToken) {
    await logSecurityEvent(
      SecurityEventType.CSRF_ATTACK_ATTEMPTED,
      req.user?.id,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        missingToken: !token,
        missingSessionToken: !sessionToken,
        endpoint: req.originalUrl
      }
    )
    res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING'
    })
    return
  }

  // Validate CSRF token format and authenticity
  if (!isValidCSRFToken(token, sessionToken)) {
    await logSecurityEvent(
      SecurityEventType.CSRF_ATTACK_ATTEMPTED,
      req.user?.id,
      req.ip || 'unknown',
      req.get('User-Agent'),
      {
        invalidToken: true,
        endpoint: req.originalUrl,
        providedToken: token.substring(0, 8) + '...' // Only log partial token
      }
    )
    res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    })
    return
  }

  next()
}

/**
 * Validate CSRF token using HMAC
 */
function isValidCSRFToken(token: string, sessionToken: string): boolean {
  try {
    const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
    const expectedToken = crypto
      .createHmac('sha256', secret)
      .update(sessionToken)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  } catch (error) {
    return false
  }
}

/**
 * Generate CSRF token for session
 */
export function generateCSRFToken(sessionToken: string): string {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
  return crypto
    .createHmac('sha256', secret)
    .update(sessionToken)
    .digest('hex')
}

/**
 * Input validation and sanitization middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate request size
    const contentLength = req.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      res.status(413).json({
        error: 'Request too large',
        code: 'REQUEST_TOO_LARGE'
      })
      return
    }

    // Sanitize and validate common injection patterns
    const body = JSON.stringify(req.body)
    const suspiciousPatterns = [
      /<script.*?>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /union.*select/gi,
      /drop.*table/gi,
      /insert.*into/gi,
      /delete.*from/gi
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(body)) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_REQUEST,
          req.user?.id,
          req.ip || 'unknown',
          req.get('User-Agent'),
          {
            suspiciousPattern: pattern.source,
            endpoint: req.originalUrl,
            bodyPreview: body.substring(0, 100)
          }
        )
        res.status(400).json({
          error: 'Invalid request content',
          code: 'INVALID_CONTENT'
        })
        return
      }
    }

    next()
  } catch (error) {
    res.status(400).json({
      error: 'Request validation failed',
      code: 'VALIDATION_ERROR'
    })
  }
}

/**
 * Transaction integrity validation middleware
 * Validates transaction data integrity using checksums
 */
export const validateTransactionIntegrity = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { transactionData, integrity } = req.body

    if (!transactionData || !integrity) {
      res.status(400).json({
        error: 'Transaction integrity data required',
        code: 'INTEGRITY_DATA_MISSING'
      })
      return
    }

    const calculatedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(transactionData) + process.env.INTEGRITY_SECRET)
      .digest('hex')

    if (calculatedChecksum !== integrity.checksum) {
      logSecurityEvent(
        SecurityEventType.PAYMENT_VALIDATION_FAILED,
        req.user?.id,
        req.ip || 'unknown',
        req.get('User-Agent'),
        {
          reason: 'Integrity checksum mismatch',
          endpoint: req.originalUrl,
          expectedChecksum: calculatedChecksum.substring(0, 8) + '...',
          providedChecksum: integrity.checksum?.substring(0, 8) + '...'
        }
      )
      res.status(400).json({
        error: 'Transaction integrity validation failed',
        code: 'INTEGRITY_VALIDATION_FAILED'
      })
      return
    }

    next()
  } catch (error) {
    res.status(500).json({
      error: 'Integrity validation error',
      code: 'INTEGRITY_ERROR'
    })
  }
}

/**
 * Payment data sanitization for PCI-DSS compliance
 */
export const sanitizePaymentData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.body.paymentData) {
      const sanitized = { ...req.body }

      // Remove or mask sensitive payment data
      if (sanitized.paymentData.cardNumber) {
        // Mask all but last 4 digits
        const cardNumber = sanitized.paymentData.cardNumber.toString()
        sanitized.paymentData.cardNumber = '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4)
      }

      // Remove CVV completely from request body for PCI compliance
      delete sanitized.paymentData.cvv
      delete sanitized.paymentData.securityCode

      // Remove expiry dates for stored data
      delete sanitized.paymentData.expiryMonth
      delete sanitized.paymentData.expiryYear

      req.body = sanitized
    }

    next()
  } catch (error) {
    res.status(500).json({
      error: 'Payment data sanitization error',
      code: 'PAYMENT_SANITIZATION_ERROR'
    })
  }
}

/**
 * Fraud detection middleware
 * Analyzes transaction patterns for suspicious activity
 */
export const fraudDetection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { totalAmount, customerId } = req.body
    const userId = req.user?.id
    const userAgent = req.get('User-Agent')
    const ipAddress = req.ip || 'unknown'

    let riskScore = 0
    const riskFactors: string[] = []

    // Check for unusually large transactions
    if (totalAmount > 1000) {
      riskScore += 30
      riskFactors.push('Large transaction amount')
    }

    // Check for rapid successive transactions
    const recentTransactions = await prisma.transaction.count({
      where: {
        employeeId: userId,
        transactionDate: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    })

    if (recentTransactions >= 5) {
      riskScore += 40
      riskFactors.push('Rapid successive transactions')
    }

    // Check for unusual hours (outside 8 AM - 10 PM)
    const hour = new Date().getHours()
    if (hour < 8 || hour > 22) {
      riskScore += 20
      riskFactors.push('Transaction outside normal hours')
    }

    // Check for new IP addresses for this user
    if (userId) {
      // Note: AuditLog model needs to be added to schema
      // const ipHistory = await prisma.auditLog.findFirst({
      //   where: {
      //     userId,
      //     ipAddress,
      //     eventType: 'TRANSACTION_CREATED'
      //   }
      // })

      // if (!ipHistory) {
      //   riskScore += 25
      //   riskFactors.push('New IP address for user')
      // }
    }

    // If high risk score, require additional verification
    if (riskScore >= 70) {
      await logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST,
        userId,
        ipAddress,
        userAgent,
        {
          riskScore,
          riskFactors,
          transactionAmount: totalAmount,
          endpoint: req.originalUrl
        }
      )

      res.status(400).json({
        error: 'Transaction requires additional verification',
        code: 'ADDITIONAL_VERIFICATION_REQUIRED',
        riskScore,
        requiresManagerApproval: true
      })
      return
    }

    // Add risk score to request for logging
    req.body._riskScore = riskScore
    req.body._riskFactors = riskFactors

    next()
  } catch (error) {
    console.error('Fraud detection error:', error)
    // Don't block transactions due to fraud detection errors
    next()
  }
}

/**
 * Secure request logging middleware
 * Logs all requests while sanitizing sensitive data
 */
export const secureRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now()

  res.on('finish', async () => {
    const duration = Date.now() - startTime

    try {
      // Create sanitized request log
      const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('content-length'),
        userId: req.user?.id || null
      }

      // Only log request body for non-sensitive endpoints
      const sensitiveEndpoints = ['/api/auth/login', '/api/transactions', '/api/payments']
      const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint =>
        req.originalUrl.includes(endpoint)
      )

      if (!isSensitiveEndpoint && req.method === 'POST') {
        (logData as any).requestBody = sanitizeForLog(req.body)
      }

      // Note: AuditLog model needs to be added to schema
      console.log('API Request:', logData)
      // await prisma.auditLog.create({
      //   data: {
      //     eventType: 'API_REQUEST',
      //     entityType: 'SYSTEM',
      //     entityId: req.originalUrl,
      //     userId: req.user?.id || null,
      //     ipAddress: req.ip || 'unknown',
      //     userAgent: req.get('User-Agent') || '',
      //     eventData: logData,
      //     severity: res.statusCode >= 400 ? 'HIGH' : 'LOW'
      //   }
      // })
    } catch (error) {
      console.error('Request logging error:', error)
    }
  })

  next()
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
function sanitizeForLog(data: any): any {
  const sanitized = JSON.parse(JSON.stringify(data))

  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'cardNumber', 'cvv', 'securityCode',
    'ssn', 'socialSecurity', 'accountNumber', 'routingNumber'
  ]

  function removeSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj

    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object') {
        obj[key] = removeSensitiveData(obj[key])
      }
    }

    return obj
  }

  return removeSensitiveData(sanitized)
}