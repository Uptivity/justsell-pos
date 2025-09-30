import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import { transactionRoutes } from './routes/transactions'
import { customerRoutes } from './routes/customers'
import {
  securityHeaders,
  apiRateLimit,
  authRateLimit,
  transactionRateLimit,
  validateRequest,
  secureRequestLogger
} from './middleware/security'
import { securityManager } from './security/securityManager'

const app = express()
const port = process.env.API_PORT || 3001

// Initialize security manager
let securityInitialized = false

async function initializeSecurity() {
  if (!securityInitialized) {
    try {
      await securityManager.initialize()
      securityInitialized = true
      console.log('🔒 Enterprise security systems online')
    } catch (error) {
      console.error('❌ Security initialization failed:', error)
      process.exit(1) // Fail fast for security issues
    }
  }
}

// Security middleware (must be first)
app.use(securityHeaders)
app.use(secureRequestLogger)
app.use(validateRequest)

// CORS configuration with security considerations
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Token']
}))

// Body parsing middleware
app.use(express.json({ limit: '1mb' })) // Reduced limit for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Apply rate limiting
app.use(apiRateLimit)

// Basic health check endpoint (for load balancers)
app.get('/health', async (_req, res) => {
  res.status(200).send('healthy\n')
})

// Detailed health check endpoint with component status
app.get('/api/health', async (_req, res) => {
  const checks: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    components: {}
  }

  // Check database connectivity
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    checks.components.database = { status: 'healthy' }
  } catch (error) {
    checks.components.database = { status: 'unhealthy', error: 'Connection failed' }
    checks.status = 'degraded'
  }

  // Check Redis connectivity if configured
  if (process.env.REDIS_URL) {
    try {
      const redis = require('redis')
      const client = redis.createClient({ url: process.env.REDIS_URL })
      await client.connect()
      await client.ping()
      await client.quit()
      checks.components.redis = { status: 'healthy' }
    } catch (error) {
      checks.components.redis = { status: 'unhealthy', error: 'Connection failed' }
      checks.status = 'degraded'
    }
  }

  // Check security status
  try {
    const healthCheck = await securityManager.securityHealthCheck()
    checks.components.security = {
      status: healthCheck.status === 'healthy' ? 'healthy' : 'degraded',
      details: healthCheck
    }
  } catch (error) {
    checks.components.security = { status: 'unhealthy', error: 'Check failed' }
    checks.status = 'degraded'
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(checks)
})

// Security status endpoint (admin only)
app.get('/security/status', async (_req, res) => {
  try {
    const securityStatus = await securityManager.securityHealthCheck()
    res.json({
      timestamp: new Date().toISOString(),
      securityLevel: process.env.SECURITY_LEVEL || 'standard',
      complianceMode: process.env.COMPLIANCE_MODE || 'basic',
      ...securityStatus
    })
  } catch (error) {
    res.status(500).json({
      error: 'Security status check failed',
      timestamp: new Date().toISOString()
    })
  }
})

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/transactions', transactionRateLimit, transactionRoutes)
app.use('/api/customers', customerRoutes)

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'API endpoint not found' })
})

if (require.main === module) {
  initializeSecurity().then(() => {
    app.listen(port, () => {
      console.log(`🚀 Secure POS API Server running on port ${port}`)
      console.log(`🔒 Security Level: ${process.env.SECURITY_LEVEL || 'standard'}`)
      console.log(`📋 Compliance Mode: ${process.env.COMPLIANCE_MODE || 'basic'}`)
      console.log(`🛡️ PCI-DSS Compliance: ${process.env.PCI_COMPLIANCE_MODE || 'disabled'}`)
    })
  }).catch(error => {
    console.error('❌ Failed to start secure server:', error)
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down server...')
    await securityManager.shutdown()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down server...')
    await securityManager.shutdown()
    process.exit(0)
  })
}

export { app }