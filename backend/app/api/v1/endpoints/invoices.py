from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.invoice import Invoice, LineItem
from app.models.settlement import Settlement
from app.models.unit import Unit
from app.models.enums import SettlementStatus
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, LineItemCreate, LineItemResponse

router = APIRouter()


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
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Rechnungen"""
    query = db.query(Invoice)
    if settlement_id:
        query = query.filter(Invoice.settlement_id == settlement_id)
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db)
):
    """Neue Rechnung anlegen"""
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
    invoice_obj = Invoice(**invoice_data)
    db.add(invoice_obj)
    db.flush()

    # Positionen erstellen
    for item_data in invoice_in.line_items:
        line_item = LineItem(invoice_id=invoice_obj.id, **item_data.model_dump())
        db.add(line_item)

    db.commit()
    db.refresh(invoice_obj)
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

    db.delete(invoice_obj)
    db.commit()
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
