from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PropertyBase(BaseModel):
    name: str
    street: str
    house_number: str
    postal_code: str
    city: str
    total_area_sqm: Decimal


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    total_area_sqm: Optional[Decimal] = None


class PropertyResponse(PropertyBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
    full_address: str
    unit_count: Optional[int] = None


class PropertyListResponse(BaseModel):
    items: List[PropertyResponse]
    total: int
