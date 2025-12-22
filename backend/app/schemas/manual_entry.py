from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import CostCategory


class ManualEntryBase(BaseModel):
    entry_type: str  # CREDIT, DEBIT, ADJUSTMENT
    description: str
    amount: Decimal
    cost_category: Optional[CostCategory] = None
    notes: Optional[str] = None


class ManualEntryCreate(ManualEntryBase):
    settlement_id: UUID
    unit_id: Optional[UUID] = None


class ManualEntryUpdate(BaseModel):
    entry_type: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    cost_category: Optional[CostCategory] = None
    notes: Optional[str] = None
    unit_id: Optional[UUID] = None


class ManualEntryResponse(ManualEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    settlement_id: UUID
    unit_id: Optional[UUID] = None
    is_credit: bool
    is_debit: bool
    created_at: datetime
    updated_at: datetime
