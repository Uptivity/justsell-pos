import { Router } from 'express'
import {
  getProducts,
  getProductById,
  searchProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductCategories,
  getProductVendors,
  updateStock,
  bulkUpdateStock
} from '../controllers/products'
import { authenticate, requirePermission } from '../middleware/auth'

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

/**
 * Product catalog routes
 */
router.get('/', requirePermission('product:read'), getProducts)
router.get('/low-stock', requirePermission('product:read'), getLowStockProducts)
router.get('/categories', requirePermission('product:read'), getProductCategories)
router.get('/vendors', requirePermission('product:read'), getProductVendors)
router.get('/search/:code', requirePermission('product:read'), searchProductByCode)
router.get('/:id', requirePermission('product:read'), getProductById)

/**
 * Product management routes (require higher permissions)
 */
router.post('/', requirePermission('product:create'), createProduct)
router.put('/:id', requirePermission('product:update'), updateProduct)
router.delete('/:id', requirePermission('product:delete'), deleteProduct)

/**
 * Stock management routes
 */
router.patch('/:id/stock', requirePermission('product:update'), updateStock)
router.patch('/bulk-stock', requirePermission('product:update'), bulkUpdateStock)

export default router