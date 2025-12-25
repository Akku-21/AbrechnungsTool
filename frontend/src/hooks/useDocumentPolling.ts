import { useEffect, useCallback } from 'react'
import { POLLING_INTERVAL_MS } from '@/lib/constants'

interface DocumentLike {
  document_status: string
}

/**
 * Hook for polling document processing status
 * Automatically refetches data when documents are being processed
 */
export function useDocumentPolling(
  documents: DocumentLike[] | undefined,
  refetchFunctions: (() => void)[]
) {
  const hasProcessingDocs = documents?.some(d => d.document_status === 'PROCESSING') ?? false

  const refetchAll = useCallback(() => {
    refetchFunctions.forEach(fn => fn())
  }, [refetchFunctions])

  useEffect(() => {
    if (!hasProcessingDocs) return

    const interval = setInterval(refetchAll, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [hasProcessingDocs, refetchAll])

  return { hasProcessingDocs }
}
