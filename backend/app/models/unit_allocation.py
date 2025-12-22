import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Numeric, ForeignKey, Enum, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CostCategory, AllocationMethod

if TYPE_CHECKING:
    from app.models.unit import Unit


class UnitAllocation(Base):
    """Verteilerschlüssel pro Wohneinheit und Kostenart"""
    __tablename__ = "unit_allocations"
    __table_args__ = (
        UniqueConstraint("unit_id", "cost_category", name="uq_unit_cost_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )
    cost_category: Mapped[CostCategory] = mapped_column(
        Enum(CostCategory), nullable=False
    )
    allocation_method: Mapped[AllocationMethod] = mapped_column(
        Enum(AllocationMethod), nullable=False
    )
    allocation_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False  # 0.0000 bis 1.0000
    )
    custom_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True  # Für verbrauchsbasierte Abrechnung
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="allocations")

    @property
    def percentage_display(self) -> str:
        return f"{self.allocation_percentage * 100:.2f}%"
