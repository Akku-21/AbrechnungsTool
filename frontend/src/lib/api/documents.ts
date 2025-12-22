import { apiClient } from './client'
import { Document, DocumentUploadResponse, OCRResult, DocumentUpdate } from '@/types'

export const documentsApi = {
  listBySettlement: async (settlementId: string): Promise<Document[]> => {
    const response = await apiClient.get(`/documents/settlement/${settlementId}`)
    return response.data
  },

  get: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`)
    return response.data
  },

  upload: async (settlementId: string, file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/documents/settlement/${settlementId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`)
  },

  update: async (id: string, data: DocumentUpdate): Promise<Document> => {
    const response = await apiClient.patch(`/documents/${id}`, data)
    return response.data
  },

  process: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/process`)
    return response.data
  },

  getOcrResult: async (id: string): Promise<OCRResult> => {
    const response = await apiClient.get(`/documents/${id}/ocr-result`)
    return response.data
  },

  downloadUrl: (id: string): string => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${API_URL}/api/v1/documents/${id}/download`
  },
}
