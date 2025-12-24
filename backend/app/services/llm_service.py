"""
LLM-Einstellungen Service.
Verwaltet LLM-bezogene Einstellungen aus der Datenbank.
"""
from typing import Optional
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.settings import Settings


# LLM-Einstellungs-Keys
LLM_API_KEY = "openrouter_api_key"
LLM_MODEL = "openrouter_model"
LLM_ENABLED = "llm_correction_enabled"

# Standardwerte
DEFAULT_LLM_MODEL = "anthropic/claude-3.5-sonnet"


@dataclass
class LLMSettings:
    """LLM-Einstellungen"""
    api_key: Optional[str]
    model: str
    enabled: bool

    @property
    def is_configured(self) -> bool:
        """Prueft ob LLM-Korrektur vollstaendig konfiguriert ist"""
        return self.enabled and bool(self.api_key) and bool(self.model)


def get_llm_settings(db: Session) -> LLMSettings:
    """
    Hole LLM-Einstellungen aus der Datenbank.

    Args:
        db: Datenbank-Session

    Returns:
        LLMSettings mit aktuellen Werten
    """
    api_key = _get_setting(db, LLM_API_KEY)
    model = _get_setting(db, LLM_MODEL) or DEFAULT_LLM_MODEL
    enabled = _get_setting(db, LLM_ENABLED) == "true"

    return LLMSettings(
        api_key=api_key,
        model=model,
        enabled=enabled
    )


def set_llm_api_key(db: Session, api_key: str):
    """Setze OpenRouter API-Key"""
    _set_setting(db, LLM_API_KEY, api_key, "OpenRouter API-Key")


def set_llm_model(db: Session, model: str):
    """Setze LLM-Modell"""
    _set_setting(db, LLM_MODEL, model, "OpenRouter Modell")


def set_llm_enabled(db: Session, enabled: bool):
    """Aktiviere/Deaktiviere LLM-Korrektur"""
    _set_setting(db, LLM_ENABLED, "true" if enabled else "false", "LLM-Korrektur aktiviert")


def has_api_key(db: Session) -> bool:
    """Prueft ob ein API-Key gesetzt ist (ohne den Key preiszugeben)"""
    api_key = _get_setting(db, LLM_API_KEY)
    return bool(api_key and api_key.strip())


def _get_setting(db: Session, key: str) -> Optional[str]:
    """Interner Helper: Hole Setting-Wert"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    return setting.value if setting else None


def _set_setting(db: Session, key: str, value: str, description: str = None):
    """Interner Helper: Setze Setting-Wert"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        setting.value = value
        if description:
            setting.description = description
    else:
        setting = Settings(key=key, value=value, description=description)
        db.add(setting)
    db.commit()
