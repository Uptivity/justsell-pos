import { Router } from 'express'
import { login, refreshToken, getCurrentUser, logout, changePassword } from '../controllers/auth.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/**
 * Public authentication routes
 */
router.post('/login', login)
router.post('/refresh', refreshToken)

/**
 * Protected authentication routes
 */
router.use(authenticate) // Apply authentication middleware to all routes below

router.get('/me', getCurrentUser)
router.post('/logout', logout)
router.post('/change-password', changePassword)

export default router
