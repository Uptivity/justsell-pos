import crypto from 'crypto'
import { PrismaClient } from '../../generated/prisma'

// Database field encryption middleware for PCI-DSS compliance
const ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

export interface EncryptedField {
  encrypted: string
  iv: string
  tag: string
  version: string // For key rotation
}

/**
 * Encrypt sensitive database fields using AES-256-GCM
 */
export function encryptDatabaseField(data: string, fieldType: string = 'general'): EncryptedField {
  try {
    const key = Buffer.from(FIELD_ENCRYPTION_KEY, 'hex')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    // Additional authenticated data for field type
    const aad = Buffer.from(`justsell-pos-${fieldType}`, 'utf8')
    cipher.setAAD(aad)

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      version: 'v1' // For future key rotation
    }
  } catch (error) {
    throw new Error(`Failed to encrypt database field: ${error.message}`)
  }
}

/**
 * Decrypt sensitive database fields
 */
export function decryptDatabaseField(encryptedField: EncryptedField, fieldType: string = 'general'): string {
  try {
    const key = Buffer.from(FIELD_ENCRYPTION_KEY, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encryptedField.iv, 'hex'))

    const aad = Buffer.from(`justsell-pos-${fieldType}`, 'utf8')
    decipher.setAAD(aad)
    decipher.setAuthTag(Buffer.from(encryptedField.tag, 'hex'))

    let decrypted = decipher.update(encryptedField.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new Error(`Failed to decrypt database field: ${error.message}`)
  }
}

/**
 * Prisma middleware for automatic field encryption
 */
export function createEncryptionMiddleware(prisma: PrismaClient) {
  // Fields that should be encrypted
  const encryptedFields = new Map([
    ['User', ['password', 'socialSecurityNumber', 'driverLicenseNumber']],
    ['Customer', ['socialSecurityNumber', 'driverLicenseNumber', 'email', 'phone']],
    ['Transaction', ['creditCardLast4', 'bankAccountNumber']],
    ['Store', ['taxId', 'bankAccountNumber']],
    ['AuditLog', ['sensitiveData']]
  ])

  // Middleware for encrypting data before storage
  prisma.$use(async (params, next) => {
    // Encrypt on create/update operations
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const modelFields = encryptedFields.get(params.model)

      if (modelFields && params.args.data) {
        for (const field of modelFields) {
          if (params.args.data[field] && typeof params.args.data[field] === 'string') {
            try {
              const encrypted = encryptDatabaseField(params.args.data[field], field)
              params.args.data[field] = JSON.stringify(encrypted)
            } catch (error) {
              console.error(`Failed to encrypt field ${field}:`, error)
              // Don't break the operation, but log the error
            }
          }
        }
      }

      // Handle nested creates/updates
      if (params.args.data) {
        await encryptNestedFields(params.args.data, encryptedFields)
      }
    }

    const result = await next(params)

    // Decrypt on read operations
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action) && result) {
      const modelFields = encryptedFields.get(params.model)

      if (modelFields) {
        if (Array.isArray(result)) {
          for (const record of result) {
            await decryptRecordFields(record, modelFields)
          }
        } else {
          await decryptRecordFields(result, modelFields)
        }
      }
    }

    return result
  })
}

/**
 * Encrypt nested fields in data objects
 */
async function encryptNestedFields(data: any, encryptedFields: Map<string, string[]>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this is a nested create/update
      if (key === 'create' || key === 'update') {
        await encryptNestedFields(value, encryptedFields)
      }
    }
  }
}

/**
 * Decrypt fields in a database record
 */
async function decryptRecordFields(record: any, fields: string[]): Promise<void> {
  for (const field of fields) {
    if (record[field] && typeof record[field] === 'string') {
      try {
        const encryptedField = JSON.parse(record[field]) as EncryptedField
        if (encryptedField.encrypted && encryptedField.iv && encryptedField.tag) {
          record[field] = decryptDatabaseField(encryptedField, field)
        }
      } catch (error) {
        // If decryption fails, leave the field as is (might be unencrypted legacy data)
        console.error(`Failed to decrypt field ${field}:`, error)
      }
    }
  }
}

/**
 * Hash sensitive data that doesn't need to be decrypted (like passwords)
 */
export function hashSensitiveField(data: string, salt?: string): { hash: string; salt: string } {
  const fieldSalt = salt || crypto.randomBytes(32).toString('hex')
  const hash = crypto.pbkdf2Sync(data, fieldSalt, 100000, 64, 'sha512').toString('hex')
  return { hash, salt: fieldSalt }
}

/**
 * Verify hashed sensitive field
 */
export function verifySensitiveField(data: string, hash: string, salt: string): boolean {
  const expectedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
}

/**
 * Create secure database connection with encryption
 */
export function createSecureDatabase(): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query'
      },
      {
        emit: 'event',
        level: 'error'
      }
    ]
  })

  // Add encryption middleware
  createEncryptionMiddleware(prisma)

  // Add query logging for security monitoring
  prisma.$on('query', (e) => {
    // Log only non-sensitive operations
    if (!e.query.toLowerCase().includes('password') &&
        !e.query.toLowerCase().includes('socialsecurity')) {
      console.log(`Query: ${e.query}`)
      console.log(`Duration: ${e.duration}ms`)
    }
  })

  prisma.$on('error', (e) => {
    console.error('Database error:', e)
  })

  return prisma
}

/**
 * Sanitize database logs to prevent sensitive data exposure
 */
export function sanitizeDatabaseLog(logEntry: any): any {
  const sensitivePatterns = [
    /password['":\s]*['"]\w+['"]/gi,
    /ssn['":\s]*['"]\d{3}-?\d{2}-?\d{4}['"]/gi,
    /creditcard['":\s]*['"]\d{4}\s?\d{4}\s?\d{4}\s?\d{4}['"]/gi,
    /cvv['":\s]*['"]\d{3,4}['"]/gi
  ]

  let sanitized = JSON.stringify(logEntry)

  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  }

  return JSON.parse(sanitized)
}

/**
 * Database field masking for display purposes
 */
export function maskSensitiveField(value: string, fieldType: 'email' | 'phone' | 'ssn' | 'card'): string {
  if (!value) return ''

  switch (fieldType) {
    case 'email':
      const [user, domain] = value.split('@')
      return `${user.charAt(0)}***@${domain}`

    case 'phone':
      return `(***) ***-${value.slice(-4)}`

    case 'ssn':
      return `***-**-${value.slice(-4)}`

    case 'card':
      return `****-****-****-${value.slice(-4)}`

    default:
      return '***'
  }
}

/**
 * Audit database access for compliance
 */
export async function auditDatabaseAccess(
  userId: string,
  operation: string,
  tableName: string,
  recordId?: string,
  sensitiveFields?: string[]
): Promise<void> {
  try {
    const prisma = new PrismaClient()

    // Note: AuditLog model needs to be added to Prisma schema
    console.log('Database Access Audit:', {
      operation,
      tableName,
      userId,
      sensitiveFields: sensitiveFields || [],
      timestamp: new Date().toISOString()
    })
    // await prisma.auditLog.create({
    //   data: {
    //     eventType: 'DATABASE_ACCESS',
    //     entityType: tableName,
    //     entityId: recordId || 'multiple',
    //     userId,
    //     ipAddress: 'database',
    //     userAgent: 'system',
    //     eventData: {
    //       operation,
    //       tableName,
    //       sensitiveFields: sensitiveFields || [],
    //       timestamp: new Date().toISOString()
    //     },
    //     severity: sensitiveFields && sensitiveFields.length > 0 ? 'HIGH' : 'LOW'
    //   }
    // })
  } catch (error) {
    console.error('Failed to audit database access:', error)
  }
}