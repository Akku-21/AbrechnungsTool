import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, BigInteger, Boolean, DateTime, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DocumentStatus

if TYPE_CHECKING:
    from app.models.settlement import Settlement
    from app.models.invoice import Invoice


class Document(Base):
    """Hochgeladenes Dokument / Beleg"""
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("settlements.id", ondelete="CASCADE"), nullable=False
    )

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    document_status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.PENDING
    )
    ocr_raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    include_in_export: Mapped[bool] = mapped_column(Boolean, default=False)

    upload_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    settlement: Mapped["Settlement"] = relationship("Settlement", back_populates="documents")
    invoice: Mapped[Optional["Invoice"]] = relationship("Invoice", back_populates="document", uselist=False)

    @property
    def file_size_mb(self) -> float:
        return round(self.file_size_bytes / (1024 * 1024), 2)
