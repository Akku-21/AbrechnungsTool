'use client'

import { use, useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useSettlement, useDeleteSettlement, useFinalizeSettlement, useCopySettlement, useUpdateSettlement } from '@/hooks/useSettlements'
import { useProperty } from '@/hooks/useProperties'
import { useDocuments, useUploadDocument, useDeleteDocument, useProcessDocument, useOCRResult, useUpdateDocument, useReExtractDocument } from '@/hooks/useDocuments'
import { useInvoices, useCreateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { settlementsApi } from '@/lib/api/settlements'
import { invoicesApi } from '@/lib/api/invoices'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/useToast'
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  X,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Lock,
  Copy,
  Sparkles,
  Edit,
  Save,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { COST_CATEGORY_LABELS, CostCategory, InvoiceCreate } from '@/types'
import { UnitSettlementsList } from '@/components/settlements/UnitSettlementsList'

// Accepted file types for upload
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

const STATUS_CONFIG = {
  DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800', icon: Clock },
  CALCULATED: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800', icon: Clock },  // Legacy, jetzt wie DRAFT
  FINALIZED: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPORTED: { label: 'Exportiert', color: 'bg-purple-100 text-purple-800', icon: Download },
}

const DOC_STATUS_CONFIG = {
  PENDING: { label: 'Ausstehend', color: 'text-gray-500' },
  PROCESSING: { label: 'Verarbeitung...', color: 'text-blue-500' },
  PROCESSED: { label: 'Verarbeitet', color: 'text-green-500' },
  FAILED: { label: 'Fehlgeschlagen', color: 'text-red-500' },
  VERIFIED: { label: 'Verifiziert', color: 'text-green-600' },
}

export default function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { toast } = useToast()

  const { data: settlement, isLoading: settlementLoading } = useSettlement(id)
  const { data: property } = useProperty(settlement?.property_id || '')
  // Auto-refresh documents while any are processing
  const { data: documents, isLoading: docsLoading, refetch: refetchDocs } = useDocuments(id)
  const hasProcessingDocs = documents?.some(d => d.document_status === 'PROCESSING')

  // Auto-refresh effect - poll every 2 seconds while processing
  useEffect(() => {
    if (!hasProcessingDocs) return

    const interval = setInterval(() => {
      refetchDocs()
    }, 2000)

    return () => clearInterval(interval)
  }, [hasProcessingDocs, refetchDocs])

  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ settlementId: id })

  const uploadDocument = useUploadDocument()
  const deleteDocument = useDeleteDocument()
  const processDocument = useProcessDocument()
  const updateDocument = useUpdateDocument()
  const reExtractDocument = useReExtractDocument()
  const deleteSettlement = useDeleteSettlement()
  const finalizeSettlement = useFinalizeSettlement()
  const copySettlement = useCopySettlement()
  const updateSettlement = useUpdateSettlement()
  const createInvoice = useCreateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [showOcrModal, setShowOcrModal] = useState(false)
  const [showRawText, setShowRawText] = useState(false)
  const [defaultAllocation, setDefaultAllocation] = useState<number>(1.0)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceCreate>>({
    settlement_id: id,
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    total_amount: 0,
    cost_category: 'SONSTIGE' as CostCategory,
    allocation_percentage: 1.0,
  })

  // Fetch default allocation for this settlement
  useEffect(() => {
    if (id) {
      invoicesApi.getDefaultAllocation(id).then(data => {
        setDefaultAllocation(data.default_allocation)
        setInvoiceForm(prev => ({ ...prev, allocation_percentage: data.default_allocation }))
      }).catch(console.error)
    }
  }, [id])

  // Fetch OCR result when modal is open
  const { data: ocrResult, isLoading: ocrLoading } = useOCRResult(
    selectedDocumentId || '',
    showOcrModal && !!selectedDocumentId
  )

  // Editable OCR form data
  const [ocrFormData, setOcrFormData] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    total_amount: '',
    cost_category: 'SONSTIGE' as CostCategory,
    allocation_percentage: '100',  // Als Prozent-String (z.B. "100" für 100%)
  })

  // Helper: ISO date (YYYY-MM-DD) to German format (DD.MM.YYYY)
  const isoToGerman = (isoDate: string): string => {
    if (!isoDate) return ''
    const parts = isoDate.split('-')
    if (parts.length !== 3) return isoDate
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }

  // Helper: German date (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
  const germanToIso = (germanDate: string): string => {
    if (!germanDate) return ''
    const parts = germanDate.split('.')
    if (parts.length !== 3) return germanDate
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  // Helper: Format number for display (German: 1.234,56)
  const formatAmountForDisplay = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return ''
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Helper: Parse German formatted number to float
  const parseGermanAmount = (value: string): number => {
    // Remove thousand separators and convert decimal comma to point
    const normalized = value.replace(/\./g, '').replace(',', '.')
    return parseFloat(normalized) || 0
  }

  // Populate form when OCR result loads
  useEffect(() => {
    if (ocrResult?.extracted_data) {
      const data = ocrResult.extracted_data
      setOcrFormData({
        vendor_name: data.vendor_name || '',
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date ? isoToGerman(data.invoice_date) : '',
        total_amount: data.total_amount ? formatAmountForDisplay(data.total_amount) : '',
        cost_category: (data.suggested_category as CostCategory) || 'SONSTIGE',
        allocation_percentage: (defaultAllocation * 100).toFixed(0),  // Vorbefüllt mit Standard-Anteil
      })
    }
  }, [ocrResult, defaultAllocation])

  const handleFilesUpload = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file =>
      ACCEPTED_FILE_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg')
    )

    if (validFiles.length === 0) {
      toast({
        title: 'Ungültiger Dateityp',
        message: 'Bitte nur PDF, PNG oder JPG Dateien hochladen.',
        variant: 'error',
      })
      return
    }

    // Upload files sequentially
    for (const file of validFiles) {
      setUploadingFiles(prev => [...prev, file.name])
      try {
        await uploadDocument.mutateAsync({ settlementId: id, file })
      } catch (error) {
        console.error(`Fehler beim Hochladen von ${file.name}:`, error)
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name))
      }
    }
  }, [id, uploadDocument])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFilesUpload(Array.from(files))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the dropzone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFilesUpload(files)
    }
  }, [handleFilesUpload])

  const handleProcessDocument = async (docId: string) => {
    await processDocument.mutateAsync(docId)
  }

  const handleDeleteDocument = async (docId: string) => {
    const confirmed = await confirm({
      title: 'Dokument löschen',
      message: 'Möchten Sie dieses Dokument wirklich löschen?',
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteDocument.mutateAsync(docId)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const blob = await settlementsApi.exportPdf(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nebenkostenabrechnung_${settlement?.year || 'export'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF Export failed:', error)
      toast({
        title: 'Export fehlgeschlagen',
        message: 'PDF-Export fehlgeschlagen. Bitte zuerst berechnen.',
        variant: 'error',
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleDeleteSettlement = async () => {
    const confirmed = await confirm({
      title: 'Abrechnung löschen',
      message: 'Abrechnung wirklich löschen? Alle zugehörigen Dokumente und Rechnungen werden ebenfalls gelöscht.',
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteSettlement.mutateAsync(id)
      router.push('/settlements')
    }
  }

  const handleFinalize = async () => {
    await finalizeSettlement.mutateAsync(id)
    setShowFinalizeModal(false)
  }

  const handleCreateCorrection = async () => {
    const newSettlement = await copySettlement.mutateAsync(id)
    router.push(`/settlements/${newSettlement.id}`)
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    await createInvoice.mutateAsync(invoiceForm as InvoiceCreate)
    setShowInvoiceForm(false)
    setInvoiceForm({
      settlement_id: id,
      vendor_name: '',
      invoice_number: '',
      invoice_date: '',
      total_amount: 0,
      cost_category: 'SONSTIGE' as CostCategory,
    })
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    const confirmed = await confirm({
      title: 'Rechnung löschen',
      message: 'Möchten Sie diese Rechnung wirklich löschen?',
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteInvoice.mutateAsync(invoiceId)
    }
  }

  const handleShowOcrDetails = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setShowOcrModal(true)
    setShowRawText(false)
  }

  const handleReExtract = async () => {
    if (!selectedDocumentId) return
    try {
      const result = await reExtractDocument.mutateAsync(selectedDocumentId)
      // Aktualisiere Formular mit neuen Daten
      if (result.extracted_data) {
        const data = result.extracted_data
        setOcrFormData({
          vendor_name: data.vendor_name || '',
          invoice_number: data.invoice_number || '',
          invoice_date: data.invoice_date ? isoToGerman(data.invoice_date) : '',
          total_amount: data.total_amount ? formatAmountForDisplay(data.total_amount) : '',
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

  const handleCloseOcrModal = () => {
    setShowOcrModal(false)
    setSelectedDocumentId(null)
    setShowRawText(false)
  }

  const handleCreateInvoiceFromOcr = async () => {
    if (!ocrFormData.total_amount || !selectedDocumentId) return

    const allocationPercent = parseFloat(ocrFormData.allocation_percentage) || 100
    const newInvoice: InvoiceCreate = {
      settlement_id: id,
      document_id: selectedDocumentId,
      vendor_name: ocrFormData.vendor_name || 'Unbekannt',
      invoice_number: ocrFormData.invoice_number || '',
      invoice_date: germanToIso(ocrFormData.invoice_date) || '',
      total_amount: parseGermanAmount(ocrFormData.total_amount),
      cost_category: ocrFormData.cost_category,
      allocation_percentage: allocationPercent / 100,  // Umrechnung von % zu Dezimal
    }

    await createInvoice.mutateAsync(newInvoice)
    handleCloseOcrModal()
  }

  const handleToggleIncludeInExport = async (documentId: string, currentValue: boolean) => {
    await updateDocument.mutateAsync({
      id: documentId,
      data: { include_in_export: !currentValue }
    })
  }

  const handleEditNotes = () => {
    setNotesValue(settlement?.notes || '')
    setIsEditingNotes(true)
  }

  const handleSaveNotes = async () => {
    await updateSettlement.mutateAsync({
      id,
      data: { notes: notesValue }
    })
    setIsEditingNotes(false)
  }

  const handleCancelEditNotes = () => {
    setIsEditingNotes(false)
    setNotesValue(settlement?.notes || '')
  }

  const selectedDocument = documents?.find(d => d.id === selectedDocumentId)

  if (settlementLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!settlement) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Abrechnung nicht gefunden</p>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[settlement.status] || STATUS_CONFIG.DRAFT
  const StatusIcon = statusConfig.icon

  const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0

  // Set of document IDs that have invoices linked to them
  const documentsWithInvoices = new Set(
    invoices?.filter(inv => inv.document_id).map(inv => inv.document_id) || []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settlements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Abrechnung {settlement.year}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {property?.name} - {settlement.period_label}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPdf}
            disabled={!invoices?.length || isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExportingPdf ? 'Exportiere...' : 'PDF Export'}
          </Button>
          {(settlement.status === 'DRAFT' || settlement.status === 'CALCULATED') && (
            <Button
              variant="outline"
              onClick={() => setShowFinalizeModal(true)}
              disabled={finalizeSettlement.isPending || !invoices?.length}
            >
              {finalizeSettlement.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Finalisieren
            </Button>
          )}
          {settlement.status === 'FINALIZED' && (
            <Button
              variant="outline"
              onClick={handleCreateCorrection}
              disabled={copySettlement.isPending}
            >
              {copySettlement.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Korrektur erstellen
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zeitraum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{settlement.period_label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dokumente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{documents?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamtkosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvoiceAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Hochgeladene Belege und Rechnungsdokumente</CardDescription>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
              multiple
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles.length > 0}
            >
              {uploadingFiles.length > 0 ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Dokument hochladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              mb-4 p-8 border-2 border-dashed rounded-lg cursor-pointer
              transition-all duration-200 ease-in-out
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <div className="text-center">
              <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isDragging ? 'Dateien hier ablegen' : 'Dateien hochladen'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Drag & Drop oder klicken zum Auswählen
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PDF, PNG, JPG (mehrere Dateien möglich)
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploadingFiles.map((fileName) => (
                <div key={fileName} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-700">Hochladen: {fileName}</span>
                </div>
              ))}
            </div>
          )}

          {/* Documents List */}
          {docsLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">Noch keine Dokumente hochgeladen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const docStatus = DOC_STATUS_CONFIG[doc.document_status] || DOC_STATUS_CONFIG.PENDING
                const hasInvoice = documentsWithInvoices.has(doc.id)
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${hasInvoice ? 'border-green-200 bg-green-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox for include in export */}
                      <label className="flex items-center cursor-pointer" title="Als Anhang zur Abrechnung hinzufügen">
                        <input
                          type="checkbox"
                          checked={doc.include_in_export}
                          onChange={() => handleToggleIncludeInExport(doc.id, doc.include_in_export)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </label>
                      <div className="relative">
                        <FileText className={`h-8 w-8 ${hasInvoice ? 'text-green-600' : doc.include_in_export ? 'text-primary' : 'text-gray-400'}`} />
                        {hasInvoice && (
                          <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {doc.original_filename}
                          {hasInvoice && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Rechnung erstellt
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doc.file_size_mb.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB •{' '}
                          <span className={docStatus.color}>{docStatus.label}</span>
                          {doc.include_in_export && (
                            <span className="ml-2 text-primary">• Anhang</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {doc.document_status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessDocument(doc.id)}
                          disabled={processDocument.isPending}
                        >
                          {processDocument.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="ml-2">OCR</span>
                        </Button>
                      )}
                      {(doc.document_status === 'PROCESSED' || doc.document_status === 'FAILED') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowOcrDetails(doc.id)}
                        >
                          <FileSearch className="h-4 w-4" />
                          <span className="ml-2">Details</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rechnungen</CardTitle>
            <CardDescription>Erfasste Rechnungen für diese Abrechnung</CardDescription>
          </div>
          <Button onClick={() => setShowInvoiceForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Rechnung hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          {showInvoiceForm && (
            <form onSubmit={handleCreateInvoice} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-4">Neue Rechnung</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Anbieter/Lieferant *</Label>
                  <Input
                    id="vendor_name"
                    value={invoiceForm.vendor_name}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Rechnungsnummer</Label>
                  <Input
                    id="invoice_number"
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Rechnungsdatum</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Betrag (EUR) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={invoiceForm.total_amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_category">Kostenkategorie *</Label>
                  <select
                    id="cost_category"
                    value={invoiceForm.cost_category}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, cost_category: e.target.value as CostCategory })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {Object.entries(COST_CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allocation_percentage">Anteil (%)</Label>
                  <Input
                    id="allocation_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={((invoiceForm.allocation_percentage || 1) * 100).toFixed(1)}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, allocation_percentage: parseFloat(e.target.value) / 100 || 1 })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Anteil der Kosten, der auf Mieter umgelegt wird
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? 'Speichern...' : 'Speichern'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          )}

          {invoicesLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : !invoices || invoices.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Rechnungen</h3>
              <p className="mt-1 text-sm text-gray-500">
                Fügen Sie Rechnungen hinzu oder verarbeiten Sie Dokumente per OCR.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Anbieter</th>
                    <th className="text-left py-2 px-3 font-medium">Kategorie</th>
                    <th className="text-left py-2 px-3 font-medium">Datum</th>
                    <th className="text-right py-2 px-3 font-medium">Betrag</th>
                    <th className="text-right py-2 px-3 font-medium">Anteil</th>
                    <th className="text-right py-2 px-3 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium">{invoice.vendor_name}</p>
                          {invoice.invoice_number && (
                            <p className="text-sm text-muted-foreground">Nr. {invoice.invoice_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100">
                          {COST_CATEGORY_LABELS[invoice.cost_category]}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(Number(invoice.total_amount))}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={invoice.allocation_percentage !== undefined && invoice.allocation_percentage < 1 ? 'text-orange-600' : ''}>
                          {invoice.allocation_percentage !== undefined
                            ? `${(Number(invoice.allocation_percentage) * 100).toFixed(0)}%`
                            : '100%'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={4} className="py-2 px-3 font-bold">Gesamt</td>
                    <td className="py-2 px-3 text-right font-bold">
                      {formatCurrency(totalInvoiceAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notizen</CardTitle>
          {!isEditingNotes && settlement.status !== 'FINALIZED' && (
            <Button variant="outline" size="sm" onClick={handleEditNotes}>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-4">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                className="w-full min-h-[150px] p-3 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Notizen zur Abrechnung eingeben..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={updateSettlement.isPending}
                >
                  {updateSettlement.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleCancelEditNotes}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : settlement.notes ? (
            <p className="text-gray-700 whitespace-pre-wrap">{settlement.notes}</p>
          ) : (
            <p className="text-gray-400 italic">Keine Notizen vorhanden</p>
          )}
        </CardContent>
      </Card>

      {/* Unit Settlements Section - Einzelabrechnungen pro Wohneinheit */}
      {invoices && invoices.length > 0 && (
        <UnitSettlementsList
          settlementId={id}
          isFinalized={settlement.status === 'FINALIZED'}
        />
      )}

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Gefahrenzone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={handleDeleteSettlement}
            disabled={deleteSettlement.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Abrechnung löschen
          </Button>
        </CardContent>
      </Card>

      {/* OCR Details Modal */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseOcrModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">OCR-Ergebnisse</h2>
                {selectedDocument && (
                  <p className="text-sm text-muted-foreground">{selectedDocument.original_filename}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseOcrModal}>
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
                          value={ocrFormData.vendor_name}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, vendor_name: e.target.value })}
                          placeholder="Anbieter eingeben..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ocr_invoice_number" className="text-xs text-muted-foreground uppercase tracking-wide">
                          Rechnungsnummer
                        </Label>
                        <Input
                          id="ocr_invoice_number"
                          value={ocrFormData.invoice_number}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, invoice_number: e.target.value })}
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
                          value={ocrFormData.invoice_date}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, invoice_date: e.target.value })}
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
                          value={ocrFormData.total_amount}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, total_amount: e.target.value })}
                          placeholder="1.234,56"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ocr_cost_category" className="text-xs text-muted-foreground uppercase tracking-wide">
                          Kostenkategorie
                        </Label>
                        <select
                          id="ocr_cost_category"
                          value={ocrFormData.cost_category}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, cost_category: e.target.value as CostCategory })}
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
                          value={ocrFormData.allocation_percentage}
                          onChange={(e) => setOcrFormData({ ...ocrFormData, allocation_percentage: e.target.value })}
                          placeholder="100"
                        />
                        <p className="text-xs text-muted-foreground">
                          Anteil der Kosten für Mieter
                        </p>
                      </div>
                    </div>

                    {/* Create Invoice Button */}
                    <Button
                      onClick={handleCreateInvoiceFromOcr}
                      disabled={createInvoice.isPending || !ocrFormData.total_amount}
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
              <Button variant="outline" onClick={handleCloseOcrModal}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {ConfirmDialog}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFinalizeModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold">Abrechnung finalisieren</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Nach der Finalisierung kann diese Abrechnung nicht mehr bearbeitet oder gelöscht werden.
              </p>
              <p className="text-gray-600 mb-6">
                Falls später Änderungen nötig sind, können Sie eine <strong>Korrekturabrechnung</strong> erstellen.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFinalizeModal(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleFinalize}
                  disabled={finalizeSettlement.isPending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {finalizeSettlement.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Finalisieren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
