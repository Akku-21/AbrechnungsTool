"""
OCR-Service für die Verarbeitung von Dokumenten
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.invoice import Invoice
from app.models.enums import DocumentStatus
from app.ocr.processor import OCRProcessor


class OCRService:
    """Service für OCR-Verarbeitung von Dokumenten"""

    def __init__(self):
        self.processor = OCRProcessor()

    def process_document(self, document_id: UUID, db: Session) -> Document:
        """
        Verarbeite ein Dokument mit OCR und speichere die Ergebnisse
        """
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise ValueError(f"Dokument nicht gefunden: {document_id}")

        try:
            # Status auf "Processing" setzen
            document.document_status = DocumentStatus.PROCESSING
            db.commit()

            # OCR ausführen
            result = self.processor.process_file(document.file_path)

            # Ergebnisse speichern
            document.ocr_raw_text = result.raw_text
            document.ocr_confidence = result.confidence
            document.document_status = DocumentStatus.PROCESSED
            document.processed_at = datetime.now()

            db.commit()
            db.refresh(document)

            return document

        except Exception as e:
            # Fehler dokumentieren
            document.document_status = DocumentStatus.FAILED
            document.ocr_raw_text = f"Fehler bei der Verarbeitung: {str(e)}"
            db.commit()
            raise

    def create_invoice_from_ocr(
        self,
        document_id: UUID,
        db: Session
    ) -> Invoice:
        """
        Erstelle eine Rechnung aus OCR-Ergebnissen
        """
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise ValueError(f"Dokument nicht gefunden: {document_id}")

        if document.document_status != DocumentStatus.PROCESSED:
            raise ValueError("Dokument wurde noch nicht verarbeitet")

        # OCR-Ergebnisse erneut extrahieren
        result = self.processor.process_file(document.file_path)
        extracted = result.extracted_data

        # Rechnung erstellen
        invoice = Invoice(
            settlement_id=document.settlement_id,
            document_id=document.id,
            vendor_name=extracted.vendor_name or "Unbekannt",
            invoice_number=extracted.invoice_number,
            invoice_date=extracted.invoice_date,
            total_amount=extracted.total_amount or 0,
            cost_category=extracted.suggested_category,
            is_verified=False
        )

        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        return invoice

    def get_ocr_suggestions(self, document_id: UUID, db: Session) -> dict:
        """
        Hole OCR-Vorschläge für ein Dokument
        """
        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            raise ValueError(f"Dokument nicht gefunden: {document_id}")

        if document.document_status not in [DocumentStatus.PROCESSED, DocumentStatus.VERIFIED]:
            return {
                "status": document.document_status.value,
                "message": "Dokument wurde noch nicht verarbeitet",
                "suggestions": None
            }

        result = self.processor.process_file(document.file_path)
        extracted = result.extracted_data

        return {
            "status": document.document_status.value,
            "confidence": result.confidence,
            "suggestions": {
                "vendor_name": extracted.vendor_name,
                "invoice_number": extracted.invoice_number,
                "invoice_date": extracted.invoice_date.isoformat() if extracted.invoice_date else None,
                "total_amount": float(extracted.total_amount) if extracted.total_amount else None,
                "suggested_category": extracted.suggested_category.value if extracted.suggested_category else None
            },
            "raw_text": result.raw_text[:2000]  # Erste 2000 Zeichen
        }
