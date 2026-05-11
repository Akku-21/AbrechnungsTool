import { apiClient } from './client'
import { UnitAllocation, UnitAllocationCreate, UnitAllocationUpdate } from '@/types'

export const unitAllocationsApi = {
  list: async (unitId: string): Promise<UnitAllocation[]> => {
    const response = await apiClient.get('/unit-allocations', {
      params: { unit_id: unitId },
    })
    return response.data
  },

  create: async (data: UnitAllocationCreate): Promise<UnitAllocation> => {
    const response = await apiClient.post('/unit-allocations', data)
    return response.data
  },

  update: async (id: string, data: UnitAllocationUpdate): Promise<UnitAllocation> => {
    const response = await apiClient.put(`/unit-allocations/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/unit-allocations/${id}`)
  },

  bulkUpsert: async (unitId: string, data: UnitAllocationCreate[]): Promise<UnitAllocation[]> => {
    const response = await apiClient.put(`/unit-allocations/unit/${unitId}/bulk`, data)
    return response.data
  },
}
