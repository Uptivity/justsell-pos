import { Router } from 'express'
import { customerController } from '../controllers/customers'
import { authenticate } from '../middleware/auth'
import { checkPermission } from '../middleware/permissions'

const router = Router()

// Apply authentication to all customer routes
router.use(authenticate)

// POST /api/customers - Create new customer
router.post(
  '/',
  checkPermission('customer:create'),
  customerController.createCustomer
)

// GET /api/customers - Get all customers with pagination and search
router.get(
  '/',
  checkPermission('customer:read'),
  customerController.getCustomers
)

// GET /api/customers/search - Quick search for POS
router.get(
  '/search',
  checkPermission('customer:read'),
  customerController.searchCustomers
)

// GET /api/customers/:id - Get specific customer by ID
router.get(
  '/:id',
  checkPermission('customer:read'),
  customerController.getCustomer
)

// PUT /api/customers/:id - Update customer
router.put(
  '/:id',
  checkPermission('customer:update'),
  customerController.updateCustomer
)

// POST /api/customers/:id/loyalty - Update loyalty points
router.post(
  '/:id/loyalty',
  checkPermission('customer:update'),
  customerController.updateLoyaltyPoints
)

export { router as customerRoutes }