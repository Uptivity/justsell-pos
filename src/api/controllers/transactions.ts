import { Request, Response } from 'express'
import { PrismaClient } from '../../generated/prisma'
import type { CreateTransactionData } from '../../shared/types/transactions'

const prisma = new PrismaClient()

interface LineItemData {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  lineTotal: number
  ageVerificationRequired: boolean
  lotNumber?: string | null
  expirationDate?: Date | null
}

export const transactionController = {
  // Create a new transaction (checkout)
  async createTransaction(req: Request, res: Response): Promise<Response | void> {
    try {
      const {
        customerId,
        cartItems,
        paymentMethod,
        cashTendered,
        ageVerificationCompleted,
        storeId
      }: CreateTransactionData = req.body

      const employeeId = req.user?.id
      if (!employeeId) {
        return res.status(401).json({ message: 'Employee authentication required' })
      }

      // Calculate totals
      let subtotal = 0
      const lineItems: LineItemData[] = []
      let ageVerificationRequired = false

      for (const item of cartItems) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) {
          return res.status(400).json({ 
            message: `Product ${item.productId} not found` 
          })
        }

        // Check stock availability
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
          })
        }

        const lineTotal = parseFloat(product.price.toString()) * item.quantity
        subtotal += lineTotal

        if (product.ageRestricted) {
          ageVerificationRequired = true
        }

        lineItems.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: parseFloat(product.price.toString()),
          lineTotal: lineTotal,
          ageVerificationRequired: product.ageRestricted,
          lotNumber: product.lotNumber,
          expirationDate: product.expirationDate
        })
      }

      // Age verification check
      if (ageVerificationRequired && !ageVerificationCompleted) {
        return res.status(400).json({
          message: 'Age verification required for restricted products',
          requiresAgeVerification: true
        })
      }

      // Calculate tax (8% for now - will be enhanced later)
      const taxRate = 0.08
      const taxAmount = subtotal * taxRate
      const totalAmount = subtotal + taxAmount

      // Calculate loyalty points if customer is provided
      let loyaltyPointsEarned = 0
      if (customerId) {
        // 1 point per dollar spent (rounded down)
        loyaltyPointsEarned = Math.floor(totalAmount)
      }

      // Validate cash payment
      if (paymentMethod === 'CASH' && cashTendered) {
        if (cashTendered < totalAmount) {
          return res.status(400).json({
            message: 'Insufficient cash tendered'
          })
        }
      }

      // Generate receipt number
      const receiptNumber = `R${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      // Create transaction in database
      const transaction = await prisma.$transaction(async (tx) => {
        // Create the transaction
        const newTransaction = await tx.transaction.create({
          data: {
            receiptNumber,
            storeId: storeId || 'default-store-id', // TODO: Get from user context
            customerId,
            employeeId,
            subtotalAmount: subtotal,
            taxAmount,
            totalAmount,
            paymentMethod,
            paymentStatus: 'COMPLETED',
            cashTendered: paymentMethod === 'CASH' ? cashTendered : undefined,
            changeGiven: paymentMethod === 'CASH' && cashTendered ? cashTendered - totalAmount : undefined,
            ageVerificationRequired,
            ageVerificationCompleted: (ageVerificationRequired ? !!ageVerificationCompleted : false) as boolean,
            loyaltyPointsEarned,
            loyaltyPointsRedeemed: 0, // TODO: Implement point redemption
            taxBreakdown: {
              subtotal,
              taxRate,
              taxAmount,
              total: totalAmount
            }
          }
        })

        // Create line items
        for (const item of lineItems) {
          await tx.lineItem.create({
            data: {
              transactionId: newTransaction.id,
              ...item
            }
          })

          // Update product inventory
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity
              }
            }
          })
        }

        // Update customer loyalty points and stats if customer is provided
        if (customerId && loyaltyPointsEarned > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: { increment: loyaltyPointsEarned },
              pointsLifetimeEarned: { increment: loyaltyPointsEarned },
              totalSpent: { increment: totalAmount },
              transactionCount: { increment: 1 },
              lastPurchaseDate: new Date()
            }
          })

          // Update loyalty tier based on new total spent
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
            select: { totalSpent: true }
          })

          if (customer) {
            const newTotalSpent = parseFloat(customer.totalSpent.toString()) + totalAmount
            let newTier = 'BRONZE'
            if (newTotalSpent >= 5000) newTier = 'PLATINUM'
            else if (newTotalSpent >= 2000) newTier = 'GOLD'
            else if (newTotalSpent >= 500) newTier = 'SILVER'

            await tx.customer.update({
              where: { id: customerId },
              data: { loyaltyTier: newTier as any }
            })
          }
        }

        return newTransaction
      })

      // Fetch complete transaction with relations
      const completeTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          lineItems: {
            include: {
              product: true
            }
          },
          customer: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      return res.status(201).json({
        message: 'Transaction completed successfully',
        transaction: completeTransaction
      })

    } catch (error) {
      console.error('Transaction creation error:', error)
      return res.status(500).json({ 
        message: 'Failed to process transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Get transaction by ID
  async getTransaction(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          lineItems: {
            include: {
              product: true
            }
          },
          customer: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          store: true
        }
      })

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' })
      }

      return res.json(transaction)
    } catch (error) {
      console.error('Get transaction error:', error)
      return res.status(500).json({ message: 'Failed to retrieve transaction' })
    }
  },

  // Get transactions list with pagination
  async getTransactions(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          skip,
          take: limit,
          orderBy: { transactionDate: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.transaction.count()
      ])

      return res.json({
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      console.error('Get transactions error:', error)
      return res.status(500).json({ message: 'Failed to retrieve transactions' })
    }
  },

  // Generate receipt for transaction
  async generateReceipt(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          lineItems: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true
                }
              }
            }
          },
          customer: {
            select: {
              firstName: true,
              lastName: true,
              loyaltyPoints: true
            }
          },
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          store: {
            select: {
              storeName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              stateCode: true,
              zipCode: true,
              phone: true,
              taxId: true
            }
          }
        }
      })

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' })
      }

      // Format store address
      const storeAddress = [
        transaction.store.addressLine1,
        transaction.store.addressLine2,
        `${transaction.store.city}, ${transaction.store.stateCode} ${transaction.store.zipCode}`
      ].filter(Boolean).join(', ')

      // Generate receipt
      const receipt = {
        transactionId: transaction.id,
        receiptNumber: transaction.receiptNumber,
        storeInfo: {
          name: transaction.store.storeName,
          address: storeAddress,
          phone: transaction.store.phone || '',
          taxId: transaction.store.taxId || ''
        },
        transactionDate: transaction.transactionDate.toISOString(),
        employee: `${transaction.employee.firstName} ${transaction.employee.lastName}`,
        customer: transaction.customer 
          ? `${transaction.customer.firstName} ${transaction.customer.lastName}`
          : undefined,
        lineItems: transaction.lineItems.map(item => ({
          name: item.productName,
          sku: item.productSku,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice.toString()),
          lineTotal: parseFloat(item.lineTotal.toString())
        })),
        subtotal: parseFloat(transaction.subtotalAmount.toString()),
        taxAmount: parseFloat(transaction.taxAmount.toString()),
        totalAmount: parseFloat(transaction.totalAmount.toString()),
        paymentMethod: transaction.paymentMethod,
        cashTendered: transaction.cashTendered 
          ? parseFloat(transaction.cashTendered.toString()) 
          : undefined,
        changeGiven: transaction.changeGiven 
          ? parseFloat(transaction.changeGiven.toString()) 
          : undefined,
        loyaltyPoints: transaction.customer ? {
          earned: transaction.loyaltyPointsEarned,
          redeemed: transaction.loyaltyPointsRedeemed,
          balance: transaction.customer.loyaltyPoints
        } : undefined
      }

      return res.json(receipt)
    } catch (error) {
      console.error('Receipt generation error:', error)
      return res.status(500).json({ message: 'Failed to generate receipt' })
    }
  },

  // Print receipt (placeholder for POS printer integration)
  async printReceipt(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params

      // In a real implementation, this would send the receipt to a thermal printer
      // For now, we'll just return success
      
      return res.json({
        message: 'Receipt sent to printer',
        transactionId: id,
        printedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Receipt printing error:', error)
      return res.status(500).json({ message: 'Failed to print receipt' })
    }
  }
}