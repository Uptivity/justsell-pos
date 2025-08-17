import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customerService } from '../services/customers'
import type { UpdateCustomerData, LoyaltyPointsUpdate } from '../types/customers'

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: customerService.createCustomer,
    onSuccess: (data) => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      
      // Update individual customer cache
      queryClient.setQueryData(['customer', data.id], data)
    },
    onError: (error: any) => {
      console.error('Customer creation failed:', error)
    }
  })
}

export const useCustomer = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getCustomer(id),
    enabled: enabled && !!id
  })
}

export const useCustomers = (page = 1, limit = 20, search?: string) => {
  return useQuery({
    queryKey: ['customers', page, limit, search],
    queryFn: () => customerService.getCustomers(page, limit, search),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) =>
      customerService.updateCustomer(id, data),
    onSuccess: (data, variables) => {
      // Update individual customer cache
      queryClient.setQueryData(['customer', variables.id], data)
      
      // Invalidate customers list to refresh
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: any) => {
      console.error('Customer update failed:', error)
    }
  })
}

export const useSearchCustomers = (query: string) => {
  return useQuery({
    queryKey: ['customers', 'search', query],
    queryFn: () => customerService.searchCustomers(query),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false
  })
}

export const useUpdateLoyaltyPoints = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LoyaltyPointsUpdate }) =>
      customerService.updateLoyaltyPoints(id, data),
    onSuccess: (response, variables) => {
      // Update individual customer cache
      queryClient.setQueryData(['customer', variables.id], response.customer)
      
      // Invalidate customers list to refresh loyalty points
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: any) => {
      console.error('Loyalty points update failed:', error)
    }
  })
}

// Hook for customer search dropdown (with debouncing)
export const useCustomerSearch = () => {
  const queryClient = useQueryClient()

  return {
    searchCustomers: (query: string) => {
      return queryClient.fetchQuery({
        queryKey: ['customers', 'search', query],
        queryFn: () => customerService.searchCustomers(query),
        staleTime: 2 * 60 * 1000
      })
    }
  }
}