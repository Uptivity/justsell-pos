import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import { transactionRoutes } from './routes/transactions'
import { customerRoutes } from './routes/customers'

const app = express()
const port = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/transactions', transactionRoutes)
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
  app.listen(port, () => {
    console.log(`🚀 API Server running on port ${port}`)
  })
}

export { app }