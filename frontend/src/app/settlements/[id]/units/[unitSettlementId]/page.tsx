'use client'

import { use, useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Download,
  Plus,
  CheckCircle,
  Clock,
  Loader2,
  Save,
  Edit,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useUnitSettlement,
  useUpdateUnitSettlement,
  useUploadUnitSettlementDocument,
  useExportUnitSettlementPdf,
} from '@/hooks/useUnitSettlements'
import { useSettlement } from '@/hooks/useSettlements'
import { useInvoices, useCreateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { useDocuments } from '@/hooks/useDocuments'
import { COST_CATEGORY_LABELS, CostCategory, InvoiceCreate } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { invoicesApi } from '@/lib/api/invoices'

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

const ALLOCATION_METHOD_LABELS: Record<string, string> = {
  WOHNFLAECHE: 'Wohnfläche',
  PERSONENZAHL: 'Personenzahl',
  EINHEIT: 'Pro Einheit',
  VERBRAUCH: 'Verbrauch',
  MITEIGENTUMSANTEIL: 'MEA',
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2).replace('.', ',')} %`
}

export default function UnitSettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitSettlementId: string }>
}) {
  const { id: settlementId, unitSettlementId } = use(params)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data fetching
  const { data: settlement } = useSettlement(settlementId)
  const { data: unitSettlement, isLoading } = useUnitSettlement(unitSettlementId)
  const { data: settlementDocuments } = useDocuments(settlementId)

  // Get invoices - both settlement-wide and unit-specific
  // Only fetch when we have the unit_id from unitSettlement
  const { data: allInvoices } = useInvoices(
    unitSettlement?.unit_id
      ? {
          settlementId,
          unitId: unitSettlement.unit_id,
          includeSettlementWide: true,
        }
      : { settlementId }
  )

  // State
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [defaultAllocation, setDefaultAllocation] = useState<number>(1.0)
  const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceCreate>>({
    settlement_id: settlementId,
    unit_id: unitSettlement?.unit_id,
    vendor_name: '',
    invoice_number: '',
    invoice_date: '',
    total_amount: 0,
    cost_category: 'SONSTIGE' as CostCategory,
    allocation_percentage: 1.0,
  })

  // Mutations
  const updateMutation = useUpdateUnitSettlement()
  const uploadMutation = useUploadUnitSettlementDocument()
  const exportPdfMutation = useExportUnitSettlementPdf()
  const createInvoice = useCreateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const isFinalized = settlement?.status === 'FINALIZED'

  // Sync notes state when data loads
  useEffect(() => {
    if (unitSettlement && !isEditingNotes) {
      setNotes(unitSettlement.notes || '')
    }
  }, [unitSettlement, isEditingNotes])

  // Update invoice form when unit data loads
  useEffect(() => {
    if (unitSettlement) {
      setInvoiceForm(prev => ({
        ...prev,
        unit_id: unitSettlement.unit_id,
      }))
    }
  }, [unitSettlement])

  // Fetch default allocation
  useEffect(() => {
    if (settlementId) {
      invoicesApi.getDefaultAllocation(settlementId).then(data => {
        // Find allocation for this specific unit
        const unitAlloc = data.units.find(u => u.unit_id === unitSettlement?.unit_id)
        if (unitAlloc) {
          setDefaultAllocation(unitAlloc.allocation_percentage)
          setInvoiceForm(prev => ({ ...prev, allocation_percentage: unitAlloc.allocation_percentage }))
        }
      }).catch(console.error)
    }
  }, [settlementId, unitSettlement?.unit_id])

  // Handlers
  const handleSaveNotes = async () => {
    if (!unitSettlement) return
    await updateMutation.mutateAsync({ id: unitSettlement.id, data: { notes } })
    setIsEditingNotes(false)
  }

  const handleExportPdf = async () => {
    if (!unitSettlement) return
    setIsExporting(true)
    try {
      const blob = await exportPdfMutation.mutateAsync(unitSettlement.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nebenkostenabrechnung_${unitSettlement.unit.designation}_${unitSettlement.tenant.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilesUpload = useCallback(async (files: File[]) => {
    if (!unitSettlement) return
    const validFiles = files.filter(file =>
      ACCEPTED_FILE_TYPES.includes(file.type) ||
      file.name.toLowerCase().endsWith('.pdf') ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg')
    )

    for (const file of validFiles) {
      setUploadingFiles(prev => [...prev, file.name])
      try {
        await uploadMutation.mutateAsync({ id: unitSettlement.id, file })
      } catch (error) {
        console.error(`Fehler beim Hochladen von ${file.name}:`, error)
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name))
      }
    }
  }, [unitSettlement, uploadMutation])

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

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    await createInvoice.mutateAsync({
      ...invoiceForm,
      settlement_id: settlementId,
      unit_id: unitSettlement?.unit_id,
    } as InvoiceCreate)
    setShowInvoiceForm(false)
    setInvoiceForm({
      settlement_id: settlementId,
      unit_id: unitSettlement?.unit_id,
      vendor_name: '',
      invoice_number: '',
      invoice_date: '',
      total_amount: 0,
      cost_category: 'SONSTIGE' as CostCategory,
      allocation_percentage: defaultAllocation,
    })
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (confirm('Möchten Sie diese Rechnung wirklich löschen?')) {
      await deleteInvoice.mutateAsync(invoiceId)
    }
  }

  // Separate invoices into settlement-wide and unit-specific
  const settlementWideInvoices = allInvoices?.filter(inv => !inv.unit_id) || []
  const unitSpecificInvoices = allInvoices?.filter(inv => inv.unit_id === unitSettlement?.unit_id) || []

  // All documents (settlement-wide + unit-specific)
  const unitDocuments = unitSettlement?.documents || []
  const allDocuments = [...(settlementDocuments || []), ...unitDocuments]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!unitSettlement) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Einzelabrechnung nicht gefunden</p>
      </div>
    )
  }

  const totalInvoiceAmount = (allInvoices || []).reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/settlements/${settlementId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {unitSettlement.unit.designation}
              </h1>
              <span className="text-muted-foreground">|</span>
              <span className="text-xl text-muted-foreground">{unitSettlement.tenant.full_name}</span>
              <Badge variant={isFinalized ? 'default' : 'secondary'} className="ml-2">
                {isFinalized ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Finalisiert
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Entwurf
                  </>
                )}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">
              {Number(unitSettlement.unit.area_sqm).toFixed(2).replace('.', ',')} m² &bull;{' '}
              {unitSettlement.occupancy_days} Tage Belegung &bull;{' '}
              {settlement?.period_label}
            </p>
          </div>
        </div>
        <Button onClick={handleExportPdf} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? 'Exportiere...' : 'PDF exportieren'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamtkosten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatEuro(unitSettlement.total_costs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vorauszahlung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatEuro(unitSettlement.total_prepayments)}</p>
          </CardContent>
        </Card>
        <Card className={unitSettlement.balance >= 0 ? 'border-orange-200' : 'border-green-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {unitSettlement.balance >= 0 ? 'Nachzahlung' : 'Guthaben'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${unitSettlement.balance >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatEuro(Math.abs(unitSettlement.balance))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allInvoices?.length || 0}</p>
            <p className="text-xs text-muted-foreground">
              {settlementWideInvoices.length} geerbt, {unitSpecificInvoices.length} spezifisch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dokumente</CardTitle>
            <CardDescription>Belege für diese Einzelabrechnung</CardDescription>
          </div>
          {!isFinalized && (
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
          )}
        </CardHeader>
        <CardContent>
          {/* Drag & Drop Zone */}
          {!isFinalized && (
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
              </div>
            </div>
          )}

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
          {unitDocuments.length === 0 && (settlementDocuments?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Dokumente vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {/* Unit-specific documents */}
              {unitDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{doc.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.upload_date).toLocaleDateString('de-DE')} •{' '}
                        <span className="text-primary">Unit-spezifisch</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary">
                    Spezifisch
                  </Badge>
                </div>
              ))}
              {/* Settlement-wide documents */}
              {settlementDocuments?.filter(d => d.include_in_export).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.upload_date).toLocaleDateString('de-DE')} •{' '}
                        Von Liegenschaft geerbt
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Geerbt</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rechnungen</CardTitle>
            <CardDescription>
              Rechnungen für diese Einzelabrechnung
            </CardDescription>
          </div>
          {!isFinalized && (
            <Button onClick={() => setShowInvoiceForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Unit-Rechnung hinzufügen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* New Invoice Form */}
          {showInvoiceForm && (
            <form onSubmit={handleCreateInvoice} className="mb-6 p-4 border rounded-lg bg-primary/5 border-primary/20">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Neue Unit-spezifische Rechnung
              </h4>
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

          {/* Invoices Table */}
          {(allInvoices?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine Rechnungen vorhanden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anbieter</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Settlement-wide invoices (inherited) */}
                  {settlementWideInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.vendor_name}</p>
                          {invoice.invoice_number && (
                            <p className="text-sm text-muted-foreground">Nr. {invoice.invoice_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {COST_CATEGORY_LABELS[invoice.cost_category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(invoice.total_amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Building2 className="h-3 w-3 mr-1" />
                          Geerbt
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">Nur lesbar</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Unit-specific invoices */}
                  {unitSpecificInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.vendor_name}</p>
                          {invoice.invoice_number && (
                            <p className="text-sm text-muted-foreground">Nr. {invoice.invoice_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {COST_CATEGORY_LABELS[invoice.cost_category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(invoice.total_amount))}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Spezifisch
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isFinalized && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Kostenaufstellung</CardTitle>
          <CardDescription>Aufschlüsselung der Nebenkosten nach Kategorie</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kostenart</TableHead>
                <TableHead className="text-right">Gesamtkosten</TableHead>
                <TableHead className="text-right">Anteil</TableHead>
                <TableHead className="text-right">Ihr Anteil</TableHead>
                <TableHead>Verteilung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitSettlement.cost_breakdowns.map((breakdown, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {COST_CATEGORY_LABELS[breakdown.cost_category] || breakdown.cost_category}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatEuro(breakdown.total_property_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(breakdown.allocation_percentage)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatEuro(breakdown.allocated_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ALLOCATION_METHOD_LABELS[breakdown.allocation_method] || breakdown.allocation_method}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Gesamt</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{formatEuro(unitSettlement.total_costs)}</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notizen</CardTitle>
          {!isEditingNotes && !isFinalized && (
            <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[150px] p-3 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Notizen zur Einzelabrechnung eingeben..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotes(unitSettlement.notes || '')
                    setIsEditingNotes(false)
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : unitSettlement.notes ? (
            <p className="text-gray-700 whitespace-pre-wrap">{unitSettlement.notes}</p>
          ) : (
            <p className="text-gray-400 italic">Keine Notizen vorhanden</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
