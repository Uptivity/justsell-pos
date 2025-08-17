import type { Request, Response } from 'express'
import { prisma } from '../../shared/utils/database'
import { auditLoggingService } from '../../shared/services/auditLogging'

// QuickBooks SDK would be imported here
// import * as QuickBooks from 'node-quickbooks'

interface QuickBooksCredentials {
  accessToken: string
  refreshToken: string
  realmId: string
  expiresAt: Date
}

// Mock QuickBooks API responses for development
const mockQBData = {
  companyInfo: {
    name: 'Sample Tobacco Store',
    address: '123 Main St, Anytown, ST 12345',
    phone: '(555) 123-4567',
    email: 'owner@tobaccostore.com'
  },
  accounts: [
    { id: '1', name: 'Sales Revenue', type: 'Income', active: true },
    { id: '2', name: 'Sales Tax Payable', type: 'Current Liability', active: true },
    { id: '3', name: 'Cash', type: 'Bank', active: true },
    { id: '4', name: 'Credit Card Clearing', type: 'Bank', active: true },
    { id: '5', name: 'Gift Cards Outstanding', type: 'Current Liability', active: true },
    { id: '6', name: 'Inventory', type: 'Current Asset', active: true },
    { id: '7', name: 'Cost of Goods Sold', type: 'Cost of Goods Sold', active: true }
  ]
}

export const quickBooksController = {
  // OAuth Authentication
  async getAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const { state } = req.query
      
      // In production, this would generate actual QuickBooks OAuth URL
      const mockAuthUrl = `https://appcenter.intuit.com/connect/oauth2?` +
        `client_id=${process.env.QB_CLIENT_ID}&` +
        `scope=com.intuit.quickbooks.accounting&` +
        `redirect_uri=${encodeURIComponent(process.env.QB_REDIRECT_URI || '')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${state || 'default'}`
      
      res.json({ authUrl: mockAuthUrl })
    } catch (error) {
      console.error('QuickBooks auth URL error:', error)
      res.status(500).json({ 
        message: 'Failed to generate QuickBooks authorization URL',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, realmId, state } = req.body
      const user = req.user!

      // In production, exchange code for actual tokens
      const mockTokens: QuickBooksCredentials = {
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        realmId: realmId,
        expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hour
      }

      // Store credentials in database
      await prisma.quickBooksIntegration.upsert({
        where: { storeId: user.storeId },
        create: {
          storeId: user.storeId,
          realmId: mockTokens.realmId,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          expiresAt: mockTokens.expiresAt,
          isActive: true
        },
        update: {
          realmId: mockTokens.realmId,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          expiresAt: mockTokens.expiresAt,
          isActive: true,
          updatedAt: new Date()
        }
      })

      // Log the connection
      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'settings_changed',
        entityType: 'system',
        details: {
          action: 'quickbooks_connected',
          realmId: mockTokens.realmId
        },
        severity: 'medium'
      })

      res.json(mockTokens)
    } catch (error) {
      console.error('QuickBooks OAuth callback error:', error)
      res.status(500).json({ 
        message: 'Failed to complete QuickBooks authorization',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!
      
      const integration = await prisma.quickBooksIntegration.findUnique({
        where: { storeId: user.storeId }
      })

      if (!integration) {
        res.status(404).json({ message: 'QuickBooks integration not found' })
        return
      }

      // In production, refresh actual tokens
      const newTokens: QuickBooksCredentials = {
        accessToken: 'refreshed_access_token_' + Date.now(),
        refreshToken: integration.refreshToken,
        realmId: integration.realmId,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }

      await prisma.quickBooksIntegration.update({
        where: { storeId: user.storeId },
        data: {
          accessToken: newTokens.accessToken,
          expiresAt: newTokens.expiresAt,
          updatedAt: new Date()
        }
      })

      res.json(newTokens)
    } catch (error) {
      console.error('QuickBooks token refresh error:', error)
      res.status(500).json({ 
        message: 'Failed to refresh QuickBooks token',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Company Information
  async getCompanyInfo(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!
      
      const integration = await prisma.quickBooksIntegration.findUnique({
        where: { storeId: user.storeId }
      })

      if (!integration) {
        res.status(404).json({ message: 'QuickBooks not connected' })
        return
      }

      // In production, fetch from QuickBooks API
      res.json(mockQBData.companyInfo)
    } catch (error) {
      console.error('QuickBooks company info error:', error)
      res.status(500).json({ 
        message: 'Failed to get company information',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Chart of Accounts
  async getChartOfAccounts(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!
      
      const integration = await prisma.quickBooksIntegration.findUnique({
        where: { storeId: user.storeId }
      })

      if (!integration) {
        res.status(404).json({ message: 'QuickBooks not connected' })
        return
      }

      // In production, fetch from QuickBooks API
      res.json(mockQBData.accounts)
    } catch (error) {
      console.error('QuickBooks chart of accounts error:', error)
      res.status(500).json({ 
        message: 'Failed to get chart of accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  async updateAccountMapping(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!
      const accountMapping = req.body

      await prisma.quickBooksAccountMapping.upsert({
        where: { storeId: user.storeId },
        create: {
          storeId: user.storeId,
          ...accountMapping
        },
        update: {
          ...accountMapping,
          updatedAt: new Date()
        }
      })

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'settings_changed',
        entityType: 'system',
        details: {
          action: 'account_mapping_updated',
          mapping: accountMapping
        },
        severity: 'medium'
      })

      res.json({ message: 'Account mapping updated successfully' })
    } catch (error) {
      console.error('Account mapping update error:', error)
      res.status(500).json({ 
        message: 'Failed to update account mapping',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Customer Sync
  async syncCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params
      const user = req.user!

      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!customer) {
        res.status(404).json({ message: 'Customer not found' })
        return
      }

      // Mock QuickBooks customer creation/update
      const qbCustomer = {
        id: `qb_${customerId}`,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone,
        active: customer.isActive
      }

      // Update customer with QB ID
      await prisma.customer.update({
        where: { id: customerId },
        data: { quickBooksId: qbCustomer.id }
      })

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'customer_updated',
        entityType: 'customer',
        entityId: customerId,
        details: {
          action: 'synced_to_quickbooks',
          quickBooksId: qbCustomer.id
        },
        severity: 'low'
      })

      res.json(qbCustomer)
    } catch (error) {
      console.error('Customer sync error:', error)
      res.status(500).json({ 
        message: 'Failed to sync customer',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Item/Product Sync
  async syncAllItems(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!

      const products = await prisma.product.findMany({
        where: { storeId: user.storeId, isActive: true }
      })

      let imported = 0
      let updated = 0
      const errors: string[] = []

      for (const product of products) {
        try {
          // Mock QB item creation/update
          const qbItemId = `qb_${product.id}`
          
          await prisma.product.update({
            where: { id: product.id },
            data: { quickBooksId: qbItemId }
          })

          if (product.quickBooksId) {
            updated++
          } else {
            imported++
          }
        } catch (error) {
          errors.push(`Failed to sync ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'data_export',
        entityType: 'system',
        details: {
          action: 'inventory_sync_to_quickbooks',
          imported,
          updated,
          errors: errors.length
        },
        severity: errors.length > 0 ? 'medium' : 'low'
      })

      res.json({ imported, updated, errors })
    } catch (error) {
      console.error('Item sync error:', error)
      res.status(500).json({ 
        message: 'Failed to sync items',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Transaction Sync
  async syncTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params
      const user = req.user!

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          transactionItems: {
            include: { product: true }
          },
          customer: true
        }
      })

      if (!transaction) {
        res.status(404).json({ message: 'Transaction not found' })
        return
      }

      // Mock QuickBooks sales receipt creation
      const qbSalesReceipt = {
        id: `qb_receipt_${transactionId}`,
        customerId: transaction.customer?.quickBooksId,
        transactionDate: transaction.createdAt.toISOString(),
        totalAmount: transaction.totalAmount,
        taxAmount: transaction.taxAmount,
        paymentMethod: transaction.paymentMethod,
        lineItems: transaction.transactionItems.map(item => ({
          itemId: item.product.quickBooksId || `qb_${item.product.id}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          description: item.product.name
        }))
      }

      // Update transaction with QB ID
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { quickBooksId: qbSalesReceipt.id }
      })

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: transactionId,
        details: {
          action: 'synced_to_quickbooks',
          quickBooksId: qbSalesReceipt.id,
          amount: transaction.totalAmount
        },
        severity: 'low'
      })

      res.json(qbSalesReceipt)
    } catch (error) {
      console.error('Transaction sync error:', error)
      res.status(500).json({ 
        message: 'Failed to sync transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Sync Status
  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!

      const integration = await prisma.quickBooksIntegration.findUnique({
        where: { storeId: user.storeId }
      })

      const itemCount = await prisma.product.count({
        where: { storeId: user.storeId, quickBooksId: { not: null } }
      })

      const customerCount = await prisma.customer.count({
        where: { storeId: user.storeId, quickBooksId: { not: null } }
      })

      const transactionCount = await prisma.transaction.count({
        where: { storeId: user.storeId, quickBooksId: { not: null } }
      })

      const syncStatus = {
        connected: !!integration?.isActive,
        lastSync: integration?.updatedAt?.toISOString() || '',
        errors: [],
        itemCount,
        customerCount,
        transactionCount
      }

      res.json(syncStatus)
    } catch (error) {
      console.error('Sync status error:', error)
      res.status(500).json({ 
        message: 'Failed to get sync status',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Force Sync All
  async forceSyncAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!

      // Mock comprehensive sync
      const results = {
        customers: { synced: 0, errors: 0 },
        items: { synced: 0, errors: 0 },
        transactions: { synced: 0, errors: 0 }
      }

      // Sync customers
      const customers = await prisma.customer.findMany({
        where: { storeId: user.storeId }
      })
      results.customers.synced = customers.length

      // Sync products
      const products = await prisma.product.findMany({
        where: { storeId: user.storeId }
      })
      results.items.synced = products.length

      // Sync recent transactions
      const transactions = await prisma.transaction.findMany({
        where: { 
          storeId: user.storeId,
          createdAt: { 
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
      results.transactions.synced = transactions.length

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'data_export',
        entityType: 'system',
        details: {
          action: 'force_sync_all_to_quickbooks',
          results
        },
        severity: 'medium'
      })

      res.json({
        success: true,
        results,
        errors: []
      })
    } catch (error) {
      console.error('Force sync error:', error)
      res.status(500).json({ 
        message: 'Failed to force sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  },

  // Disconnect
  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!

      await prisma.quickBooksIntegration.updateMany({
        where: { storeId: user.storeId },
        data: { isActive: false, updatedAt: new Date() }
      })

      await auditLoggingService.logEvent({
        userId: user.id,
        userRole: user.role,
        storeId: user.storeId,
        action: 'settings_changed',
        entityType: 'system',
        details: {
          action: 'quickbooks_disconnected'
        },
        severity: 'medium'
      })

      res.json({ message: 'QuickBooks integration disconnected successfully' })
    } catch (error) {
      console.error('QuickBooks disconnect error:', error)
      res.status(500).json({ 
        message: 'Failed to disconnect QuickBooks',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}