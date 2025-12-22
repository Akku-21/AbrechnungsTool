from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import CostCategory, AllocationMethod


class UnitAllocationBase(BaseModel):
    cost_category: CostCategory
    allocation_method: AllocationMethod
    allocation_percentage: Decimal
    custom_value: Optional[Decimal] = None


class UnitAllocationCreate(UnitAllocationBase):
    unit_id: UUID


class UnitAllocationUpdate(BaseModel):
    allocation_method: Optional[AllocationMethod] = None
    allocation_percentage: Optional[Decimal] = None
    custom_value: Optional[Decimal] = None


class UnitAllocationResponse(UnitAllocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    unit_id: UUID
    percentage_display: str
    created_at: datetime
    updated_at: datetime
