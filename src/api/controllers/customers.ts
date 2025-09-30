import { Request, Response } from 'express'
import { PrismaClient } from '../../generated/prisma'
import type { CreateCustomerData, UpdateCustomerData } from '../../shared/types/customers'

const prisma = new PrismaClient()

export const customerController = {
  // Create a new customer
  async createCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const customerData: CreateCustomerData = req.body

      // Validate required fields
      if (!customerData.firstName || !customerData.lastName) {
        return res.status(400).json({
          message: 'First name and last name are required'
        })
      }

      // Check for duplicate email if provided
      if (customerData.email) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: customerData.email }
        })

        if (existingCustomer) {
          return res.status(400).json({
            message: 'A customer with this email already exists'
          })
        }
      }

      // Calculate loyalty tier based on total spent
      const loyaltyTier = calculateLoyaltyTier(customerData.totalSpent || 0)

      const customer = await prisma.customer.create({
        data: {
          ...customerData,
          loyaltyTier,
          loyaltyPoints: customerData.loyaltyPoints || 0,
          pointsLifetimeEarned: customerData.loyaltyPoints || 0,
          totalSpent: customerData.totalSpent || 0,
          transactionCount: 0
        }
      })

      return res.status(201).json({
        message: 'Customer created successfully',
        customer
      })
    } catch (error) {
      console.error('Customer creation error:', error)
      return res.status(500).json({
        message: 'Failed to create customer',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Get customer by ID
  async getCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
            take: 10,
            include: {
              lineItems: {
                include: {
                  product: true
                }
              }
            }
          },
          customerPurchaseHistory: {
            orderBy: { purchaseDate: 'desc' },
            take: 20,
            include: {
              product: true
            }
          }
        }
      })

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' })
      }

      return res.json(customer)
    } catch (error) {
      console.error('Get customer error:', error)
      return res.status(500).json({ message: 'Failed to retrieve customer' })
    }
  },

  // Get customers list with pagination and search
  async getCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const search = req.query.search as string
      const skip = (page - 1) * limit

      // Build search conditions
      const searchConditions = search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phoneNumber: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {}

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: {
            isActive: true,
            ...searchConditions
          },
          skip,
          take: limit,
          orderBy: [
            { lastPurchaseDate: 'desc' },
            { createdAt: 'desc' }
          ],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            loyaltyTier: true,
            loyaltyPoints: true,
            totalSpent: true,
            transactionCount: true,
            lastPurchaseDate: true,
            createdAt: true
          }
        }),
        prisma.customer.count({
          where: {
            isActive: true,
            ...searchConditions
          }
        })
      ])

      return res.json({
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      console.error('Get customers error:', error)
      return res.status(500).json({ message: 'Failed to retrieve customers' })
    }
  },

  // Update customer
  async updateCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const updateData: UpdateCustomerData = req.body

      // Check if customer exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id }
      })

      if (!existingCustomer) {
        return res.status(404).json({ message: 'Customer not found' })
      }

      // Check for duplicate email if email is being updated
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const duplicateCustomer = await prisma.customer.findUnique({
          where: { email: updateData.email }
        })

        if (duplicateCustomer) {
          return res.status(400).json({
            message: 'A customer with this email already exists'
          })
        }
      }

      // Update loyalty tier if total spent changed
      if (updateData.totalSpent !== undefined) {
        updateData.loyaltyTier = calculateLoyaltyTier(updateData.totalSpent)
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: updateData
      })

      return res.json({
        message: 'Customer updated successfully',
        customer
      })
    } catch (error) {
      console.error('Customer update error:', error)
      return res.status(500).json({
        message: 'Failed to update customer',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Search customers (quick search for POS)
  async searchCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const { q } = req.query as { q?: string }

      if (!q || q.length < 2) {
        return res.json({ customers: [] })
      }

      const customers = await prisma.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phoneNumber: { contains: q, mode: 'insensitive' as const } }
          ]
        },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          loyaltyTier: true,
          loyaltyPoints: true
        }
      })

      return res.json({ customers })
    } catch (error) {
      console.error('Customer search error:', error)
      return res.status(500).json({ message: 'Failed to search customers' })
    }
  },

  // Calculate and update customer loyalty points
  async updateLoyaltyPoints(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const { points, operation } = req.body as {
        points: number
        operation: 'earn' | 'redeem'
        reason: string
      }

      if (!points || points <= 0) {
        return res.status(400).json({ message: 'Points must be a positive number' })
      }

      const customer = await prisma.customer.findUnique({
        where: { id }
      })

      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' })
      }

      let updateData: any = {}

      if (operation === 'earn') {
        updateData = {
          loyaltyPoints: { increment: points },
          pointsLifetimeEarned: { increment: points }
        }
      } else if (operation === 'redeem') {
        if (customer.loyaltyPoints < points) {
          return res.status(400).json({
            message: `Insufficient points. Customer has ${customer.loyaltyPoints} points.`
          })
        }
        updateData = {
          loyaltyPoints: { decrement: points },
          pointsLifetimeRedeemed: { increment: points }
        }
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: updateData
      })

      return res.json({
        message: `Points ${operation === 'earn' ? 'earned' : 'redeemed'} successfully`,
        customer: updatedCustomer,
        pointsChanged: operation === 'earn' ? points : -points
      })
    } catch (error) {
      console.error('Loyalty points update error:', error)
      return res.status(500).json({ message: 'Failed to update loyalty points' })
    }
  }
}

// Helper function to calculate loyalty tier based on total spent
function calculateLoyaltyTier(totalSpent: number) {
  if (totalSpent >= 5000) return 'PLATINUM'
  if (totalSpent >= 2000) return 'GOLD'  
  if (totalSpent >= 500) return 'SILVER'
  return 'BRONZE'
}