import { apiClient } from './client'
import {
  UnitSettlement,
  UnitSettlementUpdate,
  UnitSettlementListResponse,
  Document,
} from '@/types'

export const unitSettlementsApi = {
  /**
   * Liste aller Einzelabrechnungen einer Settlement
   */
  listBySettlement: async (settlementId: string): Promise<UnitSettlementListResponse> => {
    const response = await apiClient.get(`/settlements/${settlementId}/unit-settlements`)
    return response.data
  },

  /**
   * Einzelabrechnung abrufen
   */
  get: async (id: string): Promise<UnitSettlement> => {
    const response = await apiClient.get(`/unit-settlements/${id}`)
    return response.data
  },

  /**
   * Einzelabrechnung aktualisieren (nur Notes)
   */
  update: async (id: string, data: UnitSettlementUpdate): Promise<UnitSettlement> => {
    const response = await apiClient.patch(`/unit-settlements/${id}`, data)
    return response.data
  },

  /**
   * Dokumente einer Einzelabrechnung abrufen
   */
  listDocuments: async (id: string): Promise<Document[]> => {
    const response = await apiClient.get(`/unit-settlements/${id}/documents`)
    return response.data
  },

  /**
   * Dokument zu einer Einzelabrechnung hochladen
   */
  uploadDocument: async (id: string, file: File): Promise<{ id: string; filename: string; status: string; message: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/unit-settlements/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * PDF für eine einzelne Wohneinheit exportieren
   */
  exportPdf: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/unit-settlements/${id}/export/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },
}
