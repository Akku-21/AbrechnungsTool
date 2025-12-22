import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settlementsApi } from '@/lib/api/settlements'
import { SettlementCreate, SettlementUpdate } from '@/types'

export function useSettlements(propertyId?: string, status?: string) {
  return useQuery({
    queryKey: ['settlements', { propertyId, status }],
    queryFn: () => settlementsApi.list(propertyId, status),
  })
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: ['settlements', id],
    queryFn: () => settlementsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SettlementCreate) => settlementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
  })
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SettlementUpdate }) =>
      settlementsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements', id] })
    },
  })
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settlementsApi.delete(id),
    onSuccess: (_, id) => {
      // Remove the deleted settlement from cache instead of refetching
      queryClient.removeQueries({ queryKey: ['settlements', id] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
  })
}

export function useCalculateSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settlementsApi.calculate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements', id] })
    },
  })
}

export function useFinalizeSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settlementsApi.finalize(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements', id] })
    },
  })
}

export function useCopySettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settlementsApi.copy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
    },
  })
}
