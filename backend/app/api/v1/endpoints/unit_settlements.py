"""
Unit Settlement (Einzelabrechnung) API Endpoints

Endpoints für die Verwaltung von Einzelabrechnungen pro Wohneinheit/Mieter.
"""
from decimal import Decimal
from typing import List
from uuid import UUID
import os
import uuid as uuid_module
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
import io

from app.db.session import get_db
from app.models.settlement import Settlement
from app.models.settlement_result import SettlementResult
from app.models.document import Document
from app.models.enums import SettlementStatus, DocumentStatus
from app.schemas.settlement import (
    UnitSettlementResponse,
    UnitSettlementUpdate,
    UnitSettlementListResponse,
)
from app.schemas.document import DocumentResponse
from app.config import settings

router = APIRouter()


def _get_unit_settlement_or_404(
    unit_settlement_id: UUID,
    db: Session
) -> SettlementResult:
    """Helper: Einzelabrechnung laden oder 404"""
    result = db.query(SettlementResult).options(
        joinedload(SettlementResult.unit),
        joinedload(SettlementResult.tenant),
        joinedload(SettlementResult.cost_breakdowns),
        joinedload(SettlementResult.documents),
    ).filter(SettlementResult.id == unit_settlement_id).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Einzelabrechnung nicht gefunden"
        )
    return result


@router.get(
    "/settlements/{settlement_id}/unit-settlements",
    response_model=UnitSettlementListResponse,
    tags=["Unit Settlements"]
)
def list_unit_settlements(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Liste aller Einzelabrechnungen einer Settlement"""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    results = db.query(SettlementResult).options(
        joinedload(SettlementResult.unit),
        joinedload(SettlementResult.tenant),
        joinedload(SettlementResult.cost_breakdowns),
        joinedload(SettlementResult.documents),
    ).filter(
        SettlementResult.settlement_id == settlement_id
    ).order_by(SettlementResult.created_at).all()

    # Summen berechnen
    total_costs = sum(r.total_costs for r in results) if results else Decimal("0.00")
    total_balance = sum(r.balance for r in results) if results else Decimal("0.00")

    return UnitSettlementListResponse(
        unit_settlements=results,
        total_costs=total_costs,
        total_balance=total_balance
    )


@router.get(
    "/unit-settlements/{unit_settlement_id}",
    response_model=UnitSettlementResponse,
    tags=["Unit Settlements"]
)
def get_unit_settlement(
    unit_settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Einzelabrechnung abrufen"""
    return _get_unit_settlement_or_404(unit_settlement_id, db)


@router.patch(
    "/unit-settlements/{unit_settlement_id}",
    response_model=UnitSettlementResponse,
    tags=["Unit Settlements"]
)
def update_unit_settlement(
    unit_settlement_id: UUID,
    update_data: UnitSettlementUpdate,
    db: Session = Depends(get_db)
):
    """Einzelabrechnung aktualisieren (nur Notes)"""
    result = _get_unit_settlement_or_404(unit_settlement_id, db)

    # Prüfen ob Settlement finalisiert
    settlement = db.query(Settlement).filter(Settlement.id == result.settlement_id).first()
    if settlement and settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    # Update
    if update_data.notes is not None:
        result.notes = update_data.notes

    db.commit()
    db.refresh(result)
    return result


@router.get(
    "/unit-settlements/{unit_settlement_id}/documents",
    response_model=List[DocumentResponse],
    tags=["Unit Settlements"]
)
def list_unit_settlement_documents(
    unit_settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Dokumente einer Einzelabrechnung abrufen"""
    result = _get_unit_settlement_or_404(unit_settlement_id, db)
    return result.documents


@router.post(
    "/unit-settlements/{unit_settlement_id}/documents",
    status_code=status.HTTP_201_CREATED,
    tags=["Unit Settlements"]
)
async def upload_unit_settlement_document(
    unit_settlement_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Dokument zu einer Einzelabrechnung hochladen"""
    result = _get_unit_settlement_or_404(unit_settlement_id, db)

    # Prüfen ob Settlement finalisiert
    settlement = db.query(Settlement).filter(Settlement.id == result.settlement_id).first()
    if settlement and settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    # Datei validieren
    allowed_extensions = settings.ALLOWED_EXTENSIONS
    file_ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dateityp nicht erlaubt. Erlaubt: {', '.join(allowed_extensions)}"
        )

    # Datei lesen und Größe prüfen
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei zu groß. Maximal {settings.MAX_FILE_SIZE // (1024*1024)}MB erlaubt"
        )

    # Datei speichern
    stored_filename = f"{uuid_module.uuid4()}.{file_ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(result.settlement_id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Dokument in DB erstellen
    document = Document(
        settlement_id=result.settlement_id,
        settlement_result_id=result.id,  # Unit-spezifisch!
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size_bytes=len(content),
        mime_type=file.content_type or "application/octet-stream",
        document_status=DocumentStatus.PENDING,
        include_in_export=True,  # Unit-Dokumente standardmäßig exportieren
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "id": document.id,
        "filename": document.original_filename,
        "status": document.document_status,
        "message": "Dokument erfolgreich hochgeladen"
    }


@router.get(
    "/unit-settlements/{unit_settlement_id}/export/pdf",
    tags=["Unit Settlements"]
)
def export_unit_settlement_pdf(
    unit_settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """PDF für eine einzelne Wohneinheit exportieren"""
    from app.pdf.generator import PDFGenerator

    result = _get_unit_settlement_or_404(unit_settlement_id, db)

    # Settlement laden für Metadaten
    settlement = db.query(Settlement).filter(Settlement.id == result.settlement_id).first()
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    try:
        generator = PDFGenerator()
        pdf_bytes = generator.generate_unit_settlement_pdf(unit_settlement_id, db)

        # Dateiname mit Unit-Bezeichnung
        unit_designation = result.unit.designation.replace(" ", "_").replace("/", "-")
        tenant_name = f"{result.tenant.last_name}".replace(" ", "_")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Nebenkostenabrechnung_{settlement.year}_{unit_designation}_{tenant_name}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF-Generierung fehlgeschlagen: {str(e)}"
        )
