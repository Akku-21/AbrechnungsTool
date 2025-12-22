import { apiClient } from './client'
import { Property, PropertyCreate, PropertyUpdate, PropertyListResponse } from '@/types'

export const propertiesApi = {
  list: async (skip = 0, limit = 100): Promise<PropertyListResponse> => {
    const response = await apiClient.get('/properties', { params: { skip, limit } })
    return response.data
  },

  get: async (id: string): Promise<Property> => {
    const response = await apiClient.get(`/properties/${id}`)
    return response.data
  },

  create: async (data: PropertyCreate): Promise<Property> => {
    const response = await apiClient.post('/properties', data)
    return response.data
  },

  update: async (id: string, data: PropertyUpdate): Promise<Property> => {
    const response = await apiClient.put(`/properties/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/properties/${id}`)
  },
}
