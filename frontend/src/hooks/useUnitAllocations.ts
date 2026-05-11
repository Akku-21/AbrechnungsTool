import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitAllocationsApi } from '@/lib/api/unitAllocations'
import { UnitAllocationCreate, UnitAllocationUpdate } from '@/types'

export function useUnitAllocations(unitId: string) {
  return useQuery({
    queryKey: ['units', unitId, 'allocations'],
    queryFn: () => unitAllocationsApi.list(unitId),
    enabled: !!unitId,
  })
}

export function useCreateUnitAllocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UnitAllocationCreate) => unitAllocationsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', variables.unit_id, 'allocations'] })
    },
  })
}

export function useUpdateUnitAllocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitAllocationUpdate }) =>
      unitAllocationsApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['units', result.unit_id, 'allocations'] })
    },
  })
}

export function useDeleteUnitAllocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, unitId }: { id: string; unitId: string }) =>
      unitAllocationsApi.delete(id),
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ['units', unitId, 'allocations'] })
    },
  })
}

export function useBulkUpsertUnitAllocations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: UnitAllocationCreate[] }) =>
      unitAllocationsApi.bulkUpsert(unitId, data),
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ['units', unitId, 'allocations'] })
    },
  })
}
