from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TenantAddressBase(BaseModel):
    street: str
    house_number: Optional[str] = None
    postal_code: str
    city: str
    country: str = "Deutschland"


class TenantAddressCreate(TenantAddressBase):
    valid_from: date


class TenantAddressResponse(TenantAddressBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_current: bool
    valid_from: date
    full_address: str


class TenantBase(BaseModel):
    salutation: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    move_in_date: date
    move_out_date: Optional[date] = None
    resident_count: int = 1
    monthly_prepayment: Optional[Decimal] = None


class TenantCreate(TenantBase):
    unit_id: UUID
    address: Optional[TenantAddressCreate] = None


class TenantUpdate(BaseModel):
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    resident_count: Optional[int] = None
    monthly_prepayment: Optional[Decimal] = None
    is_active: Optional[bool] = None


class TenantResponse(TenantBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    unit_id: UUID
    is_active: bool
    full_name: str
    created_at: datetime
    updated_at: datetime
    addresses: List[TenantAddressResponse] = []
