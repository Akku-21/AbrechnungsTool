from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import SettlementStatus, CostCategory, AllocationMethod, DocumentStatus


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


# ============ Unit Settlement (Einzelabrechnung) Schemas ============

class UnitBrief(BaseModel):
    """Minimal-Info zur Wohneinheit"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    designation: str
    area_sqm: Decimal


class TenantBrief(BaseModel):
    """Minimal-Info zum Mieter"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    salutation: Optional[str] = None
    first_name: str
    last_name: str
    full_name: str


class DocumentBrief(BaseModel):
    """Minimal-Info zum Dokument"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    mime_type: str
    document_status: DocumentStatus
    upload_date: datetime
    include_in_export: bool
    file_size_mb: Optional[Decimal] = None


class CostBreakdownResponse(BaseModel):
    """Kostenaufschlüsselung pro Kategorie"""
    model_config = ConfigDict(from_attributes=True)

    cost_category: CostCategory
    total_property_cost: Decimal
    allocation_percentage: Decimal
    allocated_amount: Decimal
    allocation_method: AllocationMethod


class UnitSettlementResponse(BaseModel):
    """Einzelabrechnung pro Wohneinheit/Mieter"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    settlement_id: UUID
    unit_id: UUID
    tenant_id: UUID

    # Berechnete Werte
    total_costs: Decimal
    total_prepayments: Decimal
    balance: Decimal  # Positiv = Nachzahlung, Negativ = Guthaben
    occupancy_days: int

    # Zusätzliche Felder
    notes: Optional[str] = None

    # Verschachtelte Objekte
    unit: UnitBrief
    tenant: TenantBrief
    cost_breakdowns: List[CostBreakdownResponse] = []
    documents: List[DocumentBrief] = []  # Unit-spezifische Dokumente

    created_at: datetime


class UnitSettlementUpdate(BaseModel):
    """Update für Einzelabrechnung (nur Notes)"""
    notes: Optional[str] = None


class UnitSettlementListResponse(BaseModel):
    """Liste von Einzelabrechnungen"""
    unit_settlements: List[UnitSettlementResponse]
    total_costs: Decimal  # Summe aller Kosten
    total_balance: Decimal  # Summe aller Salden
