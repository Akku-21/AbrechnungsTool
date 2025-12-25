"""
PDF-Signatur-Service für Nebenkostenabrechnungen

Unterstützt verschiedene Signaturtypen:
- CERTIFICATE: Kryptographische Signatur mit PKCS#12 Zertifikat
- PAD: Visuelle Signatur aus gezeichneter Unterschrift
- IMAGE: Visuelle Signatur aus hochgeladenem Bild
- TEXT: Visuelle Signatur aus Text
"""
import io
import base64
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Literal
from PIL import Image, ImageDraw, ImageFont

from pyhanko.sign import signers
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from sqlalchemy.orm import Session

from app.models.settings import Settings
from app.services.crypto_service import decrypt_value


# Signaturtypen
SignatureType = Literal["NONE", "CERTIFICATE", "PAD", "IMAGE", "TEXT"]
TextFontStyle = Literal["HANDWRITING", "SERIF", "SANS"]

# Settings Keys
SIGNATURE_TYPE_KEY = "signature_type"
SIGNATURE_CERT_PATH_KEY = "signature_cert_path"
SIGNATURE_CERT_PASSWORD_KEY = "signature_cert_password"
SIGNATURE_IMAGE_PATH_KEY = "signature_image_path"
SIGNATURE_TEXT_KEY = "signature_text"
SIGNATURE_TEXT_FONT_KEY = "signature_text_font"


def get_signature_setting(db: Session, key: str, default: str = "") -> str:
    """Hole einen Signatur-Einstellungswert aus der DB"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else default


def set_signature_setting(db: Session, key: str, value: str, description: str = None):
    """Setze einen Signatur-Einstellungswert in der DB"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value, description=description)
        db.add(setting)
    db.flush()


class BaseSignatureService(ABC):
    """Abstrakte Basisklasse für Signatur-Services"""

    @abstractmethod
    def apply_signature(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        **kwargs
    ) -> bytes:
        """Signiere ein PDF-Dokument"""
        pass


class CryptographicSigningService(BaseSignatureService):
    """Service für digitale (kryptographische) PDF-Signaturen mit pyHanko"""

    def __init__(self, pkcs12_path: str, password: str):
        """
        Initialisiere den Signing-Service mit PKCS#12-Zertifikat.

        Args:
            pkcs12_path: Pfad zur .p12/.pfx Zertifikatsdatei
            password: Passwort für das Zertifikat
        """
        self.signer = signers.SimpleSigner.load_pkcs12(
            pfx_file=pkcs12_path,
            passphrase=password.encode('utf-8')
        )

    def apply_signature(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        location: str = "Deutschland",
        field_name: str = "Settlement_Signature",
        **kwargs
    ) -> bytes:
        """
        Signiere ein PDF-Dokument digital.

        Args:
            pdf_bytes: PDF als Bytes
            reason: Grund der Signatur
            location: Ort der Signatur
            field_name: Name des Signaturfeldes

        Returns:
            Signiertes PDF als Bytes
        """
        pdf_writer = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes))

        sig_meta = signers.PdfSignatureMetadata(
            field_name=field_name,
            reason=reason,
            location=location,
            md_algorithm='sha256'
        )

        pdf_signer = signers.PdfSigner(sig_meta, signer=self.signer)
        signed = pdf_signer.sign_pdf(pdf_writer)

        return signed.getvalue()


class VisualSignatureService(BaseSignatureService):
    """Service für visuelle Signaturen (Bild oder Pad-Zeichnung)"""

    def __init__(self, image_path: str):
        """
        Initialisiere mit Pfad zum Signaturbild.

        Args:
            image_path: Pfad zum PNG/JPG Signaturbild
        """
        self.image_path = Path(image_path)

        if not self.image_path.exists():
            raise ValueError(f"Signaturbild nicht gefunden: {image_path}")

    def apply_signature(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        **kwargs
    ) -> bytes:
        """
        Füge visuelle Signatur zur letzten Seite hinzu.

        Args:
            pdf_bytes: PDF als Bytes
            reason: Wird als Text unter der Signatur angezeigt

        Returns:
            PDF mit visueller Signatur
        """
        # Signatur-Overlay erstellen
        overlay_bytes = self._create_signature_overlay(reason)

        # PDFs zusammenführen
        return self._merge_signature(pdf_bytes, overlay_bytes)

    def _create_signature_overlay(self, reason: str) -> bytes:
        """Erstelle PDF-Overlay mit Signatur"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Signatur-Position (unten rechts, ca. 60mm vom Rand)
        sig_x = width - 80 * mm
        sig_y = 30 * mm

        # Signaturbild laden und skalieren
        try:
            img = Image.open(self.image_path)
            # Auf maximale Breite/Höhe skalieren
            max_width = 60 * mm
            max_height = 25 * mm
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

            # Temporär speichern für reportlab
            temp_buffer = io.BytesIO()
            img.save(temp_buffer, format='PNG')
            temp_buffer.seek(0)

            # Bild einfügen
            from reportlab.lib.utils import ImageReader
            c.drawImage(
                ImageReader(temp_buffer),
                sig_x - img.width / 2,
                sig_y,
                width=img.width,
                height=img.height,
                mask='auto'
            )
        except Exception as e:
            print(f"Fehler beim Laden des Signaturbilds: {e}")

        c.save()
        return buffer.getvalue()

    def _merge_signature(self, pdf_bytes: bytes, overlay_bytes: bytes) -> bytes:
        """Füge Signatur-Overlay zur letzten Seite hinzu"""
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        overlay_reader = PdfReader(io.BytesIO(overlay_bytes))
        writer = PdfWriter()

        # Alle Seiten kopieren
        for i, page in enumerate(pdf_reader.pages):
            if i == len(pdf_reader.pages) - 1:
                # Letzte Seite: Overlay hinzufügen
                page.merge_page(overlay_reader.pages[0])
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()


class TextSignatureService(BaseSignatureService):
    """Service für Text-basierte Signaturen"""

    # Font-Pfade (im Container verfügbar)
    FONT_PATHS = {
        "HANDWRITING": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
        "SERIF": "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "SANS": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    }

    def __init__(self, text: str, font_style: TextFontStyle = "HANDWRITING"):
        """
        Initialisiere mit Signaturtext.

        Args:
            text: Der Signaturtext (z.B. Name)
            font_style: Schriftstil (HANDWRITING, SERIF, SANS)
        """
        self.text = text
        self.font_style = font_style

    def apply_signature(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        **kwargs
    ) -> bytes:
        """
        Füge Text-Signatur zur letzten Seite hinzu.
        """
        # Text zu Bild rendern
        sig_image = self._render_text_signature()

        # Temporäres Bild speichern
        temp_buffer = io.BytesIO()
        sig_image.save(temp_buffer, format='PNG')
        temp_buffer.seek(0)

        # Visual Service nutzen
        visual_service = VisualSignatureServiceFromBytes(temp_buffer.getvalue())
        return visual_service.apply_signature(pdf_bytes, reason)

    def _render_text_signature(self) -> Image.Image:
        """Rendere Signaturtext als Bild"""
        # Font laden
        font_path = self.FONT_PATHS.get(self.font_style, self.FONT_PATHS["SANS"])
        try:
            font = ImageFont.truetype(font_path, 36)
        except OSError:
            # Fallback auf Standard-Font
            font = ImageFont.load_default()

        # Textgröße ermitteln
        dummy_img = Image.new('RGBA', (1, 1))
        draw = ImageDraw.Draw(dummy_img)
        bbox = draw.textbbox((0, 0), self.text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Bild mit Padding erstellen
        padding = 20
        img_width = text_width + padding * 2
        img_height = text_height + padding * 2

        img = Image.new('RGBA', (img_width, img_height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)

        # Text zeichnen (dunkelblau für "Unterschrift"-Look)
        draw.text((padding, padding - bbox[1]), self.text, font=font, fill=(0, 0, 100, 255))

        return img


class VisualSignatureServiceFromBytes(BaseSignatureService):
    """Hilfsklasse für visuelle Signaturen aus Bytes"""

    def __init__(self, image_bytes: bytes):
        self.image_bytes = image_bytes

    def apply_signature(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        **kwargs
    ) -> bytes:
        """Füge visuelle Signatur zur letzten Seite hinzu"""
        overlay_bytes = self._create_signature_overlay()
        return self._merge_signature(pdf_bytes, overlay_bytes)

    def _create_signature_overlay(self) -> bytes:
        """Erstelle PDF-Overlay mit Signatur"""
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        sig_x = width - 80 * mm
        sig_y = 30 * mm

        try:
            img = Image.open(io.BytesIO(self.image_bytes))
            max_width = 60 * mm
            max_height = 25 * mm
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

            temp_buffer = io.BytesIO()
            img.save(temp_buffer, format='PNG')
            temp_buffer.seek(0)

            from reportlab.lib.utils import ImageReader
            c.drawImage(
                ImageReader(temp_buffer),
                sig_x - img.width / 2,
                sig_y,
                width=img.width,
                height=img.height,
                mask='auto'
            )
        except Exception as e:
            print(f"Fehler beim Laden des Signaturbilds: {e}")

        c.save()
        return buffer.getvalue()

    def _merge_signature(self, pdf_bytes: bytes, overlay_bytes: bytes) -> bytes:
        """Füge Signatur-Overlay zur letzten Seite hinzu"""
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        overlay_reader = PdfReader(io.BytesIO(overlay_bytes))
        writer = PdfWriter()

        for i, page in enumerate(pdf_reader.pages):
            if i == len(pdf_reader.pages) - 1:
                page.merge_page(overlay_reader.pages[0])
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()


def get_signature_type(db: Session) -> SignatureType:
    """Hole den konfigurierten Signaturtyp"""
    sig_type = get_signature_setting(db, SIGNATURE_TYPE_KEY, "NONE")
    if sig_type in ["NONE", "CERTIFICATE", "PAD", "IMAGE", "TEXT"]:
        return sig_type
    return "NONE"


def create_signature_service(db: Session) -> Optional[BaseSignatureService]:
    """
    Factory-Funktion für SignatureService basierend auf DB-Einstellungen.

    Returns None wenn keine Signatur konfiguriert.
    """
    sig_type = get_signature_type(db)

    if sig_type == "NONE":
        return None

    if sig_type == "CERTIFICATE":
        cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)
        encrypted_password = get_signature_setting(db, SIGNATURE_CERT_PASSWORD_KEY)

        if not cert_path or not encrypted_password:
            return None

        cert_file = Path(cert_path)
        if not cert_file.exists():
            print(f"Warnung: Zertifikat nicht gefunden: {cert_path}")
            return None

        try:
            password = decrypt_value(encrypted_password)
            return CryptographicSigningService(cert_path, password)
        except Exception as e:
            print(f"Fehler beim Laden des Zertifikats: {e}")
            return None

    if sig_type in ["PAD", "IMAGE"]:
        image_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)

        if not image_path:
            return None

        try:
            return VisualSignatureService(image_path)
        except Exception as e:
            print(f"Fehler beim Laden des Signaturbilds: {e}")
            return None

    if sig_type == "TEXT":
        text = get_signature_setting(db, SIGNATURE_TEXT_KEY)
        font_style = get_signature_setting(db, SIGNATURE_TEXT_FONT_KEY, "HANDWRITING")

        if not text:
            return None

        try:
            return TextSignatureService(text, font_style)
        except Exception as e:
            print(f"Fehler beim Erstellen der Text-Signatur: {e}")
            return None

    return None


def create_signing_service(cert_path: Optional[str], password: Optional[str]) -> Optional[CryptographicSigningService]:
    """
    Legacy Factory-Funktion für SigningService.
    Wird für Rückwärtskompatibilität beibehalten.

    Returns None wenn Zertifikat nicht konfiguriert.
    """
    if not cert_path or not password:
        return None

    cert_file = Path(cert_path)
    if not cert_file.exists():
        print(f"Warnung: Zertifikat nicht gefunden: {cert_path}")
        return None

    try:
        return CryptographicSigningService(cert_path, password)
    except Exception as e:
        print(f"Fehler beim Laden des Zertifikats: {e}")
        return None


def validate_pkcs12(cert_path: str, password: str) -> tuple[bool, str]:
    """
    Validiere ein PKCS#12 Zertifikat.

    Returns:
        Tuple (success: bool, message: str)
    """
    try:
        signers.SimpleSigner.load_pkcs12(
            pfx_file=cert_path,
            passphrase=password.encode('utf-8')
        )
        return True, "Zertifikat erfolgreich geladen"
    except Exception as e:
        return False, f"Fehler beim Laden des Zertifikats: {str(e)}"


def get_signature_image_base64(db: Session) -> Optional[str]:
    """
    Hole das Signaturbild als Base64-String für HTML-Embedding.

    Returns:
        Base64-encodiertes PNG mit data:image/png;base64, prefix
        oder None wenn keine visuelle Signatur konfiguriert
    """
    sig_type = get_signature_type(db)

    if sig_type == "NONE" or sig_type == "CERTIFICATE":
        # Keine visuelle Signatur
        return None

    if sig_type in ["PAD", "IMAGE"]:
        image_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)

        if not image_path:
            return None

        path = Path(image_path)
        if not path.exists():
            return None

        try:
            image_data = path.read_bytes()
            b64 = base64.b64encode(image_data).decode('utf-8')
            return f"data:image/png;base64,{b64}"
        except Exception as e:
            print(f"Fehler beim Lesen des Signaturbilds: {e}")
            return None

    if sig_type == "TEXT":
        text = get_signature_setting(db, SIGNATURE_TEXT_KEY)
        font_style = get_signature_setting(db, SIGNATURE_TEXT_FONT_KEY, "HANDWRITING")

        if not text:
            return None

        try:
            service = TextSignatureService(text, font_style)
            img = service._render_text_signature()

            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{b64}"
        except Exception as e:
            print(f"Fehler beim Rendern der Text-Signatur: {e}")
            return None

    return None


def save_signature_image_from_base64(
    base64_data: str,
    upload_dir: str,
    filename: str
) -> str:
    """
    Speichere Base64-encodiertes Bild als Datei.

    Args:
        base64_data: Base64-encodiertes PNG (kann data:image/png;base64, prefix haben)
        upload_dir: Zielverzeichnis
        filename: Dateiname (ohne Extension)

    Returns:
        Vollständiger Pfad zur gespeicherten Datei
    """
    # Base64 Prefix entfernen falls vorhanden
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    # Decodieren
    image_data = base64.b64decode(base64_data)

    # Verzeichnis erstellen
    sig_dir = Path(upload_dir) / "signatures" / "images"
    sig_dir.mkdir(parents=True, exist_ok=True)

    # Datei speichern
    file_path = sig_dir / f"{filename}.png"
    file_path.write_bytes(image_data)

    # Berechtigungen setzen (nur Lesen/Schreiben für Owner)
    file_path.chmod(0o600)

    return str(file_path)
