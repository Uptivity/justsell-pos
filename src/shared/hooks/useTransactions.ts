import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '../services/transactions'

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: (data) => {
      // Invalidate and refetch transactions list
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      
      // Update individual transaction cache
      queryClient.setQueryData(['transaction', data.id], data)
    },
    onError: (error: any) => {
      console.error('Transaction creation failed:', error)
    }
  })
}

export const useTransaction = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionService.getTransaction(id),
    enabled: enabled && !!id
  })
}

export const useTransactions = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['transactions', page, limit],
    queryFn: () => transactionService.getTransactions(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

export const useValidateTransaction = () => {
  return useMutation({
    mutationFn: transactionService.validateTransaction
  })
}

export const useAgeVerification = () => {
  return useMutation({
    mutationFn: transactionService.processAgeVerification
  })
}

export const useTaxCalculation = () => {
  return useMutation({
    mutationFn: ({ subtotal, storeId, customerId }: { 
      subtotal: number
      storeId?: string
      customerId?: string 
    }) => transactionService.calculateTax(subtotal, storeId, customerId)
  })
}

export const useGenerateReceipt = () => {
  return useMutation({
    mutationFn: transactionService.generateReceipt
  })
}

export const usePrintReceipt = () => {
  return useMutation({
    mutationFn: transactionService.printReceipt
  })
}