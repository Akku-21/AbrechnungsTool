import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '@/components/documents/DocumentCard'
import type { Document } from '@/types'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileText: () => <span data-testid="icon-file-text" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
  Eye: () => <span data-testid="icon-eye" />,
  FileSearch: () => <span data-testid="icon-file-search" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Building2: () => <span data-testid="icon-building" />,
}))

// Mock Button component
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

describe('DocumentCard', () => {
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

  describe('basic rendering', () => {
    it('renders document filename', () => {
      render(
        <DocumentCard
          document={createMockDocument({ original_filename: 'my-invoice.pdf' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('my-invoice.pdf')).toBeInTheDocument()
    })

    it('renders file size in German format', () => {
      render(
        <DocumentCard
          document={createMockDocument({ file_size_mb: 2.5 })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText(/2,50.*MB/)).toBeInTheDocument()
    })

    it('renders document status', () => {
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PROCESSED' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('Verarbeitet')).toBeInTheDocument()
    })

    it('renders FileText icon for normal documents', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
        />
      )

      expect(screen.getByTestId('icon-file-text')).toBeInTheDocument()
    })
  })

  describe('invoice badge', () => {
    it('shows "Rechnung erstellt" badge when hasInvoice is true', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={true}
        />
      )

      expect(screen.getByText('Rechnung erstellt')).toBeInTheDocument()
    })

    it('does not show invoice badge when hasInvoice is false', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
        />
      )

      expect(screen.queryByText('Rechnung erstellt')).not.toBeInTheDocument()
    })

    it('shows check circle icon when hasInvoice is true', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={true}
        />
      )

      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument()
    })
  })

  describe('inherited documents', () => {
    it('shows "Von Liegenschaft" badge when inherited', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          isInherited={true}
        />
      )

      expect(screen.getByText('Von Liegenschaft')).toBeInTheDocument()
    })

    it('shows Building2 icon when inherited', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          isInherited={true}
        />
      )

      expect(screen.getByTestId('icon-building')).toBeInTheDocument()
    })

    it('does not show checkbox when inherited', () => {
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          isInherited={true}
        />
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('export checkbox', () => {
    it('renders checkbox when onToggleExport is provided', () => {
      const onToggleExport = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ include_in_export: false })}
          hasInvoice={false}
          onToggleExport={onToggleExport}
        />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('checkbox reflects include_in_export state', () => {
      const onToggleExport = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ include_in_export: true })}
          hasInvoice={false}
          onToggleExport={onToggleExport}
        />
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('calls onToggleExport when checkbox is clicked', () => {
      const onToggleExport = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ id: 'doc-123', include_in_export: false })}
          hasInvoice={false}
          onToggleExport={onToggleExport}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(onToggleExport).toHaveBeenCalledWith('doc-123', false)
    })

    it('shows "Anhang" indicator when include_in_export is true', () => {
      render(
        <DocumentCard
          document={createMockDocument({ include_in_export: true })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText(/Anhang/)).toBeInTheDocument()
    })

    it('does not show checkbox when isReadOnly is true', () => {
      const onToggleExport = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          onToggleExport={onToggleExport}
          isReadOnly={true}
        />
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('OCR button', () => {
    it('shows OCR button for PENDING documents', () => {
      const onProcess = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
          onProcess={onProcess}
        />
      )

      expect(screen.getByText('OCR')).toBeInTheDocument()
    })

    it('does not show OCR button for inherited documents', () => {
      const onProcess = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
          onProcess={onProcess}
          isInherited={true}
        />
      )

      expect(screen.queryByText('OCR')).not.toBeInTheDocument()
    })

    it('calls onProcess with document id when OCR button clicked', () => {
      const onProcess = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ id: 'doc-456', document_status: 'PENDING' })}
          hasInvoice={false}
          onProcess={onProcess}
        />
      )

      fireEvent.click(screen.getByText('OCR'))

      expect(onProcess).toHaveBeenCalledWith('doc-456')
    })

    it('disables OCR button when isProcessing is true', () => {
      const onProcess = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
          onProcess={onProcess}
          isProcessing={true}
        />
      )

      expect(screen.getByText('OCR').closest('button')).toBeDisabled()
    })

    it('shows loader icon when isProcessing is true', () => {
      const onProcess = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
          onProcess={onProcess}
          isProcessing={true}
        />
      )

      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })
  })

  describe('details button', () => {
    it('shows Details button for PROCESSED documents', () => {
      const onShowOcr = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PROCESSED' })}
          hasInvoice={false}
          onShowOcr={onShowOcr}
        />
      )

      expect(screen.getByText('Details')).toBeInTheDocument()
    })

    it('shows Details button for FAILED documents', () => {
      const onShowOcr = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'FAILED' })}
          hasInvoice={false}
          onShowOcr={onShowOcr}
        />
      )

      expect(screen.getByText('Details')).toBeInTheDocument()
    })

    it('does not show Details button for PENDING documents', () => {
      const onShowOcr = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
          onShowOcr={onShowOcr}
        />
      )

      expect(screen.queryByText('Details')).not.toBeInTheDocument()
    })

    it('calls onShowOcr with document when Details button clicked', () => {
      const onShowOcr = jest.fn()
      const doc = createMockDocument({ id: 'doc-789', document_status: 'PROCESSED' })
      render(
        <DocumentCard
          document={doc}
          hasInvoice={false}
          onShowOcr={onShowOcr}
        />
      )

      fireEvent.click(screen.getByText('Details'))

      expect(onShowOcr).toHaveBeenCalledWith(doc)
    })
  })

  describe('delete button', () => {
    it('shows delete button when onDelete is provided', () => {
      const onDelete = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          onDelete={onDelete}
        />
      )

      expect(screen.getByTestId('icon-trash')).toBeInTheDocument()
    })

    it('does not show delete button for inherited documents', () => {
      const onDelete = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          onDelete={onDelete}
          isInherited={true}
        />
      )

      expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument()
    })

    it('does not show delete button when isReadOnly is true', () => {
      const onDelete = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument()}
          hasInvoice={false}
          onDelete={onDelete}
          isReadOnly={true}
        />
      )

      expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument()
    })

    it('calls onDelete with document id when delete button clicked', () => {
      const onDelete = jest.fn()
      render(
        <DocumentCard
          document={createMockDocument({ id: 'doc-999' })}
          hasInvoice={false}
          onDelete={onDelete}
        />
      )

      fireEvent.click(screen.getByTestId('icon-trash').closest('button')!)

      expect(onDelete).toHaveBeenCalledWith('doc-999')
    })
  })

  describe('document status colors', () => {
    it('shows gray color for PENDING status', () => {
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PENDING' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('Ausstehend')).toHaveClass('text-gray-500')
    })

    it('shows blue color for PROCESSING status', () => {
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PROCESSING' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('Verarbeitung...')).toHaveClass('text-blue-500')
    })

    it('shows green color for PROCESSED status', () => {
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'PROCESSED' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('Verarbeitet')).toHaveClass('text-green-500')
    })

    it('shows red color for FAILED status', () => {
      render(
        <DocumentCard
          document={createMockDocument({ document_status: 'FAILED' })}
          hasInvoice={false}
        />
      )

      expect(screen.getByText('Fehlgeschlagen')).toHaveClass('text-red-500')
    })
  })
})
