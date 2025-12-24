from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentStatus


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    settlement_id: UUID
    original_filename: str
    stored_filename: str
    file_size_bytes: int
    file_size_mb: float
    mime_type: str
    document_status: DocumentStatus
    ocr_raw_text: Optional[str] = None
    ocr_corrected_text: Optional[str] = None
    ocr_confidence: Optional[Decimal] = None
    ocr_engine: Optional[str] = None
    llm_extraction_used: bool = False
    llm_extraction_error: Optional[str] = None
    include_in_export: bool = False
    upload_date: datetime
    processed_at: Optional[datetime] = None


class DocumentUpdate(BaseModel):
    include_in_export: Optional[bool] = None


class DocumentUploadResponse(BaseModel):
    id: UUID
    status: DocumentStatus
    message: str


class OCRResultResponse(BaseModel):
    document_id: UUID
    status: DocumentStatus
    raw_text: Optional[str] = None
    corrected_text: Optional[str] = None
    confidence: Optional[Decimal] = None
    engine: Optional[str] = None
    llm_extraction_used: bool = False
    llm_extraction_error: Optional[str] = None
    extracted_data: Optional[dict] = None
