import { apiClient } from './client'

export interface Settings {
  company_name: string
  company_street: string
  company_postal_code: string
  company_city: string
  default_allocation_percentage: string
  signing_enabled: boolean
  signing_cert_path: string | null
}

export interface SettingsUpdate {
  company_name?: string
  company_street?: string
  company_postal_code?: string
  company_city?: string
  default_allocation_percentage?: string
}

export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await apiClient.get('/settings')
    return response.data
  },

  update: async (data: SettingsUpdate): Promise<Settings> => {
    const response = await apiClient.put('/settings', data)
    return response.data
  },
}
