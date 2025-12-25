from typing import List, Optional
from uuid import UUID
import time
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.models.invoice import Invoice, LineItem
from app.models.settlement import Settlement
from app.models.unit import Unit
from app.models.enums import SettlementStatus
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, LineItemCreate, LineItemResponse
from app.services.calculation_service import CalculationService
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _auto_recalculate(settlement_id: UUID, db: Session) -> dict:
    """
    Automatische Neuberechnung der Abrechnung nach Änderungen.
    Returns calculation metadata (duration, success).
    """
    result = {
        "calculated": False,
        "duration_ms": None,
        "error": None,
    }

    try:
        start_time = time.perf_counter()
        calculation_service = CalculationService()
        calculation_service.calculate_settlement(settlement_id, db)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        result["calculated"] = True
        result["duration_ms"] = duration_ms

        # Nur in DEV-Modus loggen
        if settings.DEBUG:
            logger.info(f"Auto-calculate for settlement {settlement_id}: {duration_ms}ms")

    except ValueError as e:
        # Erwartete Fehler (keine Units, keine Mieter, etc.)
        result["error"] = str(e)
        logger.warning(f"Auto-calculate warning for {settlement_id}: {e}")
    except Exception as e:
        # Unerwartete Fehler
        result["error"] = f"Berechnung fehlgeschlagen: {str(e)}"
        logger.error(f"Auto-calculate error for {settlement_id}: {e}", exc_info=True)

    return result


@router.get("/settlement/{settlement_id}/default-allocation")
def get_default_allocation(
    settlement_id: UUID,
    db: Session = Depends(get_db)
):
    """Standard-Verteilungsanteil für eine Abrechnung ermitteln"""
    settlement_obj = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abrechnung nicht gefunden"
        )

    property_obj = settlement_obj.property_ref

    # Alle Einheiten der Liegenschaft
    units = db.query(Unit).filter(Unit.property_id == property_obj.id).all()

    if not units:
        return {"default_allocation": 1.0, "units": []}

    # Berechne Anteil für jede Einheit
    unit_allocations = []
    for unit in units:
        allocation = float(unit.area_sqm / property_obj.total_area_sqm)
        unit_allocations.append({
            "unit_id": str(unit.id),
            "designation": unit.designation,
            "area_sqm": float(unit.area_sqm),
            "allocation_percentage": round(allocation, 4)
        })

    # Bei nur einer Einheit ist der Anteil 100%
    total_allocation = sum(u["allocation_percentage"] for u in unit_allocations)

    return {
        "default_allocation": round(total_allocation, 4),
        "property_total_area": float(property_obj.total_area_sqm),
        "units": unit_allocations
    }


@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    settlement_id: UUID = None,
    unit_id: UUID = None,
    include_settlement_wide: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Rechnungen

    - settlement_id: Filter nach Settlement (ohne unit_id: nur Settlement-weite Rechnungen)
    - unit_id: Filter nach Unit
    - include_settlement_wide: Bei unit_id=True, auch Settlement-weite Rechnungen einschließen
    """
    query = db.query(Invoice)
    if settlement_id:
        query = query.filter(Invoice.settlement_id == settlement_id)

    if unit_id:
        if include_settlement_wide:
            # Unit-spezifische ODER Settlement-weite Rechnungen
            query = query.filter(
                or_(Invoice.unit_id == unit_id, Invoice.unit_id.is_(None))
            )
        else:
            # Nur Unit-spezifische Rechnungen
            query = query.filter(Invoice.unit_id == unit_id)
    else:
        # Ohne unit_id: Nur Settlement-weite Rechnungen (unit_id IS NULL)
        # Unit-spezifische Rechnungen werden nicht nach oben vererbt
        query = query.filter(Invoice.unit_id.is_(None))

    return query.offset(skip).limit(limit).all()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db)
):
    """Neue Rechnung anlegen"""
    from app.models.document import Document

    # Prüfen ob Abrechnung existiert und bearbeitbar ist
    settlement_obj = db.query(Settlement).filter(Settlement.id == invoice_in.settlement_id).first()
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

    # Rechnung erstellen
    invoice_data = invoice_in.model_dump(exclude={"line_items"})

    # Wenn ein Dokument verknüpft ist und dieses zu einem Unit Settlement gehört,
    # übernehme die unit_id automatisch (falls nicht bereits gesetzt)
    if invoice_in.document_id and not invoice_data.get("unit_id"):
        document = db.query(Document).filter(Document.id == invoice_in.document_id).first()
        if document and document.settlement_result_id:
            # Dokument gehört zu einem Unit Settlement - unit_id übernehmen
            from app.models.settlement_result import SettlementResult
            settlement_result = db.query(SettlementResult).filter(
                SettlementResult.id == document.settlement_result_id
            ).first()
            if settlement_result:
                invoice_data["unit_id"] = settlement_result.unit_id
                logger.info(f"Auto-set unit_id={settlement_result.unit_id} from document's settlement_result")

    invoice_obj = Invoice(**invoice_data)
    db.add(invoice_obj)
    db.flush()

    # Positionen erstellen
    for item_data in invoice_in.line_items:
        line_item = LineItem(invoice_id=invoice_obj.id, **item_data.model_dump())
        db.add(line_item)

    db.commit()
    db.refresh(invoice_obj)

    # Automatische Neuberechnung
    _auto_recalculate(invoice_in.settlement_id, db)

    return invoice_obj


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db)
):
    """Rechnung abrufen"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )
    return invoice_obj


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: UUID,
    invoice_in: InvoiceUpdate,
    db: Session = Depends(get_db)
):
    """Rechnung aktualisieren"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )

    if invoice_obj.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    update_data = invoice_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice_obj, field, value)

    db.commit()
    db.refresh(invoice_obj)

    # Automatische Neuberechnung
    _auto_recalculate(invoice_obj.settlement_id, db)

    return invoice_obj


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db)
):
    """Rechnung löschen"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )

    if invoice_obj.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    settlement_id = invoice_obj.settlement_id
    db.delete(invoice_obj)
    db.commit()

    # Automatische Neuberechnung
    _auto_recalculate(settlement_id, db)

    return None


@router.post("/{invoice_id}/verify", response_model=InvoiceResponse)
def verify_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db)
):
    """Rechnung als verifiziert markieren"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )

    invoice_obj.is_verified = True
    db.commit()
    db.refresh(invoice_obj)
    return invoice_obj


# Line Items
@router.get("/{invoice_id}/line-items", response_model=List[LineItemResponse])
def list_line_items(
    invoice_id: UUID,
    db: Session = Depends(get_db)
):
    """Rechnungspositionen abrufen"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )
    return invoice_obj.line_items


@router.post("/{invoice_id}/line-items", response_model=LineItemResponse, status_code=status.HTTP_201_CREATED)
def add_line_item(
    invoice_id: UUID,
    line_item_in: LineItemCreate,
    db: Session = Depends(get_db)
):
    """Rechnungsposition hinzufügen"""
    invoice_obj = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rechnung nicht gefunden"
        )

    if invoice_obj.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    line_item = LineItem(invoice_id=invoice_id, **line_item_in.model_dump())
    db.add(line_item)
    db.commit()
    db.refresh(line_item)
    return line_item


@router.delete("/line-items/{line_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_line_item(
    line_item_id: UUID,
    db: Session = Depends(get_db)
):
    """Rechnungsposition löschen"""
    line_item = db.query(LineItem).filter(LineItem.id == line_item_id).first()
    if not line_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position nicht gefunden"
        )

    if line_item.invoice.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    db.delete(line_item)
    db.commit()
    return None
