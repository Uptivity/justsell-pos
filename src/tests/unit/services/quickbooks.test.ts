import { quickBooksService } from '../../../shared/services/quickbooks'
import { api } from '../../../shared/services/api'

// Mock the api service
jest.mock('../../../shared/services/api')
const mockApi = api as jest.Mocked<typeof api>

describe('QuickBooks Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OAuth Authentication', () => {
    it('should get authorization URL', async () => {
      const mockAuthUrl = 'https://appcenter.intuit.com/connect/oauth2?client_id=test'
      mockApi.get.mockResolvedValueOnce({ data: { authUrl: mockAuthUrl } })

      const result = await quickBooksService.getAuthUrl('test-state')
      
      expect(result).toBe(mockAuthUrl)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/auth-url', {
        params: { state: 'test-state' }
      })
    })

    it('should exchange code for tokens', async () => {
      const mockTokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        realmId: '123456789',
        expiresAt: new Date()
      }

      mockApi.post.mockResolvedValueOnce({ data: mockTokens })

      const result = await quickBooksService.exchangeCodeForTokens('auth_code', '123456789', 'state')
      
      expect(result).toEqual(mockTokens)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/oauth/callback', {
        code: 'auth_code',
        realmId: '123456789',
        state: 'state'
      })
    })

    it('should refresh token', async () => {
      const mockRefreshedTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'refresh_token_123',
        realmId: '123456789',
        expiresAt: new Date()
      }

      mockApi.post.mockResolvedValueOnce({ data: mockRefreshedTokens })

      const result = await quickBooksService.refreshToken()
      
      expect(result).toEqual(mockRefreshedTokens)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/oauth/refresh')
    })
  })

  describe('Company Information', () => {
    it('should get company info', async () => {
      const mockCompanyInfo = {
        name: 'Test Company',
        address: '123 Main St',
        phone: '555-123-4567',
        email: 'test@company.com'
      }

      mockApi.get.mockResolvedValueOnce({ data: mockCompanyInfo })

      const result = await quickBooksService.getCompanyInfo()
      
      expect(result).toEqual(mockCompanyInfo)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/company-info')
    })
  })

  describe('Customer Management', () => {
    it('should sync customer', async () => {
      const mockCustomer = {
        id: 'qb_customer_123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        active: true
      }

      mockApi.post.mockResolvedValueOnce({ data: mockCustomer })

      const result = await quickBooksService.syncCustomer('customer_123')
      
      expect(result).toEqual(mockCustomer)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/customers/customer_123/sync')
    })

    it('should create customer in QuickBooks', async () => {
      const customerData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-987-6543',
        active: true
      }

      const mockCreatedCustomer = { id: 'qb_new_customer', ...customerData }

      mockApi.post.mockResolvedValueOnce({ data: mockCreatedCustomer })

      const result = await quickBooksService.createCustomerInQB(customerData)
      
      expect(result).toEqual(mockCreatedCustomer)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/customers', customerData)
    })
  })

  describe('Inventory Management', () => {
    it('should sync all items', async () => {
      const mockSyncResult = {
        imported: 15,
        updated: 5,
        errors: ['Error syncing item ABC123']
      }

      mockApi.post.mockResolvedValueOnce({ data: mockSyncResult })

      const result = await quickBooksService.syncAllItems()
      
      expect(result).toEqual(mockSyncResult)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/items/sync-all')
    })

    it('should sync single item', async () => {
      const mockItem = {
        id: 'qb_item_123',
        name: 'Test Product',
        sku: 'SKU123',
        unitPrice: 9.99,
        quantityOnHand: 50,
        active: true,
        taxable: true
      }

      mockApi.post.mockResolvedValueOnce({ data: mockItem })

      const result = await quickBooksService.syncItem('product_123')
      
      expect(result).toEqual(mockItem)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/items/product_123/sync')
    })

    it('should update item quantity', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} })

      await quickBooksService.updateItemQuantity('item_123', 75, 'Inventory adjustment')
      
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/items/item_123/adjust-quantity', {
        newQuantity: 75,
        reason: 'Inventory adjustment'
      })
    })
  })

  describe('Transaction Management', () => {
    it('should create sales receipt', async () => {
      const transactionData = {
        customerId: 'qb_customer_123',
        transactionDate: '2024-08-11T10:00:00Z',
        totalAmount: 29.97,
        taxAmount: 2.40,
        lineItems: [
          {
            itemId: 'qb_item_123',
            quantity: 3,
            unitPrice: 9.99,
            amount: 29.97,
            description: 'Test Product'
          }
        ],
        paymentMethod: 'Cash'
      }

      const mockSalesReceipt = { id: 'qb_receipt_123', ...transactionData }

      mockApi.post.mockResolvedValueOnce({ data: mockSalesReceipt })

      const result = await quickBooksService.createSalesReceipt(transactionData)
      
      expect(result).toEqual(mockSalesReceipt)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/sales-receipts', transactionData)
    })

    it('should sync transaction', async () => {
      const mockSyncedTransaction = {
        id: 'qb_receipt_456',
        transactionDate: '2024-08-11T10:00:00Z',
        totalAmount: 15.99,
        taxAmount: 1.28
      }

      mockApi.post.mockResolvedValueOnce({ data: mockSyncedTransaction })

      const result = await quickBooksService.syncTransaction('transaction_456')
      
      expect(result).toEqual(mockSyncedTransaction)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/transactions/transaction_456/sync')
    })
  })

  describe('Chart of Accounts', () => {
    it('should get chart of accounts', async () => {
      const mockAccounts = [
        { id: '1', name: 'Sales Revenue', type: 'Income', active: true },
        { id: '2', name: 'Sales Tax Payable', type: 'Current Liability', active: true },
        { id: '3', name: 'Cash', type: 'Bank', active: true }
      ]

      mockApi.get.mockResolvedValueOnce({ data: mockAccounts })

      const result = await quickBooksService.getChartOfAccounts()
      
      expect(result).toEqual(mockAccounts)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/accounts')
    })

    it('should update account mapping', async () => {
      const mapping = {
        salesAccount: '1',
        taxAccount: '2',
        cashAccount: '3',
        cardAccount: '4',
        giftCardAccount: '5',
        inventoryAccount: '6',
        cogsAccount: '7'
      }

      mockApi.post.mockResolvedValueOnce({ data: {} })

      await quickBooksService.updateAccountMapping(mapping)
      
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/account-mapping', mapping)
    })
  })

  describe('Sync Status and Health', () => {
    it('should get sync status', async () => {
      const mockStatus = {
        connected: true,
        lastSync: '2024-08-11T10:00:00Z',
        errors: [],
        itemCount: 25,
        customerCount: 150,
        transactionCount: 500
      }

      mockApi.get.mockResolvedValueOnce({ data: mockStatus })

      const result = await quickBooksService.getSyncStatus()
      
      expect(result).toEqual(mockStatus)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/sync-status')
    })

    it('should handle sync status error gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await quickBooksService.getSyncStatus()
      
      expect(result).toEqual({
        connected: false,
        lastSync: '',
        errors: ['Failed to check sync status'],
        itemCount: 0,
        customerCount: 0,
        transactionCount: 0
      })
    })

    it('should force sync all', async () => {
      const mockSyncResults = {
        success: true,
        results: {
          customers: { synced: 5, errors: 0 },
          items: { synced: 15, errors: 1 },
          transactions: { synced: 25, errors: 0 }
        },
        errors: ['Failed to sync item XYZ']
      }

      mockApi.post.mockResolvedValueOnce({ data: mockSyncResults })

      const result = await quickBooksService.forceSyncAll()
      
      expect(result).toEqual(mockSyncResults)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/force-sync-all')
    })
  })

  describe('Reporting', () => {
    it('should export transactions', async () => {
      const mockBlob = new Blob(['transaction data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      mockApi.post.mockResolvedValueOnce({ data: mockBlob })

      const result = await quickBooksService.exportTransactions('2024-07-01', '2024-07-31')
      
      expect(result).toEqual(mockBlob)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/export/transactions', {
        startDate: '2024-07-01',
        endDate: '2024-07-31'
      }, {
        responseType: 'blob'
      })
    })

    it('should get tax report', async () => {
      const mockTaxReport = {
        totalTaxCollected: 1250.75,
        taxByJurisdiction: [
          { jurisdiction: 'State Sales Tax', amount: 1000.00 },
          { jurisdiction: 'Tobacco Tax', amount: 250.75 }
        ]
      }

      mockApi.get.mockResolvedValueOnce({ data: mockTaxReport })

      const result = await quickBooksService.getTaxReport('2024-07-01', '2024-07-31')
      
      expect(result).toEqual(mockTaxReport)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/reports/tax', {
        params: { startDate: '2024-07-01', endDate: '2024-07-31' }
      })
    })

    it('should get profit & loss report', async () => {
      const mockProfitLoss = {
        totalRevenue: 15000.00,
        totalExpenses: 8500.00,
        netProfit: 6500.00,
        grossMargin: 45.5
      }

      mockApi.get.mockResolvedValueOnce({ data: mockProfitLoss })

      const result = await quickBooksService.getProfitLoss('2024-07-01', '2024-07-31')
      
      expect(result).toEqual(mockProfitLoss)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/reports/profit-loss', {
        params: { startDate: '2024-07-01', endDate: '2024-07-31' }
      })
    })
  })

  describe('Utility Functions', () => {
    it('should format currency', () => {
      expect(quickBooksService.formatCurrency(1234.56)).toBe('$1,234.56')
      expect(quickBooksService.formatCurrency(0)).toBe('$0.00')
      expect(quickBooksService.formatCurrency(99.9)).toBe('$99.90')
    })

    it('should validate realm ID', () => {
      expect(quickBooksService.validateRealmId('123456789')).toBe(true)
      expect(quickBooksService.validateRealmId('abc123')).toBe(false)
      expect(quickBooksService.validateRealmId('')).toBe(false)
      expect(quickBooksService.validateRealmId('123')).toBe(true)
    })

    it('should check if token is expired', () => {
      const expiredToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        realmId: '123',
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      }

      const validToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        realmId: '123',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      }

      expect(quickBooksService.isTokenExpired(expiredToken)).toBe(true)
      expect(quickBooksService.isTokenExpired(validToken)).toBe(false)
    })
  })

  describe('Missing Method Coverage', () => {
    it('should update customer in QuickBooks', async () => {
      const updateData = {
        name: 'Updated Customer Name',
        email: 'updated@example.com',
        phone: '555-999-8888'
      }

      const mockUpdatedCustomer = { id: 'qb_customer_123', ...updateData, active: true }

      mockApi.put.mockResolvedValueOnce({ data: mockUpdatedCustomer })

      const result = await quickBooksService.updateCustomerInQB('qb_customer_123', updateData)

      expect(result).toEqual(mockUpdatedCustomer)
      expect(mockApi.put).toHaveBeenCalledWith('/api/quickbooks/customers/qb_customer_123', updateData)
    })

    it('should create item in QuickBooks', async () => {
      const itemData = {
        name: 'New Product',
        sku: 'NEW-SKU-001',
        description: 'A new product',
        unitPrice: 19.99,
        quantityOnHand: 100,
        active: true,
        taxable: true
      }

      const mockCreatedItem = { id: 'qb_item_new', ...itemData }

      mockApi.post.mockResolvedValueOnce({ data: mockCreatedItem })

      const result = await quickBooksService.createItemInQB(itemData)

      expect(result).toEqual(mockCreatedItem)
      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/items', itemData)
    })

    it('should void sales receipt', async () => {
      const reason = 'Customer requested refund'

      mockApi.post.mockResolvedValueOnce({ data: {} })

      await quickBooksService.voidSalesReceipt('qb_receipt_123', reason)

      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/sales-receipts/qb_receipt_123/void', { reason })
    })

    it('should get account mapping', async () => {
      const mockMapping = {
        salesAccount: '1',
        taxAccount: '2',
        cashAccount: '3',
        cardAccount: '4',
        giftCardAccount: '5',
        inventoryAccount: '6',
        cogsAccount: '7'
      }

      mockApi.get.mockResolvedValueOnce({ data: mockMapping })

      const result = await quickBooksService.getAccountMapping()

      expect(result).toEqual(mockMapping)
      expect(mockApi.get).toHaveBeenCalledWith('/api/quickbooks/account-mapping')
    })

    it('should disconnect from QuickBooks', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} })

      await quickBooksService.disconnect()

      expect(mockApi.post).toHaveBeenCalledWith('/api/quickbooks/disconnect')
    })
  })

  describe('Error Handling - Comprehensive Coverage', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API Error'))

      await expect(quickBooksService.getAuthUrl()).rejects.toThrow('Failed to get QuickBooks authorization URL')
    })

    it('should handle network errors for customer sync', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'))

      await expect(quickBooksService.syncCustomer('customer_123')).rejects.toThrow('Failed to sync customer with QuickBooks')
    })

    it('should handle server errors for transaction creation', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Server Error'))

      const transactionData = {
        customerId: 'customer_123',
        transactionDate: '2024-08-11',
        totalAmount: 100,
        taxAmount: 8,
        lineItems: [],
        paymentMethod: 'Cash'
      }

      await expect(quickBooksService.createSalesReceipt(transactionData)).rejects.toThrow('Failed to create sales receipt in QuickBooks')
    })

    it('should handle oauth token exchange errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('OAuth Error'))

      await expect(quickBooksService.exchangeCodeForTokens('invalid_code', '123', 'state')).rejects.toThrow('Failed to exchange authorization code')
    })

    it('should handle token refresh errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Token refresh failed'))

      await expect(quickBooksService.refreshToken()).rejects.toThrow('Failed to refresh QuickBooks token')
    })

    it('should handle company info errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Company info error'))

      await expect(quickBooksService.getCompanyInfo()).rejects.toThrow('Failed to get QuickBooks company information')
    })

    it('should handle customer creation errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Customer creation failed'))

      const customerData = { name: 'Test Customer', active: true }

      await expect(quickBooksService.createCustomerInQB(customerData)).rejects.toThrow('Failed to create customer in QuickBooks')
    })

    it('should handle customer update errors', async () => {
      mockApi.put.mockRejectedValueOnce(new Error('Customer update failed'))

      const updateData = { name: 'Updated Name' }

      await expect(quickBooksService.updateCustomerInQB('cust-123', updateData)).rejects.toThrow('Failed to update customer in QuickBooks')
    })

    it('should handle sync all items errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Sync all items failed'))

      await expect(quickBooksService.syncAllItems()).rejects.toThrow('Failed to sync inventory with QuickBooks')
    })

    it('should handle sync item errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Sync item failed'))

      await expect(quickBooksService.syncItem('item-123')).rejects.toThrow('Failed to sync product with QuickBooks')
    })

    it('should handle item creation errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Item creation failed'))

      const itemData = { name: 'Test Item', unitPrice: 10, active: true, taxable: true }

      await expect(quickBooksService.createItemInQB(itemData)).rejects.toThrow('Failed to create product in QuickBooks')
    })

    it('should handle item quantity adjustment errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Quantity adjustment failed'))

      await expect(quickBooksService.updateItemQuantity('item-123', 50, 'reason')).rejects.toThrow('Failed to adjust inventory quantity in QuickBooks')
    })

    it('should handle sync transaction errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Sync transaction failed'))

      await expect(quickBooksService.syncTransaction('trans-123')).rejects.toThrow('Failed to sync transaction with QuickBooks')
    })

    it('should handle void sales receipt errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Void receipt failed'))

      await expect(quickBooksService.voidSalesReceipt('receipt-123', 'reason')).rejects.toThrow('Failed to void sales receipt in QuickBooks')
    })

    it('should handle chart of accounts errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Chart of accounts error'))

      await expect(quickBooksService.getChartOfAccounts()).rejects.toThrow('Failed to get QuickBooks chart of accounts')
    })

    it('should handle account mapping update errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Account mapping update failed'))

      const mapping = { salesAccount: '1', taxAccount: '2' }

      await expect(quickBooksService.updateAccountMapping(mapping)).rejects.toThrow('Failed to update chart of accounts mapping')
    })

    it('should handle account mapping get errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Account mapping get failed'))

      await expect(quickBooksService.getAccountMapping()).rejects.toThrow('Failed to get chart of accounts mapping')
    })

    it('should handle export transactions errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Export failed'))

      await expect(quickBooksService.exportTransactions('2024-01-01', '2024-01-31')).rejects.toThrow('Failed to export transactions to QuickBooks')
    })

    it('should handle tax report errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Tax report failed'))

      await expect(quickBooksService.getTaxReport('2024-01-01', '2024-01-31')).rejects.toThrow('Failed to get tax report from QuickBooks')
    })

    it('should handle profit & loss report errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('P&L report failed'))

      await expect(quickBooksService.getProfitLoss('2024-01-01', '2024-01-31')).rejects.toThrow('Failed to get profit & loss report from QuickBooks')
    })

    it('should handle force sync all errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Force sync failed'))

      await expect(quickBooksService.forceSyncAll()).rejects.toThrow('Failed to force sync with QuickBooks')
    })

    it('should handle disconnect errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Disconnect failed'))

      await expect(quickBooksService.disconnect()).rejects.toThrow('Failed to disconnect from QuickBooks')
    })
  })

  describe('Edge Cases and Additional Coverage', () => {
    it('should handle empty realm ID validation', () => {
      expect(quickBooksService.validateRealmId('')).toBe(false)
      expect(quickBooksService.validateRealmId('   ')).toBe(false)
      expect(quickBooksService.validateRealmId('0')).toBe(true)
    })

    it('should handle special characters in realm ID validation', () => {
      expect(quickBooksService.validateRealmId('123-456')).toBe(false)
      expect(quickBooksService.validateRealmId('123.456')).toBe(false)
      expect(quickBooksService.validateRealmId('123abc')).toBe(false)
      expect(quickBooksService.validateRealmId('1234567890')).toBe(true)
    })

    it('should format various currency amounts correctly', () => {
      expect(quickBooksService.formatCurrency(0.01)).toBe('$0.01')
      expect(quickBooksService.formatCurrency(999999.99)).toBe('$999,999.99')
      expect(quickBooksService.formatCurrency(-100.50)).toBe('-$100.50')
    })

    it('should handle edge case dates for token expiration', () => {
      const exactlyNowToken = {
        accessToken: 'token',
        refreshToken: 'refresh',
        realmId: '123',
        expiresAt: new Date()
      }

      // Should be expired if exactly now (>= comparison)
      expect(quickBooksService.isTokenExpired(exactlyNowToken)).toBe(true)
    })

    it('should handle sync status with empty error response gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error(''))

      const result = await quickBooksService.getSyncStatus()

      expect(result.connected).toBe(false)
      expect(result.errors).toContain('Failed to check sync status')
    })
  })
})