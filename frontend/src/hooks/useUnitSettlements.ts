import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitSettlementsApi } from '@/lib/api/unitSettlements'
import { UnitSettlementUpdate } from '@/types'

/**
 * Liste aller Einzelabrechnungen einer Settlement
 */
export function useUnitSettlements(settlementId: string) {
  return useQuery({
    queryKey: ['settlements', settlementId, 'unit-settlements'],
    queryFn: () => unitSettlementsApi.listBySettlement(settlementId),
    enabled: !!settlementId,
  })
}

/**
 * Einzelne Einzelabrechnung abrufen
 */
export function useUnitSettlement(id: string) {
  return useQuery({
    queryKey: ['unit-settlements', id],
    queryFn: () => unitSettlementsApi.get(id),
    enabled: !!id,
  })
}

/**
 * Dokumente einer Einzelabrechnung abrufen
 */
export function useUnitSettlementDocuments(unitSettlementId: string) {
  return useQuery({
    queryKey: ['unit-settlements', unitSettlementId, 'documents'],
    queryFn: () => unitSettlementsApi.listDocuments(unitSettlementId),
    enabled: !!unitSettlementId,
  })
}

/**
 * Einzelabrechnung aktualisieren (Notes)
 */
export function useUpdateUnitSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitSettlementUpdate }) =>
      unitSettlementsApi.update(id, data),
    onSuccess: (result) => {
      // Einzelabrechnung Cache aktualisieren
      queryClient.invalidateQueries({ queryKey: ['unit-settlements', result.id] })
      // Liste auch aktualisieren
      queryClient.invalidateQueries({
        queryKey: ['settlements', result.settlement_id, 'unit-settlements'],
      })
    },
  })
}

/**
 * Dokument zu einer Einzelabrechnung hochladen
 */
export function useUploadUnitSettlementDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      unitSettlementsApi.uploadDocument(id, file),
    onSuccess: (_, { id }) => {
      // Cache invalidieren damit die Dokumente neu geladen werden
      queryClient.invalidateQueries({ queryKey: ['unit-settlements', id] })
      queryClient.invalidateQueries({ queryKey: ['unit-settlements', id, 'documents'] })
    },
  })
}

/**
 * PDF Export für Einzelabrechnung
 * Gibt ein Blob zurück das heruntergeladen werden kann
 */
export function useExportUnitSettlementPdf() {
  return useMutation({
    mutationFn: (id: string) => unitSettlementsApi.exportPdf(id),
  })
}
