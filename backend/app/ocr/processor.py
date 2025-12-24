"""
Haupt-OCR-Prozessor fuer Rechnungsdokumente.
Orchestriert docTR (primary), Tesseract (fallback), und optionale LLM-Extraktion.
"""
import logging
from typing import Optional
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.ocr.extractor import InvoiceDataExtractor, ExtractedInvoiceData

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Ergebnis der OCR-Verarbeitung"""
    raw_text: str
    confidence: float
    extracted_data: ExtractedInvoiceData
    corrected_text: Optional[str] = None
    llm_extraction_used: bool = False
    llm_extraction_error: Optional[str] = None
    engine_used: str = "unknown"


class OCRProcessor:
    """
    Haupt-OCR-Prozessor mit docTR, Tesseract-Fallback und optionaler LLM-Extraktion.

    Strategie:
    1. Versuche docTR (moderne Deep-Learning OCR)
    2. Falls docTR fehlschlaegt: Fallback auf Tesseract
    3. Falls LLM konfiguriert: Datenextraktion via LLM (direkt strukturierte Daten)
    4. Fallback: Regex-basierte Extraktion
    """

    def __init__(self, db: Optional[Session] = None):
        """
        Initialisiere den Prozessor.

        Args:
            db: Optionale DB-Session fuer LLM-Einstellungen.
                Ohne Session wird keine LLM-Extraktion durchgefuehrt.
        """
        self.db = db
        self.extractor = InvoiceDataExtractor()
        self._doctr_processor = None
        self._tesseract_processor = None
        self._doctr_available = None

    @property
    def doctr_processor(self):
        """Lazy load docTR processor"""
        if self._doctr_processor is None:
            try:
                from app.ocr.doctr_processor import DocTRProcessor
                self._doctr_processor = DocTRProcessor()
            except ImportError as e:
                logger.warning(f"docTR nicht verfuegbar: {e}")
                self._doctr_processor = False  # False = nicht verfuegbar
        return self._doctr_processor if self._doctr_processor else None

    @property
    def tesseract_processor(self):
        """Lazy load Tesseract processor"""
        if self._tesseract_processor is None:
            from app.ocr.tesseract_processor import TesseractProcessor
            self._tesseract_processor = TesseractProcessor()
        return self._tesseract_processor

    def _is_doctr_available(self) -> bool:
        """Pruefe ob docTR verfuegbar ist"""
        if self._doctr_available is None:
            try:
                import doctr  # noqa
                self._doctr_available = True
            except ImportError:
                self._doctr_available = False
        return self._doctr_available

    def process_file(self, file_path: str) -> OCRResult:
        """
        Verarbeite eine Datei und extrahiere Rechnungsdaten.

        Args:
            file_path: Pfad zur Datei (PDF oder Bild)

        Returns:
            OCRResult mit Text, Konfidenz und extrahierten Daten
        """
        # Versuche docTR, dann Tesseract
        raw_text, confidence, engine = self._run_ocr_file(file_path)

        # Versuche LLM-Extraktion, dann Regex-Fallback
        extracted_data, llm_used, llm_error = self._extract_data(raw_text)

        return OCRResult(
            raw_text=raw_text,
            confidence=confidence,
            extracted_data=extracted_data,
            llm_extraction_used=llm_used,
            llm_extraction_error=llm_error,
            engine_used=engine
        )

    def process_bytes(self, content: bytes, filename: str) -> OCRResult:
        """
        Verarbeite Bytes und extrahiere Rechnungsdaten.

        Args:
            content: Dateiinhalt als Bytes
            filename: Dateiname (fuer Formatbestimmung)

        Returns:
            OCRResult mit Text, Konfidenz und extrahierten Daten
        """
        # Versuche docTR, dann Tesseract
        raw_text, confidence, engine = self._run_ocr_bytes(content, filename)

        # Versuche LLM-Extraktion, dann Regex-Fallback
        extracted_data, llm_used, llm_error = self._extract_data(raw_text)

        return OCRResult(
            raw_text=raw_text,
            confidence=confidence,
            extracted_data=extracted_data,
            llm_extraction_used=llm_used,
            llm_extraction_error=llm_error,
            engine_used=engine
        )

    def _run_ocr_file(self, file_path: str) -> tuple:
        """
        Fuehre OCR auf Datei aus (docTR oder Tesseract).

        Returns:
            tuple: (raw_text, confidence, engine_name)
        """
        # Versuche docTR
        if self._is_doctr_available():
            try:
                processor = self.doctr_processor
                if processor:
                    result = processor.process_file(file_path)
                    logger.info(f"docTR OCR erfolgreich, Konfidenz: {result.confidence}%")
                    return result.raw_text, result.confidence, "doctr"
            except Exception as e:
                logger.warning(f"docTR fehlgeschlagen, verwende Tesseract: {e}")

        # Fallback: Tesseract
        result = self.tesseract_processor.process_file(file_path)
        logger.info(f"Tesseract OCR erfolgreich, Konfidenz: {result.confidence}%")
        return result.raw_text, result.confidence, "tesseract"

    def _run_ocr_bytes(self, content: bytes, filename: str) -> tuple:
        """
        Fuehre OCR auf Bytes aus (docTR oder Tesseract).

        Returns:
            tuple: (raw_text, confidence, engine_name)
        """
        # Versuche docTR
        if self._is_doctr_available():
            try:
                processor = self.doctr_processor
                if processor:
                    result = processor.process_bytes(content, filename)
                    logger.info(f"docTR OCR erfolgreich, Konfidenz: {result.confidence}%")
                    return result.raw_text, result.confidence, "doctr"
            except Exception as e:
                logger.warning(f"docTR fehlgeschlagen, verwende Tesseract: {e}")

        # Fallback: Tesseract
        result = self.tesseract_processor.process_bytes(content, filename)
        logger.info(f"Tesseract OCR erfolgreich, Konfidenz: {result.confidence}%")
        return result.raw_text, result.confidence, "tesseract"

    def _extract_data(self, text: str) -> tuple:
        """
        Extrahiere Rechnungsdaten - LLM wenn konfiguriert, sonst Regex.

        Returns:
            tuple: (ExtractedInvoiceData, llm_used: bool, error_message: Optional[str])
        """
        if not text:
            return ExtractedInvoiceData(), False, None

        # Versuche LLM-Extraktion wenn konfiguriert
        if self.db:
            try:
                from app.services.llm_service import get_llm_settings

                settings = get_llm_settings(self.db)

                if settings.is_configured:
                    from app.ocr.llm_corrector import LLMExtractor

                    extractor = LLMExtractor(settings.api_key, settings.model)
                    result = extractor.extract_data_sync(text)

                    if result.success:
                        logger.info(f"LLM-Extraktion erfolgreich mit {result.model_used}")
                        # Konvertiere ExtractionResult zu ExtractedInvoiceData
                        return ExtractedInvoiceData(
                            vendor_name=result.vendor_name,
                            invoice_number=result.invoice_number,
                            invoice_date=result.invoice_date,
                            total_amount=result.total_amount,
                            suggested_category=result.cost_category
                        ), True, None
                    else:
                        error_msg = f"LLM-Extraktion fehlgeschlagen: {result.error_message}"
                        logger.warning(f"{error_msg}, verwende Regex-Fallback")
                        # Regex-Fallback mit Fehlermeldung
                        return self.extractor.extract(text), False, error_msg

            except Exception as e:
                error_msg = f"Fehler bei LLM-Extraktion: {e}"
                logger.error(f"{error_msg}, verwende Regex-Fallback")
                return self.extractor.extract(text), False, error_msg

        # Fallback: Regex-basierte Extraktion (kein LLM konfiguriert)
        logger.debug("Verwende Regex-Extraktion")
        return self.extractor.extract(text), False, None
