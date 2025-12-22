import uuid
from datetime import datetime, date
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, Date, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SettlementStatus

if TYPE_CHECKING:
    from app.models.property import Property
    from app.models.document import Document
    from app.models.invoice import Invoice
    from app.models.manual_entry import ManualEntry
    from app.models.settlement_result import SettlementResult


class Settlement(Base):
    """Nebenkostenabrechnung"""
    __tablename__ = "settlements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[SettlementStatus] = mapped_column(
        Enum(SettlementStatus), default=SettlementStatus.DRAFT
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    property_ref: Mapped["Property"] = relationship("Property", back_populates="settlements")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="settlement", cascade="all, delete-orphan")
    invoices: Mapped[List["Invoice"]] = relationship("Invoice", back_populates="settlement", cascade="all, delete-orphan")
    manual_entries: Mapped[List["ManualEntry"]] = relationship("ManualEntry", back_populates="settlement", cascade="all, delete-orphan")
    results: Mapped[List["SettlementResult"]] = relationship("SettlementResult", back_populates="settlement", cascade="all, delete-orphan")

    @property
    def period_label(self) -> str:
        return f"{self.period_start.strftime('%d.%m.%Y')} - {self.period_end.strftime('%d.%m.%Y')}"

    @property
    def year(self) -> int:
        return self.period_start.year
