import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsApi } from '@/lib/api/units'
import { UnitCreate, UnitUpdate } from '@/types'

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', { propertyId }],
    queryFn: () => unitsApi.list(propertyId),
  })
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: () => unitsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UnitCreate) => unitsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties', variables.property_id] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitUpdate }) =>
      unitsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['units', id] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unitsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
