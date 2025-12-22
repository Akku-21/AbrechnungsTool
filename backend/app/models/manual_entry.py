import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, DateTime, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CostCategory

if TYPE_CHECKING:
    from app.models.settlement import Settlement
    from app.models.unit import Unit


class ManualEntry(Base):
    """Manuelle Buchung (Guthaben, Sonderausgaben etc.)"""
    __tablename__ = "manual_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("settlements.id", ondelete="CASCADE"), nullable=False
    )
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )  # NULL = gilt für alle Einheiten

    entry_type: Mapped[str] = mapped_column(String(50), nullable=False)  # CREDIT, DEBIT, ADJUSTMENT
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)  # Positiv = Gutschrift, Negativ = Belastung
    cost_category: Mapped[Optional[CostCategory]] = mapped_column(
        Enum(CostCategory), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    settlement: Mapped["Settlement"] = relationship("Settlement", back_populates="manual_entries")
    unit: Mapped[Optional["Unit"]] = relationship("Unit")

    @property
    def is_credit(self) -> bool:
        return self.amount > 0

    @property
    def is_debit(self) -> bool:
        return self.amount < 0
