import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/lib/api/documents'

export function useDocuments(settlementId: string) {
  return useQuery({
    queryKey: ['documents', { settlementId }],
    queryFn: () => documentsApi.listBySettlement(settlementId),
    enabled: !!settlementId,
  })
}

export function useOCRResult(documentId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['ocr-result', documentId],
    queryFn: () => documentsApi.getOcrResult(documentId),
    enabled: !!documentId && enabled,
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ settlementId, file }: { settlementId: string; file: File }) =>
      documentsApi.upload(settlementId, file),
    onSuccess: (_, { settlementId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', { settlementId }] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { include_in_export?: boolean } }) =>
      documentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useProcessDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentsApi.process(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
    },
  })
}

export function useReExtractDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => documentsApi.reExtract(id),
    onSuccess: (data, id) => {
      // Aktualisiere OCR-Result Cache direkt mit neuen Daten
      queryClient.setQueryData(['ocr-result', id], data)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
