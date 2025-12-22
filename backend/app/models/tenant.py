import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, Boolean, Date, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.unit import Unit


class Tenant(Base):
    """Mieter"""
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False
    )
    salutation: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Herr/Frau
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    move_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    move_out_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    resident_count: Mapped[int] = mapped_column(Integer, default=1)
    monthly_prepayment: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)  # Vorauszahlung

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="tenants")
    addresses: Mapped[List["TenantAddress"]] = relationship("TenantAddress", back_populates="tenant", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        if self.salutation:
            return f"{self.salutation} {self.first_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    @property
    def current_address(self) -> Optional["TenantAddress"]:
        for addr in self.addresses:
            if addr.is_current:
                return addr
        return None


class TenantAddress(Base):
    """Adresse des Mieters (für ausgezogene Mieter)"""
    __tablename__ = "tenant_addresses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    house_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    postal_code: Mapped[str] = mapped_column(String(10), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="Deutschland")

    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="addresses")

    @property
    def full_address(self) -> str:
        house = f" {self.house_number}" if self.house_number else ""
        return f"{self.street}{house}, {self.postal_code} {self.city}"
