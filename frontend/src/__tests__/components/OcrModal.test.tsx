import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OcrModal } from '@/components/documents/OcrModal'
import type { Document } from '@/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock hooks
const mockUseOCRResult = jest.fn()
const mockUseReExtractDocument = jest.fn()
const mockUseCreateInvoice = jest.fn()

jest.mock('@/hooks/useDocuments', () => ({
  useOCRResult: (...args: unknown[]) => mockUseOCRResult(...args),
  useReExtractDocument: () => mockUseReExtractDocument(),
}))

jest.mock('@/hooks/useInvoices', () => ({
  useCreateInvoice: () => mockUseCreateInvoice(),
}))

// Mock useToast
const mockToast = jest.fn()
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Loader2: () => <span data-testid="icon-loader" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  ChevronUp: () => <span data-testid="icon-chevron-up" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Plus: () => <span data-testid="icon-plus" />,
}))

// Wrapper component with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('OcrModal', () => {
  const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 'doc-1',
    settlement_id: 'settlement-1',
    original_filename: 'invoice.pdf',
    file_path: '/uploads/invoice.pdf',
    file_size_mb: 1.5,
    mime_type: 'application/pdf',
    document_status: 'PROCESSED',
    include_in_export: false,
    created_at: '2024-01-15T10:00:00Z',
    ...overrides,
  })

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    document: createMockDocument(),
    settlementId: 'settlement-1',
    defaultAllocation: 1.0,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockUseOCRResult.mockReturnValue({
      data: null,
      isLoading: false,
    })

    mockUseReExtractDocument.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })

    mockUseCreateInvoice.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    })
  })

  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <OcrModal {...defaultProps} isOpen={false} />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByText('OCR-Ergebnisse')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      render(
        <OcrModal {...defaultProps} isOpen={true} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('OCR-Ergebnisse')).toBeInTheDocument()
    })
  })

  describe('header', () => {
    it('displays document filename', () => {
      render(
        <OcrModal
          {...defaultProps}
          document={createMockDocument({ original_filename: 'test-doc.pdf' })}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('test-doc.pdf')).toBeInTheDocument()
    })

    it('calls onClose when X button clicked', () => {
      const onClose = jest.fn()
      render(
        <OcrModal {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByTestId('icon-x').closest('button')!)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when clicking backdrop', () => {
      const onClose = jest.fn()
      render(
        <OcrModal {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      // Click on backdrop (the first div with bg-black/50)
      fireEvent.click(document.querySelector('.bg-black\\/50')!)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('shows loader when OCR result is loading', () => {
      mockUseOCRResult.mockReturnValue({
        data: null,
        isLoading: true,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })
  })

  describe('OCR result display', () => {
    const mockOcrResult = {
      confidence: 85.5,
      engine: 'Tesseract',
      llm_extraction_used: true,
      llm_extraction_error: null,
      raw_text: 'Raw OCR text content',
      extracted_data: {
        vendor_name: 'Test Vendor',
        invoice_number: 'INV-001',
        invoice_date: '2024-01-15',
        total_amount: 1234.56,
        suggested_category: 'HEIZUNG',
      },
    }

    it('displays OCR confidence', () => {
      mockUseOCRResult.mockReturnValue({
        data: mockOcrResult,
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('OCR-Konfidenz:')).toBeInTheDocument()
      expect(screen.getByText(/85,5%/)).toBeInTheDocument()
    })

    it('displays OCR engine', () => {
      mockUseOCRResult.mockReturnValue({
        data: mockOcrResult,
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Engine:')).toBeInTheDocument()
      expect(screen.getByText('Tesseract')).toBeInTheDocument()
    })

    it('displays LLM extraction indicator when used', () => {
      mockUseOCRResult.mockReturnValue({
        data: mockOcrResult,
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Extraktion:')).toBeInTheDocument()
      expect(screen.getByText('LLM')).toBeInTheDocument()
    })

    it('displays Regex indicator when LLM not used', () => {
      mockUseOCRResult.mockReturnValue({
        data: { ...mockOcrResult, llm_extraction_used: false },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Regex')).toBeInTheDocument()
    })
  })

  describe('LLM extraction error', () => {
    it('displays error warning when LLM extraction failed', () => {
      mockUseOCRResult.mockReturnValue({
        data: {
          confidence: 50,
          llm_extraction_used: false,
          llm_extraction_error: 'API rate limit exceeded',
          extracted_data: {},
        },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('LLM-Extraktion fehlgeschlagen')).toBeInTheDocument()
      expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument()
    })
  })

  describe('form fields', () => {
    const mockOcrResult = {
      confidence: 85,
      llm_extraction_used: true,
      extracted_data: {
        vendor_name: 'Test Vendor',
        invoice_number: 'INV-001',
        invoice_date: '2024-01-15',
        total_amount: 1234.56,
        suggested_category: 'HEIZUNG',
      },
    }

    beforeEach(() => {
      mockUseOCRResult.mockReturnValue({
        data: mockOcrResult,
        isLoading: false,
      })
    })

    it('populates vendor name from OCR data', () => {
      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Anbieter/i) as HTMLInputElement
      expect(input.value).toBe('Test Vendor')
    })

    it('populates invoice number from OCR data', () => {
      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Rechnungsnummer/i) as HTMLInputElement
      expect(input.value).toBe('INV-001')
    })

    it('converts and populates invoice date to German format', () => {
      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Datum/i) as HTMLInputElement
      expect(input.value).toBe('15.01.2024')
    })

    it('populates total amount in German format', () => {
      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Betrag/i) as HTMLInputElement
      expect(input.value).toBe('1.234,56')
    })

    it('allows editing vendor name', async () => {
      const user = userEvent.setup()
      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Anbieter/i) as HTMLInputElement
      await user.clear(input)
      await user.type(input, 'New Vendor')

      expect(input.value).toBe('New Vendor')
    })

    it('populates allocation percentage from defaultAllocation', () => {
      render(
        <OcrModal {...defaultProps} defaultAllocation={0.75} />,
        { wrapper: createWrapper() }
      )

      const input = screen.getByLabelText(/Anteil/i) as HTMLInputElement
      expect(input.value).toBe('75')
    })
  })

  describe('re-extract button', () => {
    it('renders re-extract button', () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Neu extrahieren (LLM)')).toBeInTheDocument()
    })

    it('calls mutateAsync when re-extract clicked', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({
        extracted_data: { vendor_name: 'Re-extracted Vendor' },
      })
      mockUseReExtractDocument.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} document={createMockDocument({ id: 'doc-123' })} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Neu extrahieren (LLM)'))

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith('doc-123')
      })
    })

    it('shows loading state when re-extracting', () => {
      mockUseReExtractDocument.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Extrahiere...')).toBeInTheDocument()
    })

    it('shows success toast after re-extract', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({
        extracted_data: { vendor_name: 'New Vendor' },
      })
      mockUseReExtractDocument.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Neu extrahieren (LLM)'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'LLM-Extraktion erfolgreich',
            variant: 'success',
          })
        )
      })
    })
  })

  describe('create invoice button', () => {
    it('renders create invoice button', () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: { total_amount: 100 } },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Rechnung aus Daten erstellen')).toBeInTheDocument()
    })

    it('button is disabled when total_amount is empty', () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      const button = screen.getByText('Rechnung aus Daten erstellen').closest('button')
      expect(button).toBeDisabled()
    })

    it('calls createInvoice with form data', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({})
      mockUseCreateInvoice.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: {
          confidence: 85,
          extracted_data: {
            vendor_name: 'Test Vendor',
            invoice_number: 'INV-001',
            invoice_date: '2024-01-15',
            total_amount: 100,
            suggested_category: 'HEIZUNG',
          },
        },
        isLoading: false,
      })

      const onClose = jest.fn()
      render(
        <OcrModal
          {...defaultProps}
          onClose={onClose}
          document={createMockDocument({ id: 'doc-123' })}
          settlementId="settlement-456"
        />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Rechnung aus Daten erstellen'))

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            settlement_id: 'settlement-456',
            document_id: 'doc-123',
            vendor_name: 'Test Vendor',
          })
        )
      })
    })

    it('calls onClose after invoice created', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({})
      mockUseCreateInvoice.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: { total_amount: 100 } },
        isLoading: false,
      })

      const onClose = jest.fn()
      render(
        <OcrModal {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Rechnung aus Daten erstellen'))

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('calls onInvoiceCreated callback', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({})
      mockUseCreateInvoice.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: { total_amount: 100 } },
        isLoading: false,
      })

      const onInvoiceCreated = jest.fn()
      render(
        <OcrModal {...defaultProps} onInvoiceCreated={onInvoiceCreated} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Rechnung aus Daten erstellen'))

      await waitFor(() => {
        expect(onInvoiceCreated).toHaveBeenCalled()
      })
    })
  })

  describe('raw text toggle', () => {
    it('shows toggle button for raw text', () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, raw_text: 'Some text', extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText(/OCR-Rohtext anzeigen/)).toBeInTheDocument()
    })

    it('toggles raw text visibility', async () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, raw_text: 'Raw OCR content here', extracted_data: {} },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      // Raw text should not be visible initially
      expect(screen.queryByText('Raw OCR content here')).not.toBeInTheDocument()

      // Click to show
      fireEvent.click(screen.getByText(/OCR-Rohtext anzeigen/))

      // Raw text should now be visible
      expect(screen.getByText('Raw OCR content here')).toBeInTheDocument()
      expect(screen.getByText(/OCR-Rohtext ausblenden/)).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('calls onClose when Schließen button clicked', () => {
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: {} },
        isLoading: false,
      })

      const onClose = jest.fn()
      render(
        <OcrModal {...defaultProps} onClose={onClose} />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Schließen'))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('no OCR data', () => {
    it('displays message when no OCR data', () => {
      mockUseOCRResult.mockReturnValue({
        data: null,
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Keine OCR-Daten vorhanden')).toBeInTheDocument()
    })
  })

  describe('unit-specific invoices', () => {
    it('includes unitId in invoice when provided', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({})
      mockUseCreateInvoice.mockReturnValue({
        mutateAsync,
        isPending: false,
      })
      mockUseOCRResult.mockReturnValue({
        data: { confidence: 85, extracted_data: { total_amount: 100 } },
        isLoading: false,
      })

      render(
        <OcrModal {...defaultProps} unitId="unit-789" />,
        { wrapper: createWrapper() }
      )

      fireEvent.click(screen.getByText('Rechnung aus Daten erstellen'))

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            unit_id: 'unit-789',
          })
        )
      })
    })
  })
})
