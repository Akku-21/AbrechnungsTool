from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Debug mode (shows calculation duration in logs)
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://nebenkosten:nebenkosten_dev@localhost:5432/nebenkosten_db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "png", "jpg", "jpeg"]

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"

    # PDF Signing (Legacy - wird durch Settings ersetzt)
    SIGNING_CERT_PATH: Optional[str] = None
    SIGNING_CERT_PASSWORD: Optional[str] = None

    # Encryption key for sensitive settings (e.g., certificate passwords)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    SETTINGS_ENCRYPTION_KEY: Optional[str] = None

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def signing_enabled(self) -> bool:
        return bool(self.SIGNING_CERT_PATH and self.SIGNING_CERT_PASSWORD)

    class Config:
        env_file = ".env"


settings = Settings()
