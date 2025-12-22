"""
OCR-Prozessor für Rechnungsdokumente
"""
import io
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

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


class OCRProcessor:
    """Haupt-OCR-Prozessor für deutsche Rechnungen"""

    def __init__(self):
        self.extractor = InvoiceDataExtractor()
        # Tesseract-Konfiguration für deutsche Dokumente
        self.tesseract_config = r'--oem 3 --psm 6 -l deu'
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    def process_file(self, file_path: str) -> OCRResult:
        """Verarbeite eine Datei und extrahiere Rechnungsdaten"""
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")

        # Datei in Bilder konvertieren
        images = self._convert_to_images(path)

        # OCR auf allen Seiten ausführen
        all_text = []
        total_confidence = 0

        for img in images:
            # Bild vorverarbeiten
            processed_img = self._preprocess_image(img)

            # OCR ausführen
            data = pytesseract.image_to_data(
                processed_img,
                config=self.tesseract_config,
                output_type=pytesseract.Output.DICT
            )

            # Text extrahieren
            text = pytesseract.image_to_string(
                processed_img,
                config=self.tesseract_config
            )
            all_text.append(text)

            # Konfidenz berechnen (Durchschnitt der Wortkonfidenzen)
            confidences = [int(c) for c in data['conf'] if int(c) > 0]
            if confidences:
                total_confidence += sum(confidences) / len(confidences)

        full_text = "\n".join(all_text)
        avg_confidence = total_confidence / len(images) if images else 0

        # Strukturierte Daten extrahieren
        extracted_data = self.extractor.extract(full_text)

        return OCRResult(
            raw_text=full_text,
            confidence=round(avg_confidence, 2),
            extracted_data=extracted_data
        )

    def process_bytes(self, content: bytes, filename: str) -> OCRResult:
        """Verarbeite Bytes und extrahiere Rechnungsdaten"""
        # Datei temporär speichern oder direkt verarbeiten
        if filename.lower().endswith('.pdf'):
            images = pdf2image.convert_from_bytes(content, dpi=300)
        else:
            images = [Image.open(io.BytesIO(content))]

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

    def _convert_to_images(self, path: Path) -> list[Image.Image]:
        """Konvertiere Dokument zu Bildern"""
        suffix = path.suffix.lower()

        if suffix == '.pdf':
            return pdf2image.convert_from_path(str(path), dpi=300)
        elif suffix in ['.png', '.jpg', '.jpeg']:
            return [Image.open(path)]
        else:
            raise ValueError(f"Nicht unterstütztes Dateiformat: {suffix}")

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Bildvorverarbeitung für bessere OCR-Ergebnisse"""
        # In Graustufen konvertieren falls nötig
        if image.mode != 'L':
            image = image.convert('L')

        # Kontrast erhöhen (einfache Methode)
        # Für bessere Ergebnisse könnte OpenCV verwendet werden

        return image
