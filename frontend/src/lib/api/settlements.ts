import { apiClient } from './client'
import { Settlement, SettlementCreate, SettlementUpdate } from '@/types'

export const settlementsApi = {
  list: async (propertyId?: string, status?: string): Promise<Settlement[]> => {
    const params: Record<string, string> = {}
    if (propertyId) params.property_id = propertyId
    if (status) params.status = status
    const response = await apiClient.get('/settlements', { params })
    return response.data
  },

  get: async (id: string): Promise<Settlement> => {
    const response = await apiClient.get(`/settlements/${id}`)
    return response.data
  },

  create: async (data: SettlementCreate): Promise<Settlement> => {
    const response = await apiClient.post('/settlements', data)
    return response.data
  },

  update: async (id: string, data: SettlementUpdate): Promise<Settlement> => {
    const response = await apiClient.put(`/settlements/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/settlements/${id}`)
  },

  calculate: async (id: string): Promise<Settlement> => {
    const response = await apiClient.post(`/settlements/${id}/calculate`)
    return response.data
  },

  finalize: async (id: string): Promise<Settlement> => {
    const response = await apiClient.post(`/settlements/${id}/finalize`)
    return response.data
  },

  copy: async (id: string): Promise<Settlement> => {
    const response = await apiClient.post(`/settlements/${id}/copy`)
    return response.data
  },

  exportPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/settlements/${id}/export/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },
}
