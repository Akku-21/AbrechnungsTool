import { apiClient } from './client'

export interface Settings {
  company_name: string
  company_street: string
  company_postal_code: string
  company_city: string
  signing_enabled: boolean
  signing_cert_path: string | null
  // LLM-Einstellungen
  openrouter_api_key_set: boolean
  openrouter_model: string
  llm_correction_enabled: boolean
}

export interface SettingsUpdate {
  company_name?: string
  company_street?: string
  company_postal_code?: string
  company_city?: string
  // LLM-Einstellungen
  openrouter_api_key?: string
  openrouter_model?: string
  llm_correction_enabled?: boolean
}

export interface RecommendedModel {
  id: string
  name: string
}

export interface TestConnectionRequest {
  api_key?: string
  model?: string
}

export interface TestConnectionResponse {
  success: boolean
  message: string
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

  getRecommendedModels: async (): Promise<RecommendedModel[]> => {
    const response = await apiClient.get('/settings/recommended-models')
    return response.data
  },

  testOpenRouter: async (data: TestConnectionRequest): Promise<TestConnectionResponse> => {
    const response = await apiClient.post('/settings/test-openrouter', data)
    return response.data
  },
}
