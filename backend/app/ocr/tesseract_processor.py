"""
Tesseract OCR-Prozessor (Fallback)
Wird verwendet wenn docTR nicht verfuegbar ist.
"""
import io
from pathlib import Path
from dataclasses import dataclass

import cv2
import numpy as np
import pytesseract
from PIL import Image
import pdf2image

from app.config import settings
from app.ocr.extractor import InvoiceDataExtractor, ExtractedInvoiceData


@dataclass
class OCRResult:
    """Ergebnis der OCR-Verarbeitung"""
    raw_text: str
    confidence: float
    extracted_data: ExtractedInvoiceData


class TesseractProcessor:
    """Tesseract-basierter OCR-Prozessor (Fallback)"""

    def __init__(self):
        self.extractor = InvoiceDataExtractor()
        self.tesseract_config = r'--oem 3 --psm 6 -l deu'
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    def process_file(self, file_path: str) -> OCRResult:
        """Verarbeite eine Datei und extrahiere Rechnungsdaten"""
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")

        images = self._convert_to_images(path)
        return self._process_images(images)

    def process_bytes(self, content: bytes, filename: str) -> OCRResult:
        """Verarbeite Bytes und extrahiere Rechnungsdaten"""
        if filename.lower().endswith('.pdf'):
            images = pdf2image.convert_from_bytes(content, dpi=300)
        else:
            images = [Image.open(io.BytesIO(content))]

        return self._process_images(images)

    def _process_images(self, images: list) -> OCRResult:
        """Verarbeite eine Liste von Bildern"""
        all_text = []
        total_confidence = 0

        for img in images:
            processed_img = self._preprocess_image(img)

            data = pytesseract.image_to_data(
                processed_img,
                config=self.tesseract_config,
                output_type=pytesseract.Output.DICT
            )

            text = pytesseract.image_to_string(
                processed_img,
                config=self.tesseract_config
            )
            all_text.append(text)

            confidences = [int(c) for c in data['conf'] if int(c) > 0]
            if confidences:
                total_confidence += sum(confidences) / len(confidences)

        full_text = "\n".join(all_text)
        avg_confidence = total_confidence / len(images) if images else 0

        extracted_data = self.extractor.extract(full_text)

        return OCRResult(
            raw_text=full_text,
            confidence=round(avg_confidence, 2),
            extracted_data=extracted_data
        )

    def _convert_to_images(self, path: Path) -> list:
        """Konvertiere Dokument zu Bildern"""
        suffix = path.suffix.lower()

        if suffix == '.pdf':
            return pdf2image.convert_from_path(str(path), dpi=300)
        elif suffix in ['.png', '.jpg', '.jpeg']:
            return [Image.open(path)]
        else:
            raise ValueError(f"Nicht unterstuetztes Dateiformat: {suffix}")

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Einfache Bildvorverarbeitung - nur Graustufen"""
        img_array = np.array(image)

        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        return Image.fromarray(gray)
