import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Numeric, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.property import Property
    from app.models.tenant import Tenant
    from app.models.unit_allocation import UnitAllocation


class Unit(Base):
    """Wohneinheit"""
    __tablename__ = "units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    designation: Mapped[str] = mapped_column(String(50), nullable=False)  # z.B. "Wohnung 1", "EG links"
    area_sqm: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    floor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rooms: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1), nullable=True)
    has_balcony: Mapped[bool] = mapped_column(Boolean, default=False)
    has_garden: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    property_ref: Mapped["Property"] = relationship("Property", back_populates="units")
    tenants: Mapped[List["Tenant"]] = relationship("Tenant", back_populates="unit", cascade="all, delete-orphan")
    allocations: Mapped[List["UnitAllocation"]] = relationship("UnitAllocation", back_populates="unit", cascade="all, delete-orphan")

    @property
    def current_tenant(self) -> Optional["Tenant"]:
        """Aktueller Mieter (ohne Auszugsdatum)"""
        for tenant in self.tenants:
            if tenant.is_active and tenant.move_out_date is None:
                return tenant
        return None
