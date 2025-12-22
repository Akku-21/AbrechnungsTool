import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, TYPE_CHECKING

from sqlalchemy import String, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.unit import Unit
    from app.models.settlement import Settlement


class Property(Base):
    """Liegenschaft / Immobilie"""
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    street: Mapped[str] = mapped_column(String(255), nullable=False)
    house_number: Mapped[str] = mapped_column(String(20), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(10), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    total_area_sqm: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    units: Mapped[List["Unit"]] = relationship("Unit", back_populates="property_ref", cascade="all, delete-orphan")
    settlements: Mapped[List["Settlement"]] = relationship("Settlement", back_populates="property_ref", cascade="all, delete-orphan")

    @property
    def full_address(self) -> str:
        return f"{self.street} {self.house_number}, {self.postal_code} {self.city}"
