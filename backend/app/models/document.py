import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, BigInteger, Boolean, DateTime, Date, Numeric, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DocumentStatus, CostCategory

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
    ocr_corrected_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    ocr_engine: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    llm_extraction_used: Mapped[bool] = mapped_column(Boolean, default=False)
    llm_extraction_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    include_in_export: Mapped[bool] = mapped_column(Boolean, default=False)

    # Extrahierte Rechnungsdaten (von LLM oder Regex)
    extracted_vendor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extracted_invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extracted_invoice_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extracted_total_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    extracted_cost_category: Mapped[Optional[CostCategory]] = mapped_column(
        Enum(CostCategory), nullable=True
    )

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

    @property
    def ocr_text(self) -> Optional[str]:
        """Gibt den besten verfuegbaren OCR-Text zurueck (korrigiert oder roh)"""
        return self.ocr_corrected_text or self.ocr_raw_text
