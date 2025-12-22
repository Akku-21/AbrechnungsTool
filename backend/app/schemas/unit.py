from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UnitBase(BaseModel):
    designation: str
    area_sqm: Decimal
    floor: Optional[int] = None
    rooms: Optional[Decimal] = None
    has_balcony: bool = False
    has_garden: bool = False


class UnitCreate(UnitBase):
    property_id: UUID


class UnitUpdate(BaseModel):
    designation: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    floor: Optional[int] = None
    rooms: Optional[Decimal] = None
    has_balcony: Optional[bool] = None
    has_garden: Optional[bool] = None


class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    created_at: datetime
    updated_at: datetime
