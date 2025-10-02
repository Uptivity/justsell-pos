import { Router } from 'express'
import { transactionController } from '../controllers/transactions.js'
import { authenticate } from '../middleware/auth.js'
import { checkPermission } from '../middleware/permissions.js'
import {
  csrfProtection,
  validateTransactionIntegrity,
  sanitizePaymentData,
  fraudDetection
} from '../middleware/security.js'

const router = Router()

// Apply authentication to all transaction routes
router.use(authenticate)

// POST /api/transactions - Create new transaction (checkout)
router.post(
  '/',
  csrfProtection,
  sanitizePaymentData,
  fraudDetection,
  validateTransactionIntegrity,
  checkPermission('transaction:create'),
  transactionController.createTransaction
)

// GET /api/transactions - Get all transactions with pagination
router.get(
  '/',
  checkPermission('transaction:read'),
  transactionController.getTransactions
)

// GET /api/transactions/:id - Get specific transaction by ID
router.get(
  '/:id',
  checkPermission('transaction:read'),
  transactionController.getTransaction
)

// GET /api/transactions/:id/receipt - Generate receipt for transaction
router.get(
  '/:id/receipt',
  checkPermission('transaction:read'),
  transactionController.generateReceipt
)

// POST /api/transactions/:id/print - Print receipt for transaction
router.post(
  '/:id/print',
  checkPermission('transaction:create'),
  transactionController.printReceipt
)

export { router as transactionRoutes }