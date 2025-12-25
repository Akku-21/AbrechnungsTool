'use client'

import { useState, useEffect } from 'react'
import { useOCRResult, useReExtractDocument } from '@/hooks/useDocuments'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
} from 'lucide-react'
import { isoToGerman, germanToIso, formatAmountForInput, parseGermanAmount } from '@/lib/utils'
import { COST_CATEGORY_LABELS, CostCategory, InvoiceCreate, Document } from '@/types'

interface OcrModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document | null
  settlementId: string
  unitId?: string
  defaultAllocation: number
  onInvoiceCreated?: () => void
}

interface OcrFormData {
  vendor_name: string
  invoice_number: string
  invoice_date: string
  total_amount: string
  cost_category: CostCategory
  allocation_percentage: string
}

export function OcrModal({
  isOpen,
  onClose,
  document,
  settlementId,
  unitId,
  defaultAllocation,
  onInvoiceCreated,
}: OcrModalProps) {
  const { toast } = useToast()
  const [showRawText, setShowRawText] = useState(false)

  // Fetch OCR result
  const { data: ocrResult, isLoading: ocrLoading } = useOCRResult(
    document?.id || '',
    isOpen && !!document?.id
  )

  // Mutations
  const reExtractDocument = useReExtractDocument()
  const createInvoice = useCreateInvoice()

  // Editable form data
  const [formData, setFormData] = useState<OcrFormData>({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    total_amount: '',
    cost_category: 'SONSTIGE',
    allocation_percentage: '100',
  })

  // Populate form when OCR result loads
  useEffect(() => {
    if (ocrResult?.extracted_data) {
      const data = ocrResult.extracted_data
      setFormData({
        vendor_name: data.vendor_name || '',
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date ? isoToGerman(data.invoice_date) : '',
        total_amount: data.total_amount ? formatAmountForInput(data.total_amount) : '',
        cost_category: (data.suggested_category as CostCategory) || 'SONSTIGE',
        allocation_percentage: (defaultAllocation * 100).toFixed(0),
      })
    }
  }, [ocrResult, defaultAllocation])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowRawText(false)
    }
  }, [isOpen])

  const handleReExtract = async () => {
    if (!document?.id) return
    try {
      const result = await reExtractDocument.mutateAsync(document.id)
      if (result.extracted_data) {
        const data = result.extracted_data
        setFormData({
          vendor_name: data.vendor_name || '',
          invoice_number: data.invoice_number || '',
          invoice_date: data.invoice_date ? isoToGerman(data.invoice_date) : '',
          total_amount: data.total_amount ? formatAmountForInput(data.total_amount) : '',
          cost_category: (data.suggested_category as CostCategory) || 'SONSTIGE',
          allocation_percentage: (defaultAllocation * 100).toFixed(0),
        })
      }
      toast({
        title: 'LLM-Extraktion erfolgreich',
        message: 'Die Daten wurden neu extrahiert.',
        variant: 'success',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      toast({
        title: 'LLM-Extraktion fehlgeschlagen',
        message: errorMessage,
        variant: 'error',
      })
    }
  }

  const handleCreateInvoice = async () => {
    if (!formData.total_amount || !document?.id) return

    const allocationPercent = parseFloat(formData.allocation_percentage) || 100
    const newInvoice: InvoiceCreate = {
      settlement_id: settlementId,
      document_id: document.id,
      vendor_name: formData.vendor_name || 'Unbekannt',
      invoice_number: formData.invoice_number || '',
      invoice_date: germanToIso(formData.invoice_date) || '',
      total_amount: parseGermanAmount(formData.total_amount),
      cost_category: formData.cost_category,
      allocation_percentage: allocationPercent / 100,
      ...(unitId && { unit_id: unitId }),
    }

    await createInvoice.mutateAsync(newInvoice)
    onInvoiceCreated?.()
    onClose()
  }

  const handleClose = () => {
    setShowRawText(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">OCR-Ergebnisse</h2>
            {document && (
              <p className="text-sm text-muted-foreground">{document.original_filename}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {ocrLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ocrResult ? (
            <div className="space-y-6">
              {/* OCR Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  {ocrResult.confidence !== undefined && ocrResult.confidence !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">OCR-Konfidenz:</span>
                      <span className={`font-medium ${
                        Number(ocrResult.confidence) >= 70 ? 'text-green-600' :
                        Number(ocrResult.confidence) >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Number(ocrResult.confidence).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  )}
                  {ocrResult.engine && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Engine:</span>
                      <span className="font-medium">{ocrResult.engine}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Extraktion:</span>
                    <span className={`font-medium ${ocrResult.llm_extraction_used ? 'text-green-600' : 'text-gray-600'}`}>
                      {ocrResult.llm_extraction_used ? 'LLM' : 'Regex'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReExtract}
                  disabled={reExtractDocument.isPending}
                >
                  {reExtractDocument.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {reExtractDocument.isPending ? 'Extrahiere...' : 'Neu extrahieren (LLM)'}
                </Button>
              </div>

              {/* LLM Extraction Error Warning */}
              {ocrResult.llm_extraction_error && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">LLM-Extraktion fehlgeschlagen</p>
                    <p className="text-sm text-amber-700 mt-1">{ocrResult.llm_extraction_error}</p>
                    <p className="text-xs text-amber-600 mt-2">
                      Fallback auf Regex-Extraktion. Die extrahierten Daten können ungenau sein.
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted Data - Editable Form */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Extrahierte Daten (bearbeitbar)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ocr_vendor_name" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Anbieter
                    </Label>
                    <Input
                      id="ocr_vendor_name"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      placeholder="Anbieter eingeben..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr_invoice_number" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Rechnungsnummer
                    </Label>
                    <Input
                      id="ocr_invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="Rechnungsnummer eingeben..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr_invoice_date" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Datum (TT.MM.JJJJ)
                    </Label>
                    <Input
                      id="ocr_invoice_date"
                      type="text"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      placeholder="01.01.2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr_total_amount" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Betrag (EUR)
                    </Label>
                    <Input
                      id="ocr_total_amount"
                      type="text"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      placeholder="1.234,56"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr_cost_category" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Kostenkategorie
                    </Label>
                    <select
                      id="ocr_cost_category"
                      value={formData.cost_category}
                      onChange={(e) => setFormData({ ...formData, cost_category: e.target.value as CostCategory })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(COST_CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ocr_allocation_percentage" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Anteil (%)
                    </Label>
                    <Input
                      id="ocr_allocation_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.allocation_percentage}
                      onChange={(e) => setFormData({ ...formData, allocation_percentage: e.target.value })}
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground">
                      Anteil der Kosten für Mieter
                    </p>
                  </div>
                </div>

                {/* Create Invoice Button */}
                <Button
                  onClick={handleCreateInvoice}
                  disabled={createInvoice.isPending || !formData.total_amount}
                  className="w-full"
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Rechnung aus Daten erstellen
                </Button>
              </div>

              {/* Raw Text Toggle */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
                >
                  {showRawText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  OCR-Rohtext {showRawText ? 'ausblenden' : 'anzeigen'}
                </button>

                {showRawText && ocrResult.raw_text && (
                  <pre className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                    {ocrResult.raw_text}
                  </pre>
                )}

                {showRawText && !ocrResult.raw_text && (
                  <p className="mt-3 text-sm text-gray-500">Kein OCR-Text vorhanden</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Keine OCR-Daten vorhanden
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            Schließen
          </Button>
        </div>
      </div>
    </div>
  )
}
