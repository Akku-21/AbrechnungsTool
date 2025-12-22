import { apiClient } from './client'
import { Invoice, InvoiceCreate, InvoiceUpdate } from '@/types'

export const invoicesApi = {
  list: async (settlementId?: string): Promise<Invoice[]> => {
    const params = settlementId ? { settlement_id: settlementId } : {}
    const response = await apiClient.get('/invoices', { params })
    return response.data
  },

  get: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/invoices/${id}`)
    return response.data
  },

  create: async (data: InvoiceCreate): Promise<Invoice> => {
    const response = await apiClient.post('/invoices', data)
    return response.data
  },

  update: async (id: string, data: InvoiceUpdate): Promise<Invoice> => {
    const response = await apiClient.put(`/invoices/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`)
  },

  verify: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post(`/invoices/${id}/verify`)
    return response.data
  },

  getDefaultAllocation: async (settlementId: string): Promise<{
    default_allocation: number
    property_total_area: number
    units: {
      unit_id: string
      designation: string
      area_sqm: number
      allocation_percentage: number
    }[]
  }> => {
    const response = await apiClient.get(`/invoices/settlement/${settlementId}/default-allocation`)
    return response.data
  },
}
