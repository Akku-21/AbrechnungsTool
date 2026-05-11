from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.unit_allocation import UnitAllocation
from app.models.unit import Unit
from app.schemas.unit_allocation import (
    UnitAllocationCreate,
    UnitAllocationUpdate,
    UnitAllocationResponse,
)

router = APIRouter()


@router.get("", response_model=List[UnitAllocationResponse])
def list_unit_allocations(
    unit_id: UUID,
    db: Session = Depends(get_db),
):
    """Alle Verteilerschluessel einer Wohneinheit abrufen"""
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden",
        )

    allocations = (
        db.query(UnitAllocation)
        .filter(UnitAllocation.unit_id == unit_id)
        .order_by(UnitAllocation.cost_category)
        .all()
    )
    return allocations


@router.post(
    "", response_model=UnitAllocationResponse, status_code=status.HTTP_201_CREATED
)
def create_unit_allocation(
    allocation_in: UnitAllocationCreate,
    db: Session = Depends(get_db),
):
    """Verteilerschluessel fuer eine Wohneinheit und Kostenart erstellen"""
    unit = db.query(Unit).filter(Unit.id == allocation_in.unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden",
        )

    existing = (
        db.query(UnitAllocation)
        .filter(
            UnitAllocation.unit_id == allocation_in.unit_id,
            UnitAllocation.cost_category == allocation_in.cost_category,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Verteilerschluessel fuer {allocation_in.cost_category.value} existiert bereits. "
            "Bitte aktualisieren statt neu anlegen.",
        )

    allocation = UnitAllocation(**allocation_in.model_dump())
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return allocation


@router.put("/{allocation_id}", response_model=UnitAllocationResponse)
def update_unit_allocation(
    allocation_id: UUID,
    allocation_in: UnitAllocationUpdate,
    db: Session = Depends(get_db),
):
    """Verteilerschluessel aktualisieren"""
    allocation = (
        db.query(UnitAllocation).filter(UnitAllocation.id == allocation_id).first()
    )
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verteilerschluessel nicht gefunden",
        )

    update_data = allocation_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(allocation, field, value)

    db.commit()
    db.refresh(allocation)
    return allocation


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit_allocation(
    allocation_id: UUID,
    db: Session = Depends(get_db),
):
    """Verteilerschluessel loeschen (faellt auf Standard Wohnflaeche zurueck)"""
    allocation = (
        db.query(UnitAllocation).filter(UnitAllocation.id == allocation_id).first()
    )
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verteilerschluessel nicht gefunden",
        )

    db.delete(allocation)
    db.commit()
    return None


@router.put("/unit/{unit_id}/bulk", response_model=List[UnitAllocationResponse])
def bulk_upsert_unit_allocations(
    unit_id: UUID,
    allocations_in: List[UnitAllocationCreate],
    db: Session = Depends(get_db),
):
    """
    Alle Verteilerschluessel einer Wohneinheit auf einmal setzen.
    Erstellt neue und aktualisiert bestehende Eintraege.
    Nicht enthaltene Kategorien werden geloescht (Rueckfall auf Wohnflaeche).
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden",
        )

    for alloc in allocations_in:
        if alloc.unit_id != unit_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="unit_id in Eintrag stimmt nicht mit URL ueberein",
            )

    existing = db.query(UnitAllocation).filter(UnitAllocation.unit_id == unit_id).all()
    existing_by_category = {a.cost_category: a for a in existing}

    incoming_categories = {a.cost_category for a in allocations_in}

    for category, alloc in existing_by_category.items():
        if category not in incoming_categories:
            db.delete(alloc)

    results = []
    for alloc_data in allocations_in:
        if alloc_data.cost_category in existing_by_category:
            existing_alloc = existing_by_category[alloc_data.cost_category]
            existing_alloc.allocation_method = alloc_data.allocation_method
            existing_alloc.allocation_percentage = alloc_data.allocation_percentage
            existing_alloc.custom_value = alloc_data.custom_value
            results.append(existing_alloc)
        else:
            new_alloc = UnitAllocation(**alloc_data.model_dump())
            db.add(new_alloc)
            results.append(new_alloc)

    db.commit()
    for r in results:
        db.refresh(r)

    return results
