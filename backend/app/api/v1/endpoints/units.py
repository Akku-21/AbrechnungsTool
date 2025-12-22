from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.unit import Unit
from app.models.property import Property
from app.schemas.unit import UnitCreate, UnitUpdate, UnitResponse

router = APIRouter()


@router.get("", response_model=List[UnitResponse])
def list_units(
    property_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Wohneinheiten (optional gefiltert nach Liegenschaft)"""
    query = db.query(Unit)
    if property_id:
        query = query.filter(Unit.property_id == property_id)
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    unit_in: UnitCreate,
    db: Session = Depends(get_db)
):
    """Neue Wohneinheit anlegen"""
    # Prüfen ob Liegenschaft existiert
    property_obj = db.query(Property).filter(Property.id == unit_in.property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liegenschaft nicht gefunden"
        )

    unit_obj = Unit(**unit_in.model_dump())
    db.add(unit_obj)
    db.commit()
    db.refresh(unit_obj)
    return unit_obj


@router.get("/{unit_id}", response_model=UnitResponse)
def get_unit(
    unit_id: UUID,
    db: Session = Depends(get_db)
):
    """Wohneinheit abrufen"""
    unit_obj = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden"
        )
    return unit_obj


@router.put("/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: UUID,
    unit_in: UnitUpdate,
    db: Session = Depends(get_db)
):
    """Wohneinheit aktualisieren"""
    unit_obj = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden"
        )

    update_data = unit_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(unit_obj, field, value)

    db.commit()
    db.refresh(unit_obj)
    return unit_obj


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: UUID,
    db: Session = Depends(get_db)
):
    """Wohneinheit löschen"""
    unit_obj = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden"
        )

    db.delete(unit_obj)
    db.commit()
    return None
