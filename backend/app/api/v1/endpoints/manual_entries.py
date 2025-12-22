from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.manual_entry import ManualEntry
from app.models.settlement import Settlement
from app.models.unit import Unit
from app.models.enums import SettlementStatus
from app.schemas.manual_entry import ManualEntryCreate, ManualEntryUpdate, ManualEntryResponse

router = APIRouter()


@router.get("", response_model=List[ManualEntryResponse])
def list_manual_entries(
    settlement_id: UUID = None,
    unit_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller manuellen Buchungen"""
    query = db.query(ManualEntry)
    if settlement_id:
        query = query.filter(ManualEntry.settlement_id == settlement_id)
    if unit_id:
        query = query.filter(ManualEntry.unit_id == unit_id)
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=ManualEntryResponse, status_code=status.HTTP_201_CREATED)
def create_manual_entry(
    entry_in: ManualEntryCreate,
    db: Session = Depends(get_db)
):
    """Neue manuelle Buchung anlegen"""
    # Prüfen ob Abrechnung existiert und bearbeitbar ist
    settlement_obj = db.query(Settlement).filter(Settlement.id == entry_in.settlement_id).first()
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

    # Optional: Wohneinheit prüfen
    if entry_in.unit_id:
        unit_obj = db.query(Unit).filter(Unit.id == entry_in.unit_id).first()
        if not unit_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wohneinheit nicht gefunden"
            )

    entry_obj = ManualEntry(**entry_in.model_dump())
    db.add(entry_obj)
    db.commit()
    db.refresh(entry_obj)
    return entry_obj


@router.get("/{entry_id}", response_model=ManualEntryResponse)
def get_manual_entry(
    entry_id: UUID,
    db: Session = Depends(get_db)
):
    """Manuelle Buchung abrufen"""
    entry_obj = db.query(ManualEntry).filter(ManualEntry.id == entry_id).first()
    if not entry_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buchung nicht gefunden"
        )
    return entry_obj


@router.put("/{entry_id}", response_model=ManualEntryResponse)
def update_manual_entry(
    entry_id: UUID,
    entry_in: ManualEntryUpdate,
    db: Session = Depends(get_db)
):
    """Manuelle Buchung aktualisieren"""
    entry_obj = db.query(ManualEntry).filter(ManualEntry.id == entry_id).first()
    if not entry_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buchung nicht gefunden"
        )

    if entry_obj.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    update_data = entry_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry_obj, field, value)

    db.commit()
    db.refresh(entry_obj)
    return entry_obj


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manual_entry(
    entry_id: UUID,
    db: Session = Depends(get_db)
):
    """Manuelle Buchung löschen"""
    entry_obj = db.query(ManualEntry).filter(ManualEntry.id == entry_id).first()
    if not entry_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buchung nicht gefunden"
        )

    if entry_obj.settlement.status == SettlementStatus.FINALIZED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalisierte Abrechnungen können nicht mehr bearbeitet werden"
        )

    db.delete(entry_obj)
    db.commit()
    return None
