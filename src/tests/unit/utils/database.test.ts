// Mock Prisma Client before any imports
const mockPrisma = {
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $transaction: jest.fn()
}

jest.mock('../../../generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

// Mock the prisma instance
jest.mock('../../../shared/utils/database', () => {
  const actual = jest.requireActual('../../../shared/utils/database')
  return {
    ...actual,
    prisma: mockPrisma
  }
})

import { disconnectDatabase, isDatabaseConnected, withTransaction } from '../../../shared/utils/database'

describe('Database Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('disconnectDatabase', () => {
    it('should disconnect from database', async () => {
      mockPrisma.$disconnect.mockResolvedValueOnce(undefined)

      await disconnectDatabase()

      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1)
    })

    it('should handle disconnect errors', async () => {
      mockPrisma.$disconnect.mockRejectedValueOnce(new Error('Disconnect failed'))

      // Should throw because disconnect errors are propagated
      await expect(disconnectDatabase()).rejects.toThrow('Disconnect failed')
    })
  })

  describe('isDatabaseConnected', () => {
    it('should return true when database is connected', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '1': 1 }])

      const result = await isDatabaseConnected()

      expect(result).toBe(true)
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1'])
    })

    it('should return false when database connection fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await isDatabaseConnected()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Database connection failed:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('withTransaction', () => {
    it('should execute operation within transaction', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result')
      const mockTransaction = 'transaction-context'

      mockPrisma.$transaction.mockImplementation((operation) => {
        return operation(mockTransaction)
      })

      const result = await withTransaction(mockOperation)

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalledWith(mockTransaction)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('should handle transaction failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'))

      mockPrisma.$transaction.mockImplementation((operation) => {
        return operation('transaction-context')
      })

      await expect(withTransaction(mockOperation)).rejects.toThrow('Operation failed')
    })

    it('should handle transaction rollback', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')

      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Transaction rollback'))

      await expect(withTransaction(mockOperation)).rejects.toThrow('Transaction rollback')
    })
  })

  describe('Environment-based Prisma initialization', () => {
    it('should handle production environment setup', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      // Re-import to trigger environment check
      delete require.cache[require.resolve('../../../shared/utils/database')]
      const db = require('../../../shared/utils/database')

      expect(db.prisma).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should handle development environment setup', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Re-import to trigger environment check
      delete require.cache[require.resolve('../../../shared/utils/database')]
      const db = require('../../../shared/utils/database')

      expect(db.prisma).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should reuse global prisma instance in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      // Mock global.__prisma
      global.__prisma = mockPrisma as any

      // Re-import to trigger environment check
      delete require.cache[require.resolve('../../../shared/utils/database')]
      const db = require('../../../shared/utils/database')

      expect(db.prisma).toBe(mockPrisma)

      global.__prisma = undefined
      process.env.NODE_ENV = originalEnv
    })

    it('should export prisma client', () => {
      delete require.cache[require.resolve('../../../shared/utils/database')]
      const { prisma } = require('../../../shared/utils/database')

      expect(prisma).toBeDefined()
      expect(typeof prisma.$disconnect).toBe('function')
    })
  })
})