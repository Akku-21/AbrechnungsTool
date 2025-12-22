import { apiClient } from './client'
import { Tenant, TenantCreate, TenantUpdate } from '@/types'

export const tenantsApi = {
  list: async (unitId?: string, isActive?: boolean): Promise<Tenant[]> => {
    const params: Record<string, string | boolean> = {}
    if (unitId) params.unit_id = unitId
    if (isActive !== undefined) params.is_active = isActive
    const response = await apiClient.get('/tenants', { params })
    return response.data
  },

  get: async (id: string): Promise<Tenant> => {
    const response = await apiClient.get(`/tenants/${id}`)
    return response.data
  },

  create: async (data: TenantCreate): Promise<Tenant> => {
    const response = await apiClient.post('/tenants', data)
    return response.data
  },

  update: async (id: string, data: TenantUpdate): Promise<Tenant> => {
    const response = await apiClient.put(`/tenants/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenants/${id}`)
  },

  moveOut: async (id: string, moveOutDate: string): Promise<Tenant> => {
    const response = await apiClient.post(`/tenants/${id}/move-out`, null, {
      params: { move_out_date: moveOutDate },
    })
    return response.data
  },
}
