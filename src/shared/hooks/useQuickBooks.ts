import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { quickBooksService } from '../services/quickbooks'
import type { 
  QBCustomer, 
  QBItem, 
  QBSalesReceipt, 
  ChartOfAccountsMapping 
} from '../services/quickbooks'

// Connection and OAuth hooks
export function useQuickBooksAuth() {
  return useMutation({
    mutationFn: async (params: { code: string; realmId: string; state?: string }) => {
      return quickBooksService.exchangeCodeForTokens(params.code, params.realmId, params.state)
    },
    onSuccess: () => {
      // Invalidate related queries after successful connection
      useQueryClient().invalidateQueries({ queryKey: ['quickbooks', 'status'] })
      useQueryClient().invalidateQueries({ queryKey: ['quickbooks', 'company'] })
    }
  })
}

export function useQuickBooksAuthUrl() {
  return useQuery({
    queryKey: ['quickbooks', 'auth-url'],
    queryFn: () => quickBooksService.getAuthUrl(),
    enabled: false, // Only fetch when explicitly called
    staleTime: 0, // Always fresh
    gcTime: 0 // Don't cache
  })
}

export function useQuickBooksCompany() {
  return useQuery({
    queryKey: ['quickbooks', 'company'],
    queryFn: () => quickBooksService.getCompanyInfo(),
    retry: 1,
    refetchOnWindowFocus: false
  })
}

// Sync Status and Health
export function useQuickBooksSyncStatus() {
  return useQuery({
    queryKey: ['quickbooks', 'status'],
    queryFn: () => quickBooksService.getSyncStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  })
}

// Chart of Accounts
export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['quickbooks', 'accounts'],
    queryFn: () => quickBooksService.getChartOfAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  })
}

export function useAccountMapping() {
  return useQuery({
    queryKey: ['quickbooks', 'account-mapping'],
    queryFn: () => quickBooksService.getAccountMapping(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  })
}

export function useUpdateAccountMapping() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (mapping: ChartOfAccountsMapping) => 
      quickBooksService.updateAccountMapping(mapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'account-mapping'] })
    }
  })
}

// Customer Synchronization
export function useSyncCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (customerId: string) => quickBooksService.syncCustomer(customerId),
    onSuccess: (data, customerId) => {
      // Invalidate customer queries
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

export function useCreateCustomerInQB() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (customerData: Omit<QBCustomer, 'id'>) => 
      quickBooksService.createCustomerInQB(customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

// Inventory/Item Synchronization
export function useSyncAllItems() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => quickBooksService.syncAllItems(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

export function useSyncItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (productId: string) => quickBooksService.syncItem(productId),
    onSuccess: (data, productId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

export function useCreateItemInQB() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (itemData: Omit<QBItem, 'id'>) => 
      quickBooksService.createItemInQB(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

export function useUpdateItemQuantity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: { itemId: string; newQuantity: number; reason: string }) =>
      quickBooksService.updateItemQuantity(params.itemId, params.newQuantity, params.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

// Transaction Synchronization
export function useSyncTransaction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (transactionId: string) => quickBooksService.syncTransaction(transactionId),
    onSuccess: (data, transactionId) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

export function useCreateSalesReceipt() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (transactionData: Omit<QBSalesReceipt, 'id'>) =>
      quickBooksService.createSalesReceipt(transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

// Reporting
export function useQuickBooksTaxReport(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ['quickbooks', 'reports', 'tax', startDate, endDate],
    queryFn: () => quickBooksService.getTaxReport(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

export function useQuickBooksProfitLoss(startDate: string, endDate: string, enabled = true) {
  return useQuery({
    queryKey: ['quickbooks', 'reports', 'profit-loss', startDate, endDate],
    queryFn: () => quickBooksService.getProfitLoss(startDate, endDate),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

// Bulk Operations
export function useForceSyncAll() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => quickBooksService.forceSyncAll(),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'status'] })
    }
  })
}

// Export Functions
export function useExportTransactions() {
  return useMutation({
    mutationFn: (params: { startDate: string; endDate: string }) =>
      quickBooksService.exportTransactions(params.startDate, params.endDate),
    onSuccess: (blob) => {
      // Create download link for the exported file
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quickbooks-export-${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    }
  })
}

// Connection Management
export function useDisconnectQuickBooks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => quickBooksService.disconnect(),
    onSuccess: () => {
      // Clear all QuickBooks-related queries
      queryClient.invalidateQueries({ queryKey: ['quickbooks'] })
    }
  })
}