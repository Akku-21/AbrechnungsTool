from typing import List
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.tenant import Tenant, TenantAddress
from app.models.unit import Unit
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantAddressCreate, TenantAddressResponse

router = APIRouter()


@router.get("", response_model=List[TenantResponse])
def list_tenants(
    unit_id: UUID = None,
    is_active: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste aller Mieter (optional gefiltert)"""
    query = db.query(Tenant)
    if unit_id:
        query = query.filter(Tenant.unit_id == unit_id)
    if is_active is not None:
        query = query.filter(Tenant.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    db: Session = Depends(get_db)
):
    """Neuen Mieter anlegen"""
    # Prüfen ob Wohneinheit existiert
    unit_obj = db.query(Unit).filter(Unit.id == tenant_in.unit_id).first()
    if not unit_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wohneinheit nicht gefunden"
        )

    # Mieter erstellen
    tenant_data = tenant_in.model_dump(exclude={"address"})
    tenant_obj = Tenant(**tenant_data)
    db.add(tenant_obj)
    db.flush()

    # Adresse erstellen falls angegeben
    if tenant_in.address:
        address_obj = TenantAddress(
            tenant_id=tenant_obj.id,
            **tenant_in.address.model_dump()
        )
        db.add(address_obj)

    db.commit()
    db.refresh(tenant_obj)
    return tenant_obj


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db)
):
    """Mieter abrufen"""
    tenant_obj = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mieter nicht gefunden"
        )
    return tenant_obj


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: UUID,
    tenant_in: TenantUpdate,
    db: Session = Depends(get_db)
):
    """Mieter aktualisieren"""
    tenant_obj = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mieter nicht gefunden"
        )

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant_obj, field, value)

    db.commit()
    db.refresh(tenant_obj)
    return tenant_obj


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db)
):
    """Mieter löschen"""
    tenant_obj = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mieter nicht gefunden"
        )

    db.delete(tenant_obj)
    db.commit()
    return None


@router.post("/{tenant_id}/move-out", response_model=TenantResponse)
def move_out_tenant(
    tenant_id: UUID,
    move_out_date: date,
    new_address: TenantAddressCreate = None,
    db: Session = Depends(get_db)
):
    """Mieterauszug dokumentieren"""
    tenant_obj = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mieter nicht gefunden"
        )

    tenant_obj.move_out_date = move_out_date
    tenant_obj.is_active = False

    # Neue Adresse hinzufügen falls angegeben
    if new_address:
        # Alte Adressen als nicht mehr aktuell markieren
        for addr in tenant_obj.addresses:
            addr.is_current = False

        address_obj = TenantAddress(
            tenant_id=tenant_obj.id,
            **new_address.model_dump()
        )
        db.add(address_obj)

    db.commit()
    db.refresh(tenant_obj)
    return tenant_obj


@router.post("/{tenant_id}/addresses", response_model=TenantAddressResponse, status_code=status.HTTP_201_CREATED)
def add_tenant_address(
    tenant_id: UUID,
    address_in: TenantAddressCreate,
    db: Session = Depends(get_db)
):
    """Neue Adresse für Mieter hinzufügen"""
    tenant_obj = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mieter nicht gefunden"
        )

    # Alte Adressen als nicht mehr aktuell markieren
    for addr in tenant_obj.addresses:
        addr.is_current = False

    address_obj = TenantAddress(
        tenant_id=tenant_obj.id,
        **address_in.model_dump()
    )
    db.add(address_obj)
    db.commit()
    db.refresh(address_obj)
    return address_obj
