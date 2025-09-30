/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Mock useQueryClient for hooks that use it
const mockQueryClient = {
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
  cancelQueries: jest.fn(),
  refetchQueries: jest.fn()
}

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => mockQueryClient
}))
import { quickBooksService } from '../../../shared/services/quickbooks'
import {
  useQuickBooksAuth,
  useQuickBooksAuthUrl,
  useQuickBooksCompany,
  useQuickBooksSyncStatus,
  useChartOfAccounts,
  useAccountMapping,
  useUpdateAccountMapping,
  useSyncCustomer,
  useCreateCustomerInQB,
  useSyncAllItems,
  useSyncItem,
  useCreateItemInQB,
  useUpdateItemQuantity,
  useSyncTransaction,
  useCreateSalesReceipt,
  useQuickBooksTaxReport,
  useQuickBooksProfitLoss,
  useForceSyncAll,
  useExportTransactions,
  useDisconnectQuickBooks
} from '../../../shared/hooks/useQuickBooks'
import type { ChartOfAccountsMapping } from '../../../shared/services/quickbooks'

// Mock the quickBooks service
jest.mock('../../../shared/services/quickbooks', () => ({
  quickBooksService: {
    exchangeCodeForTokens: jest.fn(),
    getAuthUrl: jest.fn(),
    getCompanyInfo: jest.fn(),
    getSyncStatus: jest.fn(),
    getChartOfAccounts: jest.fn(),
    getAccountMapping: jest.fn(),
    updateAccountMapping: jest.fn(),
    syncCustomer: jest.fn(),
    createCustomerInQB: jest.fn(),
    syncAllItems: jest.fn(),
    syncItem: jest.fn(),
    createItemInQB: jest.fn(),
    updateItemQuantity: jest.fn(),
    syncTransaction: jest.fn(),
    createSalesReceipt: jest.fn(),
    getTaxReport: jest.fn(),
    getProfitLoss: jest.fn(),
    forceSyncAll: jest.fn(),
    exportTransactions: jest.fn(),
    disconnect: jest.fn()
  }
}))

// Mock window.URL for file downloads
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
})

// Mock document.createElement for file downloads
const mockClick = jest.fn()
const mockLink = {
  href: '',
  download: '',
  click: mockClick
}

// Mock document.createElement for file downloads
const originalCreateElement = document.createElement.bind(document)
jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockLink as any
  }
  return originalCreateElement(tagName)
})

const mockQuickBooksService = quickBooksService as jest.Mocked<typeof quickBooksService>

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useQuickBooks Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear mock query client calls
    mockQueryClient.invalidateQueries.mockClear()
    mockQueryClient.setQueryData.mockClear()
    mockQueryClient.getQueryData.mockClear()
    mockQueryClient.cancelQueries.mockClear()
    mockQueryClient.refetchQueries.mockClear()
  })

  describe('Authentication Hooks', () => {
    describe('useQuickBooksAuth', () => {
      it('should exchange code for tokens successfully', async () => {
        const mockTokens = {
          accessToken: 'access123',
          refreshToken: 'refresh123',
          expiresIn: 3600
        }
        mockQuickBooksService.exchangeCodeForTokens.mockResolvedValue(mockTokens)

        const { result } = renderHook(() => useQuickBooksAuth(), {
          wrapper: createWrapper()
        })

        const params = { code: 'auth_code', realmId: 'realm123', state: 'state123' }
        result.current.mutate(params)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.exchangeCodeForTokens).toHaveBeenCalledWith(
          'auth_code',
          'realm123',
          'state123'
        )
        expect(result.current.data).toEqual(mockTokens)
      })

      it('should handle authentication errors', async () => {
        const mockError = new Error('Invalid authorization code')
        mockQuickBooksService.exchangeCodeForTokens.mockRejectedValue(mockError)

        const { result } = renderHook(() => useQuickBooksAuth(), {
          wrapper: createWrapper()
        })

        const params = { code: 'invalid_code', realmId: 'realm123' }
        result.current.mutate(params)

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useQuickBooksAuthUrl', () => {
      it('should get auth URL when enabled', async () => {
        const mockAuthUrl = 'https://appcenter.intuit.com/connect/oauth2?...'
        mockQuickBooksService.getAuthUrl.mockResolvedValue(mockAuthUrl)

        const { result } = renderHook(() => useQuickBooksAuthUrl(), {
          wrapper: createWrapper()
        })

        // Manually refetch since enabled is false by default
        result.current.refetch()

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockAuthUrl)
        expect(mockQuickBooksService.getAuthUrl).toHaveBeenCalledTimes(1)
      })

      it('should handle auth URL errors', async () => {
        const mockError = new Error('Failed to generate auth URL')
        mockQuickBooksService.getAuthUrl.mockRejectedValue(mockError)

        const { result } = renderHook(() => useQuickBooksAuthUrl(), {
          wrapper: createWrapper()
        })

        result.current.refetch()

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        })

        expect(result.current.error).toEqual(mockError)
      })
    })

    describe('useQuickBooksCompany', () => {
      it('should fetch company info successfully', async () => {
        const mockCompanyInfo = {
          id: 'company123',
          name: 'Test Company Inc.',
          country: 'US',
          currency: 'USD'
        }
        mockQuickBooksService.getCompanyInfo.mockResolvedValue(mockCompanyInfo)

        const { result } = renderHook(() => useQuickBooksCompany(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockCompanyInfo)
        expect(mockQuickBooksService.getCompanyInfo).toHaveBeenCalledTimes(1)
      })

      it('should handle company info fetch errors', async () => {
        const mockError = new Error('Company not found')
        mockQuickBooksService.getCompanyInfo.mockRejectedValue(mockError)

        const { result } = renderHook(() => useQuickBooksCompany(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isError).toBe(true)
        }, { timeout: 3000 })

        expect(result.current.error).toEqual(mockError)
      })
    })
  })

  describe('Sync Status Hooks', () => {
    describe('useQuickBooksSyncStatus', () => {
      it('should fetch sync status with auto-refresh', async () => {
        const mockSyncStatus = {
          connected: true,
          lastSync: new Date().toISOString(),
          errors: [],
          summary: { customers: 10, items: 25, transactions: 100 }
        }
        mockQuickBooksService.getSyncStatus.mockResolvedValue(mockSyncStatus)

        const { result } = renderHook(() => useQuickBooksSyncStatus(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockSyncStatus)
        expect(mockQuickBooksService.getSyncStatus).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Chart of Accounts Hooks', () => {
    describe('useChartOfAccounts', () => {
      it('should fetch chart of accounts', async () => {
        const mockAccounts = [
          { id: '1', name: 'Sales Revenue', type: 'Income' },
          { id: '2', name: 'Cost of Goods Sold', type: 'COGS' }
        ]
        mockQuickBooksService.getChartOfAccounts.mockResolvedValue(mockAccounts)

        const { result } = renderHook(() => useChartOfAccounts(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockAccounts)
      })
    })

    describe('useAccountMapping', () => {
      it('should fetch account mapping', async () => {
        const mockMapping: ChartOfAccountsMapping = {
          salesAccount: 'account-1',
          taxAccount: 'account-2',
          discountAccount: 'account-3',
          cogAccount: 'account-4',
          inventoryAccount: 'account-5'
        }
        mockQuickBooksService.getAccountMapping.mockResolvedValue(mockMapping)

        const { result } = renderHook(() => useAccountMapping(), {
          wrapper: createWrapper()
        })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockMapping)
      })
    })

    describe('useUpdateAccountMapping', () => {
      it('should update account mapping successfully', async () => {
        const mockMapping: ChartOfAccountsMapping = {
          salesAccount: 'updated-account-1',
          taxAccount: 'updated-account-2',
          discountAccount: 'updated-account-3',
          cogAccount: 'updated-account-4',
          inventoryAccount: 'updated-account-5'
        }
        mockQuickBooksService.updateAccountMapping.mockResolvedValue(mockMapping)

        const { result } = renderHook(() => useUpdateAccountMapping(), {
          wrapper: createWrapper()
        })

        result.current.mutate(mockMapping)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.updateAccountMapping).toHaveBeenCalledWith(mockMapping)
      })
    })
  })

  describe('Customer Sync Hooks', () => {
    describe('useSyncCustomer', () => {
      it('should sync customer successfully', async () => {
        const mockSyncResult = { success: true, customerId: 'customer-123', qbId: 'qb-456' }
        mockQuickBooksService.syncCustomer.mockResolvedValue(mockSyncResult)

        const { result } = renderHook(() => useSyncCustomer(), {
          wrapper: createWrapper()
        })

        result.current.mutate('customer-123')

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.syncCustomer).toHaveBeenCalledWith('customer-123')
        expect(result.current.data).toEqual(mockSyncResult)
      })
    })

    describe('useCreateCustomerInQB', () => {
      it('should create customer in QuickBooks', async () => {
        const customerData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123'
        }
        const mockResult = { id: 'qb-customer-123', ...customerData }
        mockQuickBooksService.createCustomerInQB.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useCreateCustomerInQB(), {
          wrapper: createWrapper()
        })

        result.current.mutate(customerData)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.createCustomerInQB).toHaveBeenCalledWith(customerData)
        expect(result.current.data).toEqual(mockResult)
      })
    })
  })

  describe('Item Sync Hooks', () => {
    describe('useSyncAllItems', () => {
      it('should sync all items successfully', async () => {
        const mockResult = {
          success: true,
          synced: 25,
          errors: []
        }
        mockQuickBooksService.syncAllItems.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useSyncAllItems(), {
          wrapper: createWrapper()
        })

        result.current.mutate()

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.syncAllItems).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockResult)
      })
    })

    describe('useSyncItem', () => {
      it('should sync individual item', async () => {
        const mockResult = { success: true, productId: 'product-123', qbId: 'qb-item-456' }
        mockQuickBooksService.syncItem.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useSyncItem(), {
          wrapper: createWrapper()
        })

        result.current.mutate('product-123')

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.syncItem).toHaveBeenCalledWith('product-123')
        expect(result.current.data).toEqual(mockResult)
      })
    })

    describe('useCreateItemInQB', () => {
      it('should create item in QuickBooks', async () => {
        const itemData = {
          name: 'Test Product',
          description: 'Test product description',
          unitPrice: 19.99,
          quantityOnHand: 100
        }
        const mockResult = { id: 'qb-item-123', ...itemData }
        mockQuickBooksService.createItemInQB.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useCreateItemInQB(), {
          wrapper: createWrapper()
        })

        result.current.mutate(itemData)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.createItemInQB).toHaveBeenCalledWith(itemData)
        expect(result.current.data).toEqual(mockResult)
      })
    })

    describe('useUpdateItemQuantity', () => {
      it('should update item quantity in QuickBooks', async () => {
        const params = {
          itemId: 'qb-item-123',
          newQuantity: 50,
          reason: 'Physical count adjustment'
        }
        const mockResult = { success: true, ...params }
        mockQuickBooksService.updateItemQuantity.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useUpdateItemQuantity(), {
          wrapper: createWrapper()
        })

        result.current.mutate(params)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.updateItemQuantity).toHaveBeenCalledWith(
          'qb-item-123',
          50,
          'Physical count adjustment'
        )
        expect(result.current.data).toEqual(mockResult)
      })
    })
  })

  describe('Transaction Sync Hooks', () => {
    describe('useSyncTransaction', () => {
      it('should sync transaction successfully', async () => {
        const mockResult = { success: true, transactionId: 'trans-123', qbId: 'qb-receipt-456' }
        mockQuickBooksService.syncTransaction.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useSyncTransaction(), {
          wrapper: createWrapper()
        })

        result.current.mutate('trans-123')

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.syncTransaction).toHaveBeenCalledWith('trans-123')
        expect(result.current.data).toEqual(mockResult)
      })
    })

    describe('useCreateSalesReceipt', () => {
      it('should create sales receipt in QuickBooks', async () => {
        const receiptData = {
          customer: 'qb-customer-123',
          lineItems: [
            { item: 'qb-item-456', quantity: 2, amount: 39.98 }
          ],
          totalAmount: 43.18,
          taxAmount: 3.20
        }
        const mockResult = { id: 'qb-receipt-789', ...receiptData }
        mockQuickBooksService.createSalesReceipt.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useCreateSalesReceipt(), {
          wrapper: createWrapper()
        })

        result.current.mutate(receiptData)

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.createSalesReceipt).toHaveBeenCalledWith(receiptData)
        expect(result.current.data).toEqual(mockResult)
      })
    })
  })

  describe('Reporting Hooks', () => {
    describe('useQuickBooksTaxReport', () => {
      it('should fetch tax report for date range', async () => {
        const mockTaxReport = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalTaxCollected: 1250.75,
          taxBreakdown: [
            { taxName: 'Sales Tax', amount: 1250.75 }
          ]
        }
        mockQuickBooksService.getTaxReport.mockResolvedValue(mockTaxReport)

        const { result } = renderHook(
          () => useQuickBooksTaxReport('2024-01-01', '2024-01-31', true),
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.getTaxReport).toHaveBeenCalledWith('2024-01-01', '2024-01-31')
        expect(result.current.data).toEqual(mockTaxReport)
      })

      it('should not fetch when disabled', () => {
        renderHook(
          () => useQuickBooksTaxReport('2024-01-01', '2024-01-31', false),
          { wrapper: createWrapper() }
        )

        expect(mockQuickBooksService.getTaxReport).not.toHaveBeenCalled()
      })

      it('should use default enabled parameter', async () => {
        const mockTaxReport = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalTaxCollected: 500.00,
          taxBreakdown: [{ taxName: 'Sales Tax', amount: 500.00 }]
        }
        mockQuickBooksService.getTaxReport.mockResolvedValue(mockTaxReport)

        const { result } = renderHook(
          () => useQuickBooksTaxReport('2024-01-01', '2024-01-31'), // No enabled parameter
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockTaxReport)
      })
    })

    describe('useQuickBooksProfitLoss', () => {
      it('should fetch profit & loss report', async () => {
        const mockPLReport = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalRevenue: 15000.00,
          totalExpenses: 8500.00,
          netIncome: 6500.00
        }
        mockQuickBooksService.getProfitLoss.mockResolvedValue(mockPLReport)

        const { result } = renderHook(
          () => useQuickBooksProfitLoss('2024-01-01', '2024-01-31', true),
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.getProfitLoss).toHaveBeenCalledWith('2024-01-01', '2024-01-31')
        expect(result.current.data).toEqual(mockPLReport)
      })

      it('should use default enabled parameter', async () => {
        const mockPLReport = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalRevenue: 10000.00,
          totalExpenses: 5000.00,
          netIncome: 5000.00
        }
        mockQuickBooksService.getProfitLoss.mockResolvedValue(mockPLReport)

        const { result } = renderHook(
          () => useQuickBooksProfitLoss('2024-01-01', '2024-01-31'), // No enabled parameter
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual(mockPLReport)
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('useForceSyncAll', () => {
      it('should force sync all data', async () => {
        const mockResult = {
          success: true,
          customers: { synced: 10, errors: 0 },
          items: { synced: 25, errors: 0 },
          transactions: { synced: 100, errors: 1 }
        }
        mockQuickBooksService.forceSyncAll.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useForceSyncAll(), {
          wrapper: createWrapper()
        })

        result.current.mutate()

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.forceSyncAll).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockResult)
      })
    })
  })

  describe('Export Functions', () => {
    describe('useExportTransactions', () => {
      it('should export transactions and trigger download', async () => {
        const mockBlob = new Blob(['mock excel data'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        mockQuickBooksService.exportTransactions.mockResolvedValue(mockBlob)
        mockCreateObjectURL.mockReturnValue('blob:mock-url')

        const { result } = renderHook(() => useExportTransactions(), {
          wrapper: createWrapper()
        })

        result.current.mutate({ startDate: '2024-01-01', endDate: '2024-01-31' })

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.exportTransactions).toHaveBeenCalledWith(
          '2024-01-01',
          '2024-01-31'
        )
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob)
        expect(mockLink.href).toBe('blob:mock-url')
        expect(mockLink.download).toContain('quickbooks-export-')
        expect(mockClick).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      })
    })
  })

  describe('Connection Management', () => {
    describe('useDisconnectQuickBooks', () => {
      it('should disconnect from QuickBooks', async () => {
        const mockResult = { success: true, message: 'Disconnected successfully' }
        mockQuickBooksService.disconnect.mockResolvedValue(mockResult)

        const { result } = renderHook(() => useDisconnectQuickBooks(), {
          wrapper: createWrapper()
        })

        result.current.mutate()

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true)
        })

        expect(mockQuickBooksService.disconnect).toHaveBeenCalledTimes(1)
        expect(result.current.data).toEqual(mockResult)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      mockQuickBooksService.getAuthUrl.mockRejectedValue(networkError)

      const { result } = renderHook(() => useQuickBooksAuthUrl(), {
        wrapper: createWrapper()
      })

      result.current.refetch()

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(networkError)
    })

    it('should handle QuickBooks API errors', async () => {
      const qbError = new Error('QuickBooks API Error: Invalid token')
      mockQuickBooksService.getCompanyInfo.mockRejectedValue(qbError)

      const { result } = renderHook(() => useQuickBooksCompany(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      }, { timeout: 5000 })

      expect(result.current.error).toEqual(qbError)
    })
  })
})