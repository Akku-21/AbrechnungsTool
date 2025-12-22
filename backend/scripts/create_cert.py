#!/usr/bin/env python3
"""
Erstellt ein selbstsigniertes Zertifikat für Entwicklungszwecke.

WARNUNG: Nur für Entwicklung/Tests!
Für Produktion ein qualifiziertes Zertifikat verwenden.

Usage:
    python create_cert.py [output_path] [password]

Defaults:
    output_path: certs/settlement.p12
    password: dev_password
"""
import sys
from pathlib import Path
from OpenSSL import crypto


def create_self_signed_cert(
    output_path: str = "certs/settlement.p12",
    password: str = "dev_password",
    organization: str = "Nebenkostenabrechnung",
    common_name: str = "settlement@localhost",
    country: str = "DE",
    validity_days: int = 365
) -> None:
    """
    Erstellt ein selbstsigniertes PKCS#12-Zertifikat.

    Args:
        output_path: Ausgabepfad für .p12 Datei
        password: Passwort für das Zertifikat
        organization: Organisation im Zertifikat
        common_name: Common Name (CN) im Zertifikat
        country: Ländercode (2 Buchstaben)
        validity_days: Gültigkeitsdauer in Tagen
    """
    # RSA-Schlüssel generieren
    key = crypto.PKey()
    key.generate_key(crypto.TYPE_RSA, 4096)

    # Zertifikat erstellen
    cert = crypto.X509()
    cert.get_subject().C = country
    cert.get_subject().O = organization
    cert.get_subject().CN = common_name
    cert.set_serial_number(1000)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(validity_days * 24 * 60 * 60)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(key)
    cert.sign(key, 'sha256')

    # PKCS#12 Container erstellen
    p12 = crypto.PKCS12()
    p12.set_privatekey(key)
    p12.set_certificate(cert)

    # Ausgabeverzeichnis erstellen
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Datei schreiben
    with open(output_file, 'wb') as f:
        f.write(p12.export(password.encode('utf-8')))

    print(f"Zertifikat erstellt: {output_file.absolute()}")
    print(f"  Organisation: {organization}")
    print(f"  Common Name: {common_name}")
    print(f"  Gültig für: {validity_days} Tage")
    print(f"  Passwort: {password}")
    print()
    print("WARNUNG: Dies ist ein selbstsigniertes Zertifikat!")
    print("PDF-Viewer werden eine Warnung anzeigen.")
    print("Für Produktion ein qualifiziertes Zertifikat verwenden.")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "certs/settlement.p12"
    pwd = sys.argv[2] if len(sys.argv) > 2 else "dev_password"

    create_self_signed_cert(output, pwd)
