from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import SettlementStatus


class SettlementBase(BaseModel):
    period_start: date
    period_end: date
    notes: Optional[str] = None


class SettlementCreate(SettlementBase):
    property_id: UUID


class SettlementUpdate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[SettlementStatus] = None


class SettlementResponse(SettlementBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    property_id: UUID
    status: SettlementStatus
    period_label: str
    year: int
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime] = None
