import { apiClient } from './client'
import { Unit, UnitCreate, UnitUpdate } from '@/types'

export const unitsApi = {
  list: async (propertyId?: string): Promise<Unit[]> => {
    const params = propertyId ? { property_id: propertyId } : {}
    const response = await apiClient.get('/units', { params })
    return response.data
  },

  get: async (id: string): Promise<Unit> => {
    const response = await apiClient.get(`/units/${id}`)
    return response.data
  },

  create: async (data: UnitCreate): Promise<Unit> => {
    const response = await apiClient.post('/units', data)
    return response.data
  },

  update: async (id: string, data: UnitUpdate): Promise<Unit> => {
    const response = await apiClient.put(`/units/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/units/${id}`)
  },
}
