from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.property import Property
from app.models.unit import Unit
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse, PropertyListResponse

router = APIRouter()


@router.get("", response_model=PropertyListResponse)
def list_properties(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Liegenschaften"""
    total = db.query(func.count(Property.id)).scalar()
    properties = db.query(Property).offset(skip).limit(limit).all()

    items = []
    for prop in properties:
        prop_dict = PropertyResponse.model_validate(prop).model_dump()
        prop_dict["unit_count"] = len(prop.units)
        items.append(PropertyResponse(**prop_dict))

    return PropertyListResponse(items=items, total=total)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    property_in: PropertyCreate,
    db: Session = Depends(get_db)
):
    """Neue Liegenschaft anlegen"""
    property_obj = Property(**property_in.model_dump())
    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)
    return property_obj


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: UUID,
    db: Session = Depends(get_db)
):
    """Liegenschaft abrufen"""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liegenschaft nicht gefunden"
        )
    response = PropertyResponse.model_validate(property_obj)
    response.unit_count = len(property_obj.units)
    return response


@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: UUID,
    property_in: PropertyUpdate,
    db: Session = Depends(get_db)
):
    """Liegenschaft aktualisieren"""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liegenschaft nicht gefunden"
        )

    update_data = property_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property_obj, field, value)

    db.commit()
    db.refresh(property_obj)
    return property_obj


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: UUID,
    db: Session = Depends(get_db)
):
    """Liegenschaft löschen"""
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liegenschaft nicht gefunden"
        )

    db.delete(property_obj)
    db.commit()
    return None
