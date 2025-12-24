"""
docTR OCR-Prozessor
Verwendet das docTR (Document Text Recognition) Framework fuer OCR.
"""
import io
import logging
from pathlib import Path
from dataclasses import dataclass

from PIL import Image

from app.ocr.extractor import InvoiceDataExtractor, ExtractedInvoiceData

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Ergebnis der OCR-Verarbeitung"""
    raw_text: str
    confidence: float
    extracted_data: ExtractedInvoiceData


class DocTRProcessor:
    """docTR-basierter OCR-Prozessor fuer deutsche Rechnungen"""

    def __init__(self):
        self.extractor = InvoiceDataExtractor()
        self._model = None

    @property
    def model(self):
        """Lazy load docTR model (cached after first load)"""
        if self._model is None:
            try:
                from doctr.models import ocr_predictor
                # db_resnet50 fuer Detection, crnn_vgg16_bn fuer Recognition
                self._model = ocr_predictor(
                    det_arch='db_resnet50',
                    reco_arch='crnn_vgg16_bn',
                    pretrained=True
                )
                logger.info("docTR Modell erfolgreich geladen")
            except ImportError as e:
                logger.error(f"docTR nicht installiert: {e}")
                raise
            except Exception as e:
                logger.error(f"Fehler beim Laden des docTR Modells: {e}")
                raise
        return self._model

    def process_file(self, file_path: str) -> OCRResult:
        """Verarbeite eine Datei und extrahiere Rechnungsdaten"""
        from doctr.io import DocumentFile

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")

        suffix = path.suffix.lower()

        if suffix == '.pdf':
            doc = DocumentFile.from_pdf(str(path))
        elif suffix in ['.png', '.jpg', '.jpeg']:
            doc = DocumentFile.from_images(str(path))
        else:
            raise ValueError(f"Nicht unterstuetztes Dateiformat: {suffix}")

        result = self.model(doc)
        full_text, avg_confidence = self._extract_text_and_confidence(result)
        extracted_data = self.extractor.extract(full_text)

        return OCRResult(
            raw_text=full_text,
            confidence=round(avg_confidence, 2),
            extracted_data=extracted_data
        )

    def process_bytes(self, content: bytes, filename: str) -> OCRResult:
        """Verarbeite Bytes und extrahiere Rechnungsdaten"""
        from doctr.io import DocumentFile

        if filename.lower().endswith('.pdf'):
            doc = DocumentFile.from_pdf(content)
        else:
            # Fuer Bilder: Als einzelnes Bild laden
            image = Image.open(io.BytesIO(content))
            # Temporaer speichern oder direkt konvertieren
            import numpy as np
            img_array = np.array(image)
            doc = DocumentFile.from_images([img_array])

        result = self.model(doc)
        full_text, avg_confidence = self._extract_text_and_confidence(result)
        extracted_data = self.extractor.extract(full_text)

        return OCRResult(
            raw_text=full_text,
            confidence=round(avg_confidence, 2),
            extracted_data=extracted_data
        )

    def _extract_text_and_confidence(self, result) -> tuple:
        """Extrahiere Text und Durchschnittskonfidenz aus docTR-Ergebnis"""
        all_text = []
        confidences = []

        for page in result.pages:
            page_lines = []
            for block in page.blocks:
                for line in block.lines:
                    line_text = " ".join(word.value for word in line.words)
                    page_lines.append(line_text)
                    # Sammle Wort-Konfidenzen
                    for word in line.words:
                        confidences.append(word.confidence)
            all_text.append("\n".join(page_lines))

        full_text = "\n\n".join(all_text)
        # docTR gibt Konfidenz als 0-1, konvertiere zu 0-100
        avg_confidence = (sum(confidences) / len(confidences) * 100) if confidences else 0

        return full_text, avg_confidence
