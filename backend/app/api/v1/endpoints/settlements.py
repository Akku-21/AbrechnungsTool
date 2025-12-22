from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.db.session import get_db
from app.models.settlement import Settlement
from app.models.property import Property
from app.models.enums import SettlementStatus
from app.schemas.settlement import SettlementCreate, SettlementUpdate, SettlementResponse

router = APIRouter()


@router.get("", response_model=List[SettlementResponse])
def list_settlements(
    property_id: UUID = None,
    status: SettlementStatus = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Abrechnungen"""
    query = db.query(Settlement)
    if property_id:
        query = query.filter(Settlement.property_id == property_id)
    if status:
        query = query.filter(Settlement.status == status)
    return query.order_by(Settlement.period_start.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def create_settlement(
    settlement_in: SettlementCreate,
    db: Session = Depends(get_db)
):
    """Neue Abrechnung anlegen"""
    # Prüfen ob Liegenschaft existiert
    property_obj = db.query(Property).filter(Property.id == settlement_in.property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liegenschaft nicht gefunden"
        )

    # Prüfen ob Zeitraum gültig
    if settlement_in.period_start >= settlement_in.period_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Startdatum muss vor Enddatum liegen"
        )

    settlement_obj = Settlement(**settlement_in.model_dump())
    db.add(settlement_obj)
    db.commit()
    db.refresh(settlement_obj)
    return settlement_obj


@router.get("/{settlement_id}", response_model=SettlementResponse)
def get_settlement(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Abrechnung abrufen"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )
    return settlement_obj


@router.put("/{settlement_id}", response_model=SettlementResponse)
def update_settlement(
    settlement_id: UUID,
    settlement_in: SettlementUpdate,
    db: Session = Depends(get_db)
):
    """Abrechnung aktualisieren"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    if settlement_obj.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    update_data = settlement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settlement_obj, field, value)

    db.commit()
    db.refresh(settlement_obj)
    return settlement_obj


@router.delete("/{settlement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_settlement(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Abrechnung löschen (nur Entwürfe)"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    if settlement_obj.status != SettlementStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur Entwürfe können gelöscht werden"
        )

    db.delete(settlement_obj)
    db.commit()
    return None


@router.post("/{settlement_id}/calculate", response_model=SettlementResponse)
def calculate_settlement(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Abrechnung berechnen"""
    from app.services.calculation_service import CalculationService

    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    try:
        calculation_service = CalculationService()
        calculation_service.calculate_settlement(settlement_id, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    db.refresh(settlement_obj)
    return settlement_obj


@router.post("/{settlement_id}/finalize", response_model=SettlementResponse)
def finalize_settlement(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Abrechnung finalisieren"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    if settlement_obj.status == SettlementStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Abrechnung muss zuerst berechnet werden"
        )

    settlement_obj.status = SettlementStatus.FINALIZED
    settlement_obj.finalized_at = datetime.now()
    db.commit()
    db.refresh(settlement_obj)
    return settlement_obj


@router.get("/{settlement_id}/export/pdf")
def export_settlement_pdf(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Abrechnung als PDF exportieren"""
    from app.pdf.generator import PDFGenerator

    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    if settlement_obj.status == SettlementStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Abrechnung muss zuerst berechnet werden"
        )

    try:
        generator = PDFGenerator()
        pdf_bytes = generator.generate_settlement_pdf(settlement_id, db)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Nebenkostenabrechnung_{settlement_obj.year}.pdf"
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
