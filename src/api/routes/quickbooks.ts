import { Router } from 'express'
import { quickBooksController } from '../controllers/quickbooks.js'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/auth.js'

const router = Router()

// All QuickBooks routes require authentication
router.use(authenticate)

// OAuth and Connection Management
router.get('/auth-url', quickBooksController.getAuthUrl)
router.post('/oauth/callback', quickBooksController.handleOAuthCallback)
router.post('/oauth/refresh', quickBooksController.refreshToken)
router.get('/company-info', quickBooksController.getCompanyInfo)

// Chart of Accounts (Admin/Manager only)
router.get('/accounts', requirePermission('accounting:read'), quickBooksController.getChartOfAccounts)
router.post('/account-mapping', requirePermission('accounting:write'), quickBooksController.updateAccountMapping)
router.get('/account-mapping', requirePermission('accounting:read'), quickBooksController.updateAccountMapping)

// Customer Synchronization
router.post('/customers/:customerId/sync', requirePermission('customers:write'), quickBooksController.syncCustomer)

// Inventory/Product Synchronization  
router.post('/items/sync-all', requirePermission('inventory:write'), quickBooksController.syncAllItems)
router.post('/items/:productId/sync', requirePermission('inventory:write'), quickBooksController.syncAllItems)

// Transaction Synchronization
router.post('/transactions/:transactionId/sync', requirePermission('transactions:write'), quickBooksController.syncTransaction)

// Reporting and Status
router.get('/sync-status', requirePermission('reports:read'), quickBooksController.getSyncStatus)
router.post('/force-sync-all', requirePermission('accounting:write'), quickBooksController.forceSyncAll)

// Integration Management
router.post('/disconnect', requirePermission('system:write'), quickBooksController.disconnect)

export { router as quickBooksRoutes }