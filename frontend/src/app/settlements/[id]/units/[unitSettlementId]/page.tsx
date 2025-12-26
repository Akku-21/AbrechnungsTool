"use client";

import { use, useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
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
    Eye,
    FileSearch,
    Building2,
    Receipt,
    StickyNote,
    Calculator,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    useUnitSettlement,
    useUpdateUnitSettlement,
    useUploadUnitSettlementDocument,
    useExportUnitSettlementPdf,
    useUnitSettlementDocuments,
} from "@/hooks/useUnitSettlements";
import { useSettlement } from "@/hooks/useSettlements";
import {
    useInvoices,
    useCreateInvoice,
    useDeleteInvoice,
} from "@/hooks/useInvoices";
import {
    useDocuments,
    useProcessDocument,
    useUpdateDocument,
    useDeleteDocument,
} from "@/hooks/useDocuments";
import { useDocumentPolling } from "@/hooks/useDocumentPolling";
import { useFileDragDrop } from "@/hooks/useFileDragDrop";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { OcrModal } from "@/components/documents/OcrModal";
import { DocumentCard } from "@/components/documents/DocumentCard";
import {
    COST_CATEGORY_LABELS,
    CostCategory,
    InvoiceCreate,
    Document,
} from "@/types";
import {
    formatDate,
    formatCurrency,
    getDocumentsWithInvoices,
} from "@/lib/utils";
import { invoicesApi } from "@/lib/api/invoices";
import {
    ALLOCATION_METHOD_LABELS,
    isValidFileType,
    DOC_STATUS_CONFIG,
} from "@/lib/constants";

function formatEuro(amount: number): string {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(amount);
}

function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2).replace(".", ",")} %`;
}

export default function UnitSettlementDetailPage({
    params,
}: {
    params: Promise<{ id: string; unitSettlementId: string }>;
}) {
    const { id: settlementId, unitSettlementId } = use(params);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const { toast } = useToast();

    // Data fetching
    const { data: settlement } = useSettlement(settlementId);
    const {
        data: unitSettlement,
        isLoading,
        refetch: refetchUnitSettlement,
    } = useUnitSettlement(unitSettlementId);
    const { data: settlementDocuments, refetch: refetchSettlementDocs } =
        useDocuments(settlementId);
    // Only fetch unit documents after unit settlement is loaded to avoid 404 errors
    const { data: unitDocuments = [], refetch: refetchUnitDocs } =
        useUnitSettlementDocuments(unitSettlement ? unitSettlementId : "");

    // Combine all documents for polling
    const allDocuments = useMemo(
        () => [...(settlementDocuments || []), ...unitDocuments],
        [settlementDocuments, unitDocuments],
    );

    // Auto-refresh documents while any are processing
    useDocumentPolling(allDocuments, [refetchSettlementDocs, refetchUnitDocs]);

    // Get invoices - both settlement-wide and unit-specific
    // Only fetch when we have the unit_id from unitSettlement
    const { data: allInvoices } = useInvoices(
        unitSettlement?.unit_id
            ? {
                  settlementId,
                  unitId: unitSettlement.unit_id,
                  includeSettlementWide: true,
              }
            : { settlementId },
    );

    // State
    const [notes, setNotes] = useState("");
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [defaultAllocation, setDefaultAllocation] = useState<number>(1.0);
    const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceCreate>>({
        settlement_id: settlementId,
        unit_id: unitSettlement?.unit_id,
        vendor_name: "",
        invoice_number: "",
        invoice_date: "",
        total_amount: 0,
        cost_category: "SONSTIGE" as CostCategory,
        allocation_percentage: 1.0,
    });

    // OCR Modal State
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(
        null,
    );
    const [showOcrModal, setShowOcrModal] = useState(false);

    // Mutations
    const updateMutation = useUpdateUnitSettlement();
    const uploadMutation = useUploadUnitSettlementDocument();
    const exportPdfMutation = useExportUnitSettlementPdf();
    const createInvoice = useCreateInvoice();
    const deleteInvoice = useDeleteInvoice();
    const processDocument = useProcessDocument();
    const updateDocument = useUpdateDocument();
    const deleteDocument = useDeleteDocument();

    const isFinalized = settlement?.status === "FINALIZED";

    // Compute documents with invoices
    const documentsWithInvoices = useMemo(
        () => getDocumentsWithInvoices(allInvoices),
        [allInvoices],
    );

    // Sync notes state when data loads
    useEffect(() => {
        if (unitSettlement && !isEditingNotes) {
            setNotes(unitSettlement.notes || "");
        }
    }, [unitSettlement, isEditingNotes]);

    // Update invoice form when unit data loads
    useEffect(() => {
        if (unitSettlement) {
            setInvoiceForm((prev) => ({
                ...prev,
                unit_id: unitSettlement.unit_id,
            }));
        }
    }, [unitSettlement]);

    // Fetch default allocation
    useEffect(() => {
        if (settlementId) {
            invoicesApi
                .getDefaultAllocation(settlementId)
                .then((data) => {
                    // Find allocation for this specific unit
                    const unitAlloc = data.units.find(
                        (u) => u.unit_id === unitSettlement?.unit_id,
                    );
                    if (unitAlloc) {
                        setDefaultAllocation(unitAlloc.allocation_percentage);
                        setInvoiceForm((prev) => ({
                            ...prev,
                            allocation_percentage:
                                unitAlloc.allocation_percentage,
                        }));
                    }
                })
                .catch(console.error);
        }
    }, [settlementId, unitSettlement?.unit_id]);

    // Handlers
    const handleSaveNotes = async () => {
        if (!unitSettlement) return;
        await updateMutation.mutateAsync({
            id: unitSettlement.id,
            data: { notes },
        });
        setIsEditingNotes(false);
    };

    const handleExportPdf = async () => {
        if (!unitSettlement) return;
        setIsExporting(true);
        try {
            const blob = await exportPdfMutation.mutateAsync(unitSettlement.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Nebenkostenabrechnung_${unitSettlement.unit.designation}_${unitSettlement.tenant.last_name}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error: unknown) {
            console.error("PDF export failed:", error);
            const axiosError = error as {
                response?: { status?: number; data?: { detail?: string } };
            };
            if (axiosError.response?.status === 404) {
                toast({
                    title: "Fehler",
                    message:
                        "Diese Einzelabrechnung existiert nicht mehr. Die Seite wird neu geladen.",
                    variant: "destructive",
                });
                // Redirect to settlement page after short delay
                setTimeout(() => {
                    window.location.href = `/settlements/${settlementId}`;
                }, 2000);
            } else {
                toast({
                    title: "Fehler",
                    message:
                        axiosError.response?.data?.detail ||
                        "PDF-Export fehlgeschlagen",
                    variant: "destructive",
                });
            }
        } finally {
            setIsExporting(false);
        }
    };

    const handleFilesUpload = useCallback(
        async (files: File[]) => {
            if (!unitSettlement) return;
            const validFiles = files.filter(isValidFileType);

            for (const file of validFiles) {
                setUploadingFiles((prev) => [...prev, file.name]);
                try {
                    await uploadMutation.mutateAsync({
                        id: unitSettlement.id,
                        file,
                    });
                } catch (error) {
                    console.error(
                        `Fehler beim Hochladen von ${file.name}:`,
                        error,
                    );
                } finally {
                    setUploadingFiles((prev) =>
                        prev.filter((name) => name !== file.name),
                    );
                }
            }
            // Refetch to ensure latest document status is shown
            refetchUnitDocs();
        },
        [unitSettlement, uploadMutation, refetchUnitDocs],
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await handleFilesUpload(Array.from(files));
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Drag & drop hook
    const { isDragging, dragHandlers } = useFileDragDrop(handleFilesUpload);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        await createInvoice.mutateAsync({
            ...invoiceForm,
            settlement_id: settlementId,
            unit_id: unitSettlement?.unit_id,
        } as InvoiceCreate);
        setShowInvoiceForm(false);
        setInvoiceForm({
            settlement_id: settlementId,
            unit_id: unitSettlement?.unit_id,
            vendor_name: "",
            invoice_number: "",
            invoice_date: "",
            total_amount: 0,
            cost_category: "SONSTIGE" as CostCategory,
            allocation_percentage: defaultAllocation,
        });
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        const confirmed = await confirm({
            title: "Rechnung löschen",
            message: "Möchten Sie diese Rechnung wirklich löschen?",
            confirmLabel: "Löschen",
            variant: "destructive",
        });
        if (confirmed) {
            await deleteInvoice.mutateAsync(invoiceId);
        }
    };

    // OCR Handlers
    const handleProcessDocument = async (docId: string) => {
        try {
            await processDocument.mutateAsync(docId);
            // Immediately refetch to show PROCESSING status
            refetchUnitDocs();
            refetchSettlementDocs();
            toast({
                title: "OCR gestartet",
                message: "Das Dokument wird verarbeitet.",
                variant: "success",
            });
        } catch (error: unknown) {
            // Extract backend error message from axios error
            const axiosError = error as {
                response?: { data?: { detail?: string } };
            };
            const errorMessage =
                axiosError.response?.data?.detail ||
                (error instanceof Error
                    ? error.message
                    : "Das Dokument konnte nicht verarbeitet werden.");
            toast({
                title: "Fehler",
                message: errorMessage,
                variant: "destructive",
            });
        }
    };

    const handleShowOcrDetails = (doc: Document) => {
        setSelectedDocument(doc);
        setShowOcrModal(true);
    };

    const handleCloseOcrModal = () => {
        setShowOcrModal(false);
        setSelectedDocument(null);
    };

    const handleOcrInvoiceCreated = () => {
        // Refresh invoices and documents after creating invoice from OCR
        refetchUnitDocs();
    };

    const handleToggleIncludeInExport = async (
        documentId: string,
        currentValue: boolean,
    ) => {
        await updateDocument.mutateAsync({
            id: documentId,
            data: { include_in_export: !currentValue },
        });
    };

    const handleDeleteDocument = async (docId: string) => {
        const confirmed = await confirm({
            title: "Dokument löschen",
            message: "Möchten Sie dieses Dokument wirklich löschen?",
            confirmLabel: "Löschen",
            variant: "destructive",
        });
        if (confirmed) {
            await deleteDocument.mutateAsync(docId);
            refetchUnitDocs();
        }
    };

    // Separate invoices into settlement-wide and unit-specific
    const settlementWideInvoices =
        allInvoices?.filter((inv) => !inv.unit_id) || [];
    const unitSpecificInvoices =
        allInvoices?.filter((inv) => inv.unit_id === unitSettlement?.unit_id) ||
        [];

    // Inherited documents from settlement (filtered to not include unit-specific ones)
    const inheritedDocuments = settlementDocuments || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!unitSettlement) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                    <p className="text-lg font-medium text-destructive">
                        Einzelabrechnung nicht gefunden
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Diese Abrechnung existiert nicht mehr. Möglicherweise
                        wurde die Abrechnung neu berechnet.
                    </p>
                </div>
                <Link href={`/settlements/${settlementId}`}>
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Zurück zur Abrechnung
                    </Button>
                </Link>
            </div>
        );
    }

    const totalInvoiceAmount = (allInvoices || []).reduce(
        (sum, inv) => sum + (Number(inv.total_amount) || 0),
        0,
    );

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
                            <span className="text-xl text-muted-foreground">
                                {unitSettlement.tenant.full_name}
                            </span>
                            <Badge
                                variant={isFinalized ? "default" : "secondary"}
                                className="ml-2"
                            >
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
                            {Number(unitSettlement.unit.area_sqm)
                                .toFixed(2)
                                .replace(".", ",")}{" "}
                            m² &bull; {unitSettlement.occupancy_days} Tage
                            Belegung &bull; {settlement?.period_label}
                        </p>
                    </div>
                </div>
                <Button onClick={handleExportPdf} disabled={isExporting}>
                    {isExporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? "Exportiere..." : "PDF exportieren"}
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
                        <p className="text-2xl font-bold">
                            {formatEuro(unitSettlement.total_costs)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Vorauszahlung
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {formatEuro(unitSettlement.total_prepayments)}
                        </p>
                    </CardContent>
                </Card>
                <Card
                    className={
                        unitSettlement.balance >= 0
                            ? "border-orange-200"
                            : "border-green-200"
                    }
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {unitSettlement.balance >= 0
                                ? "Nachzahlung"
                                : "Guthaben"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p
                            className={`text-2xl font-bold ${unitSettlement.balance >= 0 ? "text-orange-600" : "text-green-600"}`}
                        >
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
                        <p className="text-2xl font-bold">
                            {allInvoices?.length || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {settlementWideInvoices.length} geerbt,{" "}
                            {unitSpecificInvoices.length} spezifisch
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Navigation */}
            <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-6 px-6 py-3 border-b">
                <nav className="flex gap-2 overflow-x-auto">
                    <button
                        onClick={() =>
                            document
                                .getElementById("documents-section")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors whitespace-nowrap"
                    >
                        <FileText className="h-4 w-4" />
                        Dokumente
                        {unitDocuments.length +
                            (inheritedDocuments.filter(
                                (d) => d.include_in_export,
                            ).length || 0) >
                            0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                                {unitDocuments.length +
                                    inheritedDocuments.filter(
                                        (d) => d.include_in_export,
                                    ).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() =>
                            document
                                .getElementById("invoices-section")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors whitespace-nowrap"
                    >
                        <Receipt className="h-4 w-4" />
                        Rechnungen
                        {allInvoices && allInvoices.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 rounded-full">
                                {allInvoices.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() =>
                            document
                                .getElementById("cost-breakdown-section")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors whitespace-nowrap"
                    >
                        <Calculator className="h-4 w-4" />
                        Kostenaufstellung
                    </button>
                    <button
                        onClick={() =>
                            document
                                .getElementById("notes-section")
                                ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors whitespace-nowrap"
                    >
                        <StickyNote className="h-4 w-4" />
                        Notizen
                    </button>
                </nav>
            </div>

            {/* Documents Section */}
            <Card id="documents-section" className="scroll-mt-16">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Dokumente</CardTitle>
                        <CardDescription>
                            Belege für diese Einzelabrechnung
                        </CardDescription>
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
                            {...dragHandlers}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                mb-4 p-8 border-2 border-dashed rounded-lg cursor-pointer
                transition-all duration-200 ease-in-out
                ${
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }
              `}
                        >
                            <div className="text-center">
                                <Upload
                                    className={`mx-auto h-12 w-12 ${isDragging ? "text-primary" : "text-gray-400"}`}
                                />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                                    {isDragging
                                        ? "Dateien hier ablegen"
                                        : "Dateien hochladen"}
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
                                <div
                                    key={fileName}
                                    className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                                >
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    <span className="text-sm text-blue-700">
                                        Hochladen: {fileName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Documents List */}
                    {unitDocuments.length === 0 &&
                    (settlementDocuments?.length || 0) === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Keine Dokumente vorhanden
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {/* Unit-specific documents */}
                            {unitDocuments.map((doc) => {
                                const docStatus =
                                    DOC_STATUS_CONFIG[doc.document_status] ||
                                    DOC_STATUS_CONFIG.PENDING;
                                const hasInvoice = documentsWithInvoices.has(
                                    doc.id,
                                );
                                return (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center justify-between p-3 border rounded-lg ${hasInvoice ? "bg-green-50/50 border-green-200" : "bg-primary/5 border-primary/20"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Checkbox for include in export */}
                                            <label
                                                className="flex items-center cursor-pointer"
                                                title="Als Anhang zur Abrechnung hinzufügen"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        doc.include_in_export
                                                    }
                                                    onChange={() =>
                                                        handleToggleIncludeInExport(
                                                            doc.id,
                                                            doc.include_in_export,
                                                        )
                                                    }
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    disabled={isFinalized}
                                                />
                                            </label>
                                            <div className="relative">
                                                <FileText
                                                    className={`h-8 w-8 ${hasInvoice ? "text-green-600" : doc.include_in_export ? "text-primary" : "text-gray-400"}`}
                                                />
                                                {hasInvoice && (
                                                    <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm flex items-center gap-2">
                                                    {doc.original_filename}
                                                    {hasInvoice && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            Rechnung erstellt
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        doc.upload_date,
                                                    ).toLocaleDateString(
                                                        "de-DE",
                                                    )}{" "}
                                                    •{" "}
                                                    <span
                                                        className={
                                                            docStatus.color
                                                        }
                                                    >
                                                        {docStatus.label}
                                                    </span>
                                                    {doc.include_in_export && (
                                                        <span className="ml-2 text-primary">
                                                            • Anhang
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="text-primary border-primary"
                                            >
                                                Spezifisch
                                            </Badge>
                                            {doc.document_status ===
                                                "PENDING" &&
                                                !isFinalized && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleProcessDocument(
                                                                doc.id,
                                                            )
                                                        }
                                                        disabled={
                                                            processDocument.isPending
                                                        }
                                                    >
                                                        {processDocument.isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                        <span className="ml-2">
                                                            OCR
                                                        </span>
                                                    </Button>
                                                )}
                                            {doc.document_status ===
                                                "PROCESSING" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled
                                                >
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="ml-2">
                                                        Verarbeitung...
                                                    </span>
                                                </Button>
                                            )}
                                            {(doc.document_status ===
                                                "PROCESSED" ||
                                                doc.document_status ===
                                                    "FAILED") && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleShowOcrDetails(
                                                            doc,
                                                        )
                                                    }
                                                >
                                                    <FileSearch className="h-4 w-4" />
                                                    <span className="ml-2">
                                                        Details
                                                    </span>
                                                </Button>
                                            )}
                                            {!isFinalized && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDeleteDocument(
                                                            doc.id,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Inherited documents from settlement */}
                            {inheritedDocuments
                                .filter(
                                    (d) =>
                                        d.include_in_export &&
                                        !unitDocuments.some(
                                            (ud) => ud.id === d.id,
                                        ),
                                )
                                .map((doc) => (
                                    <DocumentCard
                                        key={doc.id}
                                        document={doc}
                                        hasInvoice={documentsWithInvoices.has(
                                            doc.id,
                                        )}
                                        isInherited
                                        isReadOnly={isFinalized}
                                        onShowOcr={handleShowOcrDetails}
                                    />
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invoices Section */}
            <Card id="invoices-section" className="scroll-mt-16">
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
                            Rechnung hinzufügen
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* New Invoice Form */}
                    {showInvoiceForm && (
                        <form
                            onSubmit={handleCreateInvoice}
                            className="mb-6 p-4 border rounded-lg bg-primary/5 border-primary/20"
                        >
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Neue Unit-spezifische Rechnung
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="vendor_name">
                                        Anbieter/Lieferant *
                                    </Label>
                                    <Input
                                        id="vendor_name"
                                        value={invoiceForm.vendor_name}
                                        onChange={(e) =>
                                            setInvoiceForm({
                                                ...invoiceForm,
                                                vendor_name: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_number">
                                        Rechnungsnummer
                                    </Label>
                                    <Input
                                        id="invoice_number"
                                        value={invoiceForm.invoice_number}
                                        onChange={(e) =>
                                            setInvoiceForm({
                                                ...invoiceForm,
                                                invoice_number: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_date">
                                        Rechnungsdatum
                                    </Label>
                                    <Input
                                        id="invoice_date"
                                        type="date"
                                        value={invoiceForm.invoice_date}
                                        onChange={(e) =>
                                            setInvoiceForm({
                                                ...invoiceForm,
                                                invoice_date: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="total_amount">
                                        Betrag (EUR) *
                                    </Label>
                                    <Input
                                        id="total_amount"
                                        type="number"
                                        step="0.01"
                                        value={invoiceForm.total_amount}
                                        onChange={(e) =>
                                            setInvoiceForm({
                                                ...invoiceForm,
                                                total_amount:
                                                    parseFloat(
                                                        e.target.value,
                                                    ) || 0,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cost_category">
                                        Kostenkategorie *
                                    </Label>
                                    <select
                                        id="cost_category"
                                        value={invoiceForm.cost_category}
                                        onChange={(e) =>
                                            setInvoiceForm({
                                                ...invoiceForm,
                                                cost_category: e.target
                                                    .value as CostCategory,
                                            })
                                        }
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        required
                                    >
                                        {Object.entries(
                                            COST_CATEGORY_LABELS,
                                        ).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    type="submit"
                                    disabled={createInvoice.isPending}
                                >
                                    {createInvoice.isPending
                                        ? "Speichern..."
                                        : "Speichern"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowInvoiceForm(false)}
                                >
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
                                        <TableHead className="text-right">
                                            Betrag
                                        </TableHead>
                                        <TableHead>Typ</TableHead>
                                        <TableHead className="text-right">
                                            Aktionen
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Settlement-wide invoices (inherited) */}
                                    {settlementWideInvoices.map((invoice) => (
                                        <TableRow
                                            key={invoice.id}
                                            className="bg-muted/30"
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">
                                                        {invoice.vendor_name}
                                                    </p>
                                                    {invoice.invoice_number && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Nr.{" "}
                                                            {
                                                                invoice.invoice_number
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {
                                                        COST_CATEGORY_LABELS[
                                                            invoice
                                                                .cost_category
                                                        ]
                                                    }
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {invoice.invoice_date
                                                    ? formatDate(
                                                          invoice.invoice_date,
                                                      )
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(
                                                    Number(
                                                        invoice.total_amount,
                                                    ),
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    <Building2 className="h-3 w-3 mr-1" />
                                                    Geerbt
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-xs text-muted-foreground">
                                                    Nur lesbar
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Unit-specific invoices */}
                                    {unitSpecificInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">
                                                        {invoice.vendor_name}
                                                    </p>
                                                    {invoice.invoice_number && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Nr.{" "}
                                                            {
                                                                invoice.invoice_number
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {
                                                        COST_CATEGORY_LABELS[
                                                            invoice
                                                                .cost_category
                                                        ]
                                                    }
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {invoice.invoice_date
                                                    ? formatDate(
                                                          invoice.invoice_date,
                                                      )
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(
                                                    Number(
                                                        invoice.total_amount,
                                                    ),
                                                )}
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
                                                        onClick={() =>
                                                            handleDeleteInvoice(
                                                                invoice.id,
                                                            )
                                                        }
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
            <Card id="cost-breakdown-section" className="scroll-mt-16">
                <CardHeader>
                    <CardTitle>Kostenaufstellung</CardTitle>
                    <CardDescription>
                        Aufschlüsselung der Nebenkosten nach Kategorie
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kostenart</TableHead>
                                <TableHead className="text-right">
                                    Gesamtkosten
                                </TableHead>
                                <TableHead className="text-right">
                                    Anteil
                                </TableHead>
                                <TableHead className="text-right">
                                    Ihr Anteil
                                </TableHead>
                                <TableHead>Verteilung</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {unitSettlement.cost_breakdowns.map(
                                (breakdown, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                            {COST_CATEGORY_LABELS[
                                                breakdown.cost_category
                                            ] || breakdown.cost_category}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatEuro(
                                                breakdown.total_property_cost,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatPercentage(
                                                breakdown.allocation_percentage,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatEuro(
                                                breakdown.allocated_amount,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {ALLOCATION_METHOD_LABELS[
                                                    breakdown.allocation_method
                                                ] ||
                                                    breakdown.allocation_method}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ),
                            )}
                            <TableRow className="bg-muted/50 font-semibold">
                                <TableCell>Gesamt</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">
                                    {formatEuro(unitSettlement.total_costs)}
                                </TableCell>
                                <TableCell>-</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Notes */}
            <Card id="notes-section" className="scroll-mt-16">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Notizen</CardTitle>
                    {!isEditingNotes && !isFinalized && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingNotes(true)}
                        >
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
                                        setNotes(unitSettlement.notes || "");
                                        setIsEditingNotes(false);
                                    }}
                                >
                                    Abbrechen
                                </Button>
                            </div>
                        </div>
                    ) : unitSettlement.notes ? (
                        <p className="text-gray-700 whitespace-pre-wrap">
                            {unitSettlement.notes}
                        </p>
                    ) : (
                        <p className="text-gray-400 italic">
                            Keine Notizen vorhanden
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* OCR Details Modal */}
            <OcrModal
                isOpen={showOcrModal}
                onClose={handleCloseOcrModal}
                document={selectedDocument}
                settlementId={settlementId}
                unitId={unitSettlement?.unit_id}
                defaultAllocation={defaultAllocation}
                onInvoiceCreated={handleOcrInvoiceCreated}
            />

            {/* Confirm Dialog */}
            {ConfirmDialog}
        </div>
    );
}
