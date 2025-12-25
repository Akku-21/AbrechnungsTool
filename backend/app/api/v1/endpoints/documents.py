from typing import List
from uuid import UUID
import uuid as uuid_module
import os
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.config import settings
from app.models.document import Document
from app.models.settlement import Settlement
from app.models.enums import DocumentStatus
from app.schemas.document import DocumentResponse, DocumentUploadResponse, OCRResultResponse, DocumentUpdate
from app.ocr.processor import OCRProcessor

router = APIRouter()
logger = logging.getLogger(__name__)


def get_upload_path(settlement_id: UUID, filename: str) -> str:
    """Generiere Pfad für hochgeladene Datei"""
    directory = os.path.join(settings.UPLOAD_DIR, "documents", str(settlement_id))
    os.makedirs(directory, exist_ok=True)
    return os.path.join(directory, filename)


def process_document_ocr(document_id: UUID):
    """Background Task fuer OCR-Verarbeitung"""
    # Neue DB-Session fuer Background Task
    db = SessionLocal()
    try:
        document_obj = db.query(Document).filter(Document.id == document_id).first()
        if not document_obj:
            logger.error(f"Dokument nicht gefunden: {document_id}")
            return

        logger.info(f"Starte OCR-Verarbeitung fuer Dokument: {document_obj.original_filename}")

        try:
            # DB-Session fuer LLM-Extraktion uebergeben
            processor = OCRProcessor(db=db)
            result = processor.process_file(document_obj.file_path)

            document_obj.ocr_raw_text = result.raw_text
            document_obj.ocr_corrected_text = result.corrected_text
            document_obj.ocr_confidence = result.confidence
            document_obj.ocr_engine = result.engine_used
            document_obj.llm_extraction_used = result.llm_extraction_used
            document_obj.llm_extraction_error = result.llm_extraction_error
            document_obj.document_status = DocumentStatus.PROCESSED
            document_obj.processed_at = datetime.utcnow()

            # Extrahierte Daten speichern (von LLM oder Regex)
            if result.extracted_data:
                document_obj.extracted_vendor_name = result.extracted_data.vendor_name
                document_obj.extracted_invoice_number = result.extracted_data.invoice_number
                document_obj.extracted_invoice_date = result.extracted_data.invoice_date
                document_obj.extracted_total_amount = result.extracted_data.total_amount
                document_obj.extracted_cost_category = result.extracted_data.suggested_category

            llm_info = " (mit LLM-Extraktion)" if result.llm_extraction_used else ""
            if result.llm_extraction_error:
                llm_info = f" (LLM-Fehler: {result.llm_extraction_error[:50]}...)"
            logger.info(f"OCR erfolgreich: {document_obj.original_filename} "
                       f"(Konfidenz: {result.confidence}%, Engine: {result.engine_used}{llm_info})")

        except Exception as e:
            logger.error(f"OCR-Fehler fuer {document_obj.original_filename}: {str(e)}")
            document_obj.document_status = DocumentStatus.FAILED
            document_obj.ocr_raw_text = f"Fehler: {str(e)}"

        db.commit()

    except Exception as e:
        logger.error(f"Fehler bei OCR-Verarbeitung: {str(e)}")
        db.rollback()
    finally:
        db.close()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """Dokument abrufen"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )
    return document_obj


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    document_update: DocumentUpdate,
    db: Session = Depends(get_db)
):
    """Dokument aktualisieren"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    update_data = document_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document_obj, field, value)

    db.commit()
    db.refresh(document_obj)
    return document_obj


@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """Dokument herunterladen"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    if not os.path.exists(document_obj.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datei nicht gefunden"
        )

    return FileResponse(
        path=document_obj.file_path,
        filename=document_obj.original_filename,
        media_type=document_obj.mime_type
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """Dokument löschen"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    # Datei löschen falls vorhanden
    if os.path.exists(document_obj.file_path):
        os.remove(document_obj.file_path)

    db.delete(document_obj)
    db.commit()
    return None


@router.post("/{document_id}/process", response_model=DocumentResponse)
async def process_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """OCR-Verarbeitung starten"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    if document_obj.document_status == DocumentStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dokument wird bereits verarbeitet"
        )

    document_obj.document_status = DocumentStatus.PROCESSING
    db.commit()

    # Background Task für OCR starten
    background_tasks.add_task(process_document_ocr, document_id)

    db.refresh(document_obj)
    return document_obj


@router.get("/{document_id}/ocr-result", response_model=OCRResultResponse)
def get_ocr_result(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """OCR-Ergebnis abrufen - verwendet gespeicherte extrahierte Daten"""
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    # Verwende gespeicherte extrahierte Daten (von LLM oder Regex bei OCR-Verarbeitung)
    extracted_data = None
    if document_obj.extracted_vendor_name or document_obj.extracted_total_amount:
        extracted_data = {
            "vendor_name": document_obj.extracted_vendor_name,
            "invoice_number": document_obj.extracted_invoice_number,
            "invoice_date": document_obj.extracted_invoice_date.isoformat() if document_obj.extracted_invoice_date else None,
            "total_amount": float(document_obj.extracted_total_amount) if document_obj.extracted_total_amount else None,
            "suggested_category": document_obj.extracted_cost_category.value if document_obj.extracted_cost_category else None,
        }
    elif document_obj.ocr_text:
        # Fallback: Regex-Extraktion fuer aeltere Dokumente ohne gespeicherte Daten
        from app.ocr.extractor import InvoiceDataExtractor
        extractor = InvoiceDataExtractor()
        extracted = extractor.extract(document_obj.ocr_text)
        extracted_data = {
            "vendor_name": extracted.vendor_name,
            "invoice_number": extracted.invoice_number,
            "invoice_date": extracted.invoice_date.isoformat() if extracted.invoice_date else None,
            "total_amount": float(extracted.total_amount) if extracted.total_amount else None,
            "suggested_category": extracted.suggested_category.value if extracted.suggested_category else None,
        }

    return OCRResultResponse(
        document_id=document_obj.id,
        status=document_obj.document_status,
        raw_text=document_obj.ocr_raw_text,
        corrected_text=document_obj.ocr_corrected_text,
        confidence=document_obj.ocr_confidence,
        engine=document_obj.ocr_engine,
        llm_extraction_used=document_obj.llm_extraction_used,
        llm_extraction_error=document_obj.llm_extraction_error,
        extracted_data=extracted_data
    )


@router.post("/{document_id}/re-extract", response_model=OCRResultResponse)
async def re_extract_data(
    document_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Erneute LLM-Extraktion der Rechnungsdaten aus dem OCR-Text.
    Ueberschreibt die gespeicherten extrahierten Daten.
    """
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden"
        )

    if not document_obj.ocr_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kein OCR-Text vorhanden. Bitte zuerst OCR-Verarbeitung durchfuehren."
        )

    # Versuche LLM-Extraktion
    from app.services.llm_service import get_llm_settings

    llm_settings = get_llm_settings(db)

    if not llm_settings.is_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LLM-Extraktion nicht konfiguriert. Bitte API-Key und Modell in den Einstellungen hinterlegen."
        )

    from app.ocr.llm_corrector import LLMExtractor

    extractor = LLMExtractor(llm_settings.api_key, llm_settings.model)
    result = await extractor.extract_data(document_obj.ocr_text)

    if result.success:
        # Aktualisiere gespeicherte Daten
        document_obj.extracted_vendor_name = result.vendor_name
        document_obj.extracted_invoice_number = result.invoice_number
        document_obj.extracted_invoice_date = result.invoice_date
        document_obj.extracted_total_amount = result.total_amount
        document_obj.extracted_cost_category = result.cost_category
        document_obj.llm_extraction_used = True
        document_obj.llm_extraction_error = None

        db.commit()
        db.refresh(document_obj)

        extracted_data = {
            "vendor_name": result.vendor_name,
            "invoice_number": result.invoice_number,
            "invoice_date": result.invoice_date.isoformat() if result.invoice_date else None,
            "total_amount": float(result.total_amount) if result.total_amount else None,
            "suggested_category": result.cost_category.value if result.cost_category else None,
        }
    else:
        # Speichere Fehler
        document_obj.llm_extraction_error = result.error_message
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM-Extraktion fehlgeschlagen: {result.error_message}"
        )

    return OCRResultResponse(
        document_id=document_obj.id,
        status=document_obj.document_status,
        raw_text=document_obj.ocr_raw_text,
        corrected_text=document_obj.ocr_corrected_text,
        confidence=document_obj.ocr_confidence,
        engine=document_obj.ocr_engine,
        llm_extraction_used=True,
        llm_extraction_error=None,
        extracted_data=extracted_data
    )


# Settlement-bezogene Document Endpoints
@router.get("/settlement/{settlement_id}", response_model=List[DocumentResponse])
def list_settlement_documents(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Dokumente einer Abrechnung abrufen (nur Settlement-weite, keine Unit-spezifischen)"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )
    # Nur Settlement-weite Dokumente (ohne settlement_result_id)
    # Unit-spezifische Dokumente werden nicht nach oben vererbt
    return [doc for doc in settlement_obj.documents if doc.settlement_result_id is None]


@router.post("/settlement/{settlement_id}", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    settlement_id: UUID,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Dokument hochladen"""
    # Prüfen ob Abrechnung existiert
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    # Dateityp prüfen
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dateityp nicht erlaubt. Erlaubt: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Datei speichern
    stored_filename = f"{uuid_module.uuid4()}.{file_ext}"
    file_path = get_upload_path(settlement_id, stored_filename)

    content = await file.read()
    file_size = len(content)

    # Dateigröße prüfen
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei zu groß. Maximum: {settings.MAX_FILE_SIZE // (1024*1024)}MB"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # MIME-Type bestimmen
    mime_types = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg"
    }

    # Dokument in DB speichern
    document_obj = Document(
        settlement_id=settlement_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size_bytes=file_size,
        mime_type=mime_types.get(file_ext, "application/octet-stream"),
        document_status=DocumentStatus.PENDING
    )
    db.add(document_obj)
    db.commit()
    db.refresh(document_obj)

    return DocumentUploadResponse(
        id=document_obj.id,
        status=document_obj.document_status,
        message="Dokument erfolgreich hochgeladen"
    )
