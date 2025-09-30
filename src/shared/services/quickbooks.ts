import { api } from './api'

// QuickBooks API Configuration
export interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  sandbox: boolean
  redirectUri: string
  baseUrl: string
}

// QuickBooks OAuth Token
export interface QuickBooksToken {
  accessToken: string
  refreshToken: string
  realmId: string // QuickBooks Company ID
  expiresAt: Date
}

// QuickBooks Customer
export interface QBCustomer {
  id?: string
  name: string
  email?: string
  phone?: string
  address?: {
    line1: string
    city: string
    state: string
    zipCode: string
  }
  active: boolean
}

// QuickBooks Item (Product)
export interface QBItem {
  id?: string
  name: string
  sku?: string
  description?: string
  unitPrice: number
  quantityOnHand?: number
  incomeAccount?: string
  assetAccount?: string
  active: boolean
  taxable: boolean
  category?: string
}

// QuickBooks Transaction
export interface QBSalesReceipt {
  id?: string
  customerId?: string
  transactionDate: string
  totalAmount: number
  taxAmount: number
  lineItems: QBLineItem[]
  paymentMethod: string
  paymentReference?: string
}

export interface QBLineItem {
  itemId: string
  quantity: number
  unitPrice: number
  amount: number
  description?: string
}

// Chart of Accounts mapping
export interface ChartOfAccountsMapping {
  salesAccount: string
  taxAccount: string
  cashAccount: string
  cardAccount: string
  giftCardAccount: string
  inventoryAccount: string
  cogsAccount: string
  discountAccount: string
}

export const quickBooksService = {
  // OAuth Authentication Flow
  async getAuthUrl(state?: string): Promise<string> {
    try {
      const response = await api.get('/api/quickbooks/auth-url', {
        params: { state }
      })
      return response.data.authUrl
    } catch (error) {
      console.error('Error getting QuickBooks auth URL:', error)
      throw new Error('Failed to get QuickBooks authorization URL')
    }
  },

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, realmId: string, state?: string): Promise<QuickBooksToken> {
    try {
      const response = await api.post('/api/quickbooks/oauth/callback', {
        code,
        realmId,
        state
      })
      return response.data
    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw new Error('Failed to exchange authorization code')
    }
  },

  // Refresh access token
  async refreshToken(): Promise<QuickBooksToken> {
    try {
      const response = await api.post('/api/quickbooks/oauth/refresh')
      return response.data
    } catch (error) {
      console.error('Error refreshing QuickBooks token:', error)
      throw new Error('Failed to refresh QuickBooks token')
    }
  },

  // Get company info
  async getCompanyInfo(): Promise<any> {
    try {
      const response = await api.get('/api/quickbooks/company-info')
      return response.data
    } catch (error) {
      console.error('Error getting company info:', error)
      throw new Error('Failed to get QuickBooks company information')
    }
  },

  // Customer Management
  async syncCustomer(customerId: string): Promise<QBCustomer> {
    try {
      const response = await api.post(`/api/quickbooks/customers/${customerId}/sync`)
      return response.data
    } catch (error) {
      console.error('Error syncing customer:', error)
      throw new Error('Failed to sync customer with QuickBooks')
    }
  },

  async createCustomerInQB(customerData: Omit<QBCustomer, 'id'>): Promise<QBCustomer> {
    try {
      const response = await api.post('/api/quickbooks/customers', customerData)
      return response.data
    } catch (error) {
      console.error('Error creating customer in QuickBooks:', error)
      throw new Error('Failed to create customer in QuickBooks')
    }
  },

  async updateCustomerInQB(customerId: string, customerData: Partial<QBCustomer>): Promise<QBCustomer> {
    try {
      const response = await api.put(`/api/quickbooks/customers/${customerId}`, customerData)
      return response.data
    } catch (error) {
      console.error('Error updating customer in QuickBooks:', error)
      throw new Error('Failed to update customer in QuickBooks')
    }
  },

  // Inventory Management
  async syncAllItems(): Promise<{ imported: number; updated: number; errors: string[] }> {
    try {
      const response = await api.post('/api/quickbooks/items/sync-all')
      return response.data
    } catch (error) {
      console.error('Error syncing all items:', error)
      throw new Error('Failed to sync inventory with QuickBooks')
    }
  },

  async syncItem(productId: string): Promise<QBItem> {
    try {
      const response = await api.post(`/api/quickbooks/items/${productId}/sync`)
      return response.data
    } catch (error) {
      console.error('Error syncing item:', error)
      throw new Error('Failed to sync product with QuickBooks')
    }
  },

  async createItemInQB(itemData: Omit<QBItem, 'id'>): Promise<QBItem> {
    try {
      const response = await api.post('/api/quickbooks/items', itemData)
      return response.data
    } catch (error) {
      console.error('Error creating item in QuickBooks:', error)
      throw new Error('Failed to create product in QuickBooks')
    }
  },

  async updateItemQuantity(itemId: string, newQuantity: number, reason: string): Promise<void> {
    try {
      await api.post(`/api/quickbooks/items/${itemId}/adjust-quantity`, {
        newQuantity,
        reason
      })
    } catch (error) {
      console.error('Error adjusting item quantity:', error)
      throw new Error('Failed to adjust inventory quantity in QuickBooks')
    }
  },

  // Transaction Management
  async createSalesReceipt(transactionData: Omit<QBSalesReceipt, 'id'>): Promise<QBSalesReceipt> {
    try {
      const response = await api.post('/api/quickbooks/sales-receipts', transactionData)
      return response.data
    } catch (error) {
      console.error('Error creating sales receipt:', error)
      throw new Error('Failed to create sales receipt in QuickBooks')
    }
  },

  async syncTransaction(transactionId: string): Promise<QBSalesReceipt> {
    try {
      const response = await api.post(`/api/quickbooks/transactions/${transactionId}/sync`)
      return response.data
    } catch (error) {
      console.error('Error syncing transaction:', error)
      throw new Error('Failed to sync transaction with QuickBooks')
    }
  },

  async voidSalesReceipt(salesReceiptId: string, reason: string): Promise<void> {
    try {
      await api.post(`/api/quickbooks/sales-receipts/${salesReceiptId}/void`, { reason })
    } catch (error) {
      console.error('Error voiding sales receipt:', error)
      throw new Error('Failed to void sales receipt in QuickBooks')
    }
  },

  // Chart of Accounts
  async getChartOfAccounts(): Promise<any[]> {
    try {
      const response = await api.get('/api/quickbooks/accounts')
      return response.data
    } catch (error) {
      console.error('Error getting chart of accounts:', error)
      throw new Error('Failed to get QuickBooks chart of accounts')
    }
  },

  async updateAccountMapping(mapping: ChartOfAccountsMapping): Promise<void> {
    try {
      await api.post('/api/quickbooks/account-mapping', mapping)
    } catch (error) {
      console.error('Error updating account mapping:', error)
      throw new Error('Failed to update chart of accounts mapping')
    }
  },

  async getAccountMapping(): Promise<ChartOfAccountsMapping> {
    try {
      const response = await api.get('/api/quickbooks/account-mapping')
      return response.data
    } catch (error) {
      console.error('Error getting account mapping:', error)
      throw new Error('Failed to get chart of accounts mapping')
    }
  },

  // Reporting and Export
  async exportTransactions(startDate: string, endDate: string): Promise<Blob> {
    try {
      const response = await api.post('/api/quickbooks/export/transactions', {
        startDate,
        endDate
      }, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting transactions:', error)
      throw new Error('Failed to export transactions to QuickBooks')
    }
  },

  async getTaxReport(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await api.get('/api/quickbooks/reports/tax', {
        params: { startDate, endDate }
      })
      return response.data
    } catch (error) {
      console.error('Error getting tax report:', error)
      throw new Error('Failed to get tax report from QuickBooks')
    }
  },

  async getProfitLoss(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await api.get('/api/quickbooks/reports/profit-loss', {
        params: { startDate, endDate }
      })
      return response.data
    } catch (error) {
      console.error('Error getting profit & loss report:', error)
      throw new Error('Failed to get profit & loss report from QuickBooks')
    }
  },

  // Sync Status and Health
  async getSyncStatus(): Promise<{
    connected: boolean
    lastSync: string
    errors: string[]
    itemCount: number
    customerCount: number
    transactionCount: number
  }> {
    try {
      const response = await api.get('/api/quickbooks/sync-status')
      return response.data
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        connected: false,
        lastSync: '',
        errors: ['Failed to check sync status'],
        itemCount: 0,
        customerCount: 0,
        transactionCount: 0
      }
    }
  },

  async forceSyncAll(): Promise<{
    success: boolean
    results: {
      customers: { synced: number; errors: number }
      items: { synced: number; errors: number }
      transactions: { synced: number; errors: number }
    }
    errors: string[]
  }> {
    try {
      const response = await api.post('/api/quickbooks/force-sync-all')
      return response.data
    } catch (error) {
      console.error('Error during force sync:', error)
      throw new Error('Failed to force sync with QuickBooks')
    }
  },

  // Disconnect and cleanup
  async disconnect(): Promise<void> {
    try {
      await api.post('/api/quickbooks/disconnect')
    } catch (error) {
      console.error('Error disconnecting from QuickBooks:', error)
      throw new Error('Failed to disconnect from QuickBooks')
    }
  },

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  },

  validateRealmId(realmId: string): boolean {
    return /^[0-9]+$/.test(realmId) && realmId.length > 0
  },

  isTokenExpired(token: QuickBooksToken): boolean {
    return new Date() >= new Date(token.expiresAt)
  }
}