/**
 * Zentralisierte Konstanten für die Anwendung
 */

// Document status configuration
export const DOC_STATUS_CONFIG = {
  PENDING: { label: 'Ausstehend', color: 'text-gray-500' },
  PROCESSING: { label: 'Verarbeitung...', color: 'text-blue-500' },
  PROCESSED: { label: 'Verarbeitet', color: 'text-green-500' },
  FAILED: { label: 'Fehlgeschlagen', color: 'text-red-500' },
  VERIFIED: { label: 'Verifiziert', color: 'text-green-600' },
} as const

export type DocumentStatusKey = keyof typeof DOC_STATUS_CONFIG

// Settlement status configuration (used with icons from lucide-react)
export const SETTLEMENT_STATUS_CONFIG = {
  DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800' },
  CALCULATED: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800' },
  FINALIZED: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800' },
} as const

export type SettlementStatusKey = keyof typeof SETTLEMENT_STATUS_CONFIG

// Accepted file types for document upload
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const

export const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const

// Allocation method labels (German)
export const ALLOCATION_METHOD_LABELS: Record<string, string> = {
  WOHNFLAECHE: 'Wohnfläche',
  PERSONENZAHL: 'Personenzahl',
  EINHEIT: 'Pro Einheit',
  VERBRAUCH: 'Verbrauch',
  MITEIGENTUMSANTEIL: 'Miteigentumsanteil',
}

// Polling interval for document processing status (ms)
export const POLLING_INTERVAL_MS = 2000

// File size validation
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/**
 * Validate if a file type is accepted for upload
 */
export function isValidFileType(file: File): boolean {
  return (
    ACCEPTED_FILE_TYPES.includes(file.type as typeof ACCEPTED_FILE_TYPES[number]) ||
    ACCEPTED_FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
  )
}
