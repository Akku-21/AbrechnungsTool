import { apiClient } from './client'
import type { SignatureSettings, SignatureType, SignatureTextUpdate, SignaturePadSave, TextFontStyle } from '@/types'

export interface Settings {
  company_name: string
  company_street: string
  company_postal_code: string
  company_city: string
  // Legacy signing (deprecated)
  signing_enabled: boolean
  signing_cert_path: string | null
  // Neue Signatur-Einstellungen
  signature_type: SignatureType
  signature_configured: boolean
  signature_text: string | null
  signature_text_font: TextFontStyle | null
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

  // Signatur-Endpoints
  getSignatureSettings: async (): Promise<SignatureSettings> => {
    const response = await apiClient.get('/settings/signature')
    return response.data
  },

  updateSignatureType: async (signatureType: SignatureType): Promise<SignatureSettings> => {
    const response = await apiClient.put('/settings/signature/type', { signature_type: signatureType })
    return response.data
  },

  uploadCertificate: async (file: File, password: string): Promise<SignatureSettings> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('password', password)
    const response = await apiClient.post('/settings/signature/certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteCertificate: async (): Promise<SignatureSettings> => {
    const response = await apiClient.delete('/settings/signature/certificate')
    return response.data
  },

  uploadSignatureImage: async (file: File): Promise<SignatureSettings> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/settings/signature/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  saveSignaturePad: async (imageData: string): Promise<SignatureSettings> => {
    const response = await apiClient.post('/settings/signature/pad', { image_data: imageData })
    return response.data
  },

  updateSignatureText: async (text: string, font: TextFontStyle): Promise<SignatureSettings> => {
    const response = await apiClient.put('/settings/signature/text', { text, font })
    return response.data
  },

  clearSignature: async (): Promise<SignatureSettings> => {
    const response = await apiClient.delete('/settings/signature')
    return response.data
  },
}
