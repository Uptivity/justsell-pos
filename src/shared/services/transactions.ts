import { api } from './api'
import type { 
  CreateTransactionData, 
  TransactionResponse, 
  AgeVerificationData 
} from '../types/transactions'

export const transactionService = {
  // Create a new transaction (checkout)
  async createTransaction(data: CreateTransactionData): Promise<TransactionResponse> {
    const response = await api.post('/api/transactions', data)
    return response.data.transaction
  },

  // Get transaction by ID
  async getTransaction(id: string): Promise<TransactionResponse> {
    const response = await api.get(`/api/transactions/${id}`)
    return response.data
  },

  // Get transactions list with pagination
  async getTransactions(page = 1, limit = 20) {
    const response = await api.get('/api/transactions', {
      params: { page, limit }
    })
    return response.data
  },

  // Process age verification
  async processAgeVerification(data: AgeVerificationData) {
    const response = await api.post('/api/age-verification', data)
    return response.data
  },

  // Calculate tax for transaction
  async calculateTax(subtotal: number, storeId?: string, customerId?: string) {
    const response = await api.post('/api/transactions/calculate-tax', {
      subtotal,
      storeId,
      customerId
    })
    return response.data
  },

  // Generate receipt
  async generateReceipt(transactionId: string) {
    const response = await api.get(`/api/transactions/${transactionId}/receipt`)
    return response.data
  },

  // Print receipt
  async printReceipt(transactionId: string) {
    const response = await api.post(`/api/transactions/${transactionId}/print`)
    return response.data
  },

  // Validate transaction before processing
  async validateTransaction(data: CreateTransactionData) {
    const response = await api.post('/api/transactions/validate', data)
    return response.data
  }
}