'use client'

import { Button } from '@/components/ui/Button'
import { FileText, CheckCircle, Eye, FileSearch, Trash2, Loader2, Building2 } from 'lucide-react'
import { DOC_STATUS_CONFIG, DocumentStatusKey } from '@/lib/constants'
import { Document } from '@/types'

interface DocumentCardProps {
  document: Document
  hasInvoice: boolean
  isInherited?: boolean
  isReadOnly?: boolean
  onProcess?: (id: string) => void
  onShowOcr?: (doc: Document) => void
  onToggleExport?: (id: string, currentValue: boolean) => void
  onDelete?: (id: string) => void
  isProcessing?: boolean
}

export function DocumentCard({
  document,
  hasInvoice,
  isInherited = false,
  isReadOnly = false,
  onProcess,
  onShowOcr,
  onToggleExport,
  onDelete,
  isProcessing = false,
}: DocumentCardProps) {
  const docStatus = DOC_STATUS_CONFIG[document.document_status as DocumentStatusKey] || DOC_STATUS_CONFIG.PENDING
  const Icon = isInherited ? Building2 : FileText

  // Determine card styling based on state
  const cardClassName = isInherited
    ? `flex items-center justify-between p-3 border rounded-lg ${hasInvoice ? 'bg-green-50/30 border-green-200/50' : ''}`
    : `flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${hasInvoice ? 'border-green-200 bg-green-50/50' : ''}`

  return (
    <div className={cardClassName}>
      <div className="flex items-center gap-3">
        {/* Checkbox for include in export (only if not inherited and not read-only) */}
        {!isInherited && !isReadOnly && onToggleExport ? (
          <label className="flex items-center cursor-pointer" title="Als Anhang zur Abrechnung hinzufügen">
            <input
              type="checkbox"
              checked={document.include_in_export}
              onChange={() => onToggleExport(document.id, document.include_in_export)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </label>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}

        <div className="relative">
          <Icon
            className={`h-8 w-8 ${
              hasInvoice
                ? 'text-green-600'
                : isInherited
                ? 'text-muted-foreground'
                : document.include_in_export
                ? 'text-primary'
                : 'text-gray-400'
            }`}
          />
          {hasInvoice && (
            <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
          )}
        </div>

        <div>
          <p className="font-medium flex items-center gap-2">
            {document.original_filename}
            {hasInvoice && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Rechnung erstellt
              </span>
            )}
            {isInherited && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Von Liegenschaft
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {document.file_size_mb.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB •{' '}
            <span className={docStatus.color}>{docStatus.label}</span>
            {!isInherited && document.include_in_export && (
              <span className="ml-2 text-primary">• Anhang</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* OCR Process Button - only for pending docs that aren't inherited */}
        {document.document_status === 'PENDING' && !isInherited && onProcess && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onProcess(document.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="ml-2">OCR</span>
          </Button>
        )}

        {/* OCR Details Button - for processed or failed docs */}
        {(document.document_status === 'PROCESSED' || document.document_status === 'FAILED') && onShowOcr && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowOcr(document)}
          >
            <FileSearch className="h-4 w-4" />
            <span className="ml-2">Details</span>
          </Button>
        )}

        {/* Delete Button - only if not inherited and not read-only */}
        {!isInherited && !isReadOnly && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  )
}
