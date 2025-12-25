from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import CostCategory


class LineItemBase(BaseModel):
    description: str
    amount: Decimal
    quantity: Decimal = Decimal("1")
    unit_price: Optional[Decimal] = None
    vat_rate: Decimal = Decimal("19.00")
    cost_category: Optional[CostCategory] = None


class LineItemCreate(LineItemBase):
    pass


class LineItemResponse(LineItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    created_at: datetime


class InvoiceBase(BaseModel):
    vendor_name: str
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: Decimal
    cost_category: CostCategory
    allocation_percentage: Optional[Decimal] = None  # 0.0 - 1.0 (z.B. 0.5 = 50%)
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    settlement_id: UUID
    document_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None  # NULL = Settlement-weit, gesetzt = Unit-spezifisch
    line_items: List[LineItemCreate] = []


class InvoiceUpdate(BaseModel):
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    cost_category: Optional[CostCategory] = None
    allocation_percentage: Optional[Decimal] = None
    notes: Optional[str] = None
    is_verified: Optional[bool] = None


class InvoiceResponse(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    settlement_id: UUID
    document_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    line_items: List[LineItemResponse] = []
