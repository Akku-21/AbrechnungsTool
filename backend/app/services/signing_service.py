"""
PDF-Signatur-Service für Nebenkostenabrechnungen
"""
import io
from pathlib import Path
from typing import Optional

from pyhanko.sign import signers
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter


class SigningService:
    """Service für digitale PDF-Signaturen"""

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

    def sign_pdf(
        self,
        pdf_bytes: bytes,
        reason: str = "Abrechnung erstellt",
        location: str = "Deutschland",
        field_name: str = "Settlement_Signature"
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


def create_signing_service(cert_path: Optional[str], password: Optional[str]) -> Optional[SigningService]:
    """
    Factory-Funktion für SigningService.

    Returns None wenn Zertifikat nicht konfiguriert.
    """
    if not cert_path or not password:
        return None

    cert_file = Path(cert_path)
    if not cert_file.exists():
        print(f"Warnung: Zertifikat nicht gefunden: {cert_path}")
        return None

    try:
        return SigningService(cert_path, password)
    except Exception as e:
        print(f"Fehler beim Laden des Zertifikats: {e}")
        return None
