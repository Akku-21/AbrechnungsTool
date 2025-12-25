"""
Crypto Service für sichere Speicherung sensibler Daten (z.B. Zertifikat-Passwörter)
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def get_encryption_key() -> bytes:
    """
    Hole oder generiere den Verschlüsselungsschlüssel.

    Verwendet SETTINGS_ENCRYPTION_KEY Umgebungsvariable.
    Falls nicht gesetzt, wird ein deterministischer Key aus DATABASE_URL generiert.
    """
    env_key = os.getenv("SETTINGS_ENCRYPTION_KEY")

    if env_key:
        # Wenn ein expliziter Key gesetzt ist, verwende ihn
        # Der Key sollte ein base64-encodierter 32-byte Fernet-Key sein
        return env_key.encode('utf-8')

    # Fallback: Generiere einen Key aus DATABASE_URL (deterministische Generierung)
    # Das ist weniger sicher, aber ermöglicht Funktionalität ohne explizite Konfiguration
    database_url = os.getenv("DATABASE_URL", "default-fallback-key-source")

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"abrechnungsabot8000-settings",  # Fester Salt für Reproduzierbarkeit
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(database_url.encode()))
    return key


def encrypt_value(value: str) -> str:
    """
    Verschlüsselt einen String-Wert.

    Args:
        value: Der zu verschlüsselnde Wert

    Returns:
        Base64-encodierter verschlüsselter Wert
    """
    key = get_encryption_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(value.encode('utf-8'))
    return encrypted.decode('utf-8')


def decrypt_value(encrypted_value: str) -> str:
    """
    Entschlüsselt einen verschlüsselten Wert.

    Args:
        encrypted_value: Base64-encodierter verschlüsselter Wert

    Returns:
        Der entschlüsselte Original-Wert

    Raises:
        cryptography.fernet.InvalidToken: Wenn Entschlüsselung fehlschlägt
    """
    key = get_encryption_key()
    fernet = Fernet(key)
    decrypted = fernet.decrypt(encrypted_value.encode('utf-8'))
    return decrypted.decode('utf-8')


def generate_new_key() -> str:
    """
    Generiert einen neuen Fernet-Verschlüsselungsschlüssel.

    Dieser kann als SETTINGS_ENCRYPTION_KEY Umgebungsvariable verwendet werden.

    Returns:
        Base64-encodierter 32-byte Fernet-Key
    """
    return Fernet.generate_key().decode('utf-8')
