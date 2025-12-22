import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, Boolean, Date, DateTime, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CostCategory

if TYPE_CHECKING:
    from app.models.settlement import Settlement
    from app.models.document import Document


class Invoice(Base):
    """Rechnung"""
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("settlements.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cost_category: Mapped[CostCategory] = mapped_column(
        Enum(CostCategory), nullable=False
    )
    allocation_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )  # Optional: Überschreibt den Standard-Verteilerschlüssel (0.0 - 1.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    settlement: Mapped["Settlement"] = relationship("Settlement", back_populates="invoices")
    document: Mapped[Optional["Document"]] = relationship("Document", back_populates="invoice")
    line_items: Mapped[List["LineItem"]] = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")


class LineItem(Base):
    """Rechnungsposition"""
    __tablename__ = "line_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )

    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=1)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4), nullable=True)
    vat_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=19.00)
    cost_category: Mapped[Optional[CostCategory]] = mapped_column(
        Enum(CostCategory), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="line_items")
