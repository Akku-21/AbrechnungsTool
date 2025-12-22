import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, TYPE_CHECKING

from sqlalchemy import Integer, DateTime, Numeric, ForeignKey, Enum, JSON, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CostCategory, AllocationMethod

if TYPE_CHECKING:
    from app.models.settlement import Settlement
    from app.models.unit import Unit
    from app.models.tenant import Tenant


class SettlementResult(Base):
    """Abrechnungsergebnis pro Wohneinheit"""
    __tablename__ = "settlement_results"
    __table_args__ = (
        UniqueConstraint("settlement_id", "unit_id", "tenant_id", name="uq_settlement_unit_tenant"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("settlements.id", ondelete="CASCADE"), nullable=False
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )

    total_costs: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_prepayments: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)  # Positiv = Nachzahlung, Negativ = Guthaben
    occupancy_days: Mapped[int] = mapped_column(Integer, nullable=False)

    calculation_details: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    settlement: Mapped["Settlement"] = relationship("Settlement", back_populates="results")
    unit: Mapped["Unit"] = relationship("Unit")
    tenant: Mapped["Tenant"] = relationship("Tenant")
    cost_breakdowns: Mapped[List["SettlementCostBreakdown"]] = relationship(
        "SettlementCostBreakdown", back_populates="settlement_result", cascade="all, delete-orphan"
    )

    @property
    def has_nachzahlung(self) -> bool:
        return self.balance > 0

    @property
    def has_guthaben(self) -> bool:
        return self.balance < 0


class SettlementCostBreakdown(Base):
    """Kostenaufschlüsselung pro Kategorie"""
    __tablename__ = "settlement_cost_breakdowns"
    __table_args__ = (
        UniqueConstraint("settlement_result_id", "cost_category", name="uq_result_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settlement_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("settlement_results.id", ondelete="CASCADE"), nullable=False
    )

    cost_category: Mapped[CostCategory] = mapped_column(
        Enum(CostCategory), nullable=False
    )
    total_property_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allocation_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allocation_method: Mapped[AllocationMethod] = mapped_column(
        Enum(AllocationMethod), nullable=False
    )

    # Relationships
    settlement_result: Mapped["SettlementResult"] = relationship("SettlementResult", back_populates="cost_breakdowns")
