"""
API-Endpunkte fuer Einstellungen
"""
from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.settings import Settings
from app.config import settings as app_settings
from app.services.llm_service import (
    get_llm_settings,
    set_llm_api_key,
    set_llm_model,
    set_llm_enabled,
    has_api_key,
    DEFAULT_LLM_MODEL,
)
from app.ocr.llm_corrector import RECOMMENDED_MODELS, test_openrouter_connection

router = APIRouter()

# Standardwerte fuer Einstellungen
DEFAULT_SETTINGS = {
    "company_name": "",
    "company_street": "",
    "company_postal_code": "",
    "company_city": "",
}


class SettingsUpdate(BaseModel):
    """Schema fuer Einstellungs-Updates"""
    company_name: Optional[str] = None
    company_street: Optional[str] = None
    company_postal_code: Optional[str] = None
    company_city: Optional[str] = None
    # LLM-Einstellungen
    openrouter_api_key: Optional[str] = None
    openrouter_model: Optional[str] = None
    llm_correction_enabled: Optional[bool] = None


class SettingsResponse(BaseModel):
    """Schema fuer Einstellungs-Response"""
    company_name: str
    company_street: str
    company_postal_code: str
    company_city: str
    signing_enabled: bool
    signing_cert_path: Optional[str]
    # LLM-Einstellungen (API-Key wird nie zurueckgegeben)
    openrouter_api_key_set: bool
    openrouter_model: str
    llm_correction_enabled: bool


class RecommendedModel(BaseModel):
    """Ein empfohlenes LLM-Modell"""
    id: str
    name: str


class TestConnectionRequest(BaseModel):
    """Request fuer Verbindungstest"""
    api_key: Optional[str] = None  # Optional: Wenn None, wird DB-Key verwendet
    model: Optional[str] = None    # Optional: Wenn None, wird DB-Model verwendet


class TestConnectionResponse(BaseModel):
    """Response fuer Verbindungstest"""
    success: bool
    message: str


def get_setting(db: Session, key: str) -> Optional[str]:
    """Hole einen Einstellungswert aus der DB"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        return setting.value
    return DEFAULT_SETTINGS.get(key)


def set_setting(db: Session, key: str, value: str, description: str = None):
    """Setze einen Einstellungswert in der DB"""
    setting = db.query(Settings).filter(Settings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value, description=description)
        db.add(setting)
    db.commit()


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Alle Einstellungen abrufen"""
    llm_settings = get_llm_settings(db)

    return SettingsResponse(
        company_name=get_setting(db, "company_name") or "",
        company_street=get_setting(db, "company_street") or "",
        company_postal_code=get_setting(db, "company_postal_code") or "",
        company_city=get_setting(db, "company_city") or "",
        signing_enabled=app_settings.signing_enabled,
        signing_cert_path=app_settings.SIGNING_CERT_PATH if app_settings.signing_enabled else None,
        # LLM-Einstellungen
        openrouter_api_key_set=has_api_key(db),
        openrouter_model=llm_settings.model,
        llm_correction_enabled=llm_settings.enabled,
    )


@router.put("", response_model=SettingsResponse)
def update_settings(updates: SettingsUpdate, db: Session = Depends(get_db)):
    """Einstellungen aktualisieren"""
    # Firmeneinstellungen
    if updates.company_name is not None:
        set_setting(db, "company_name", updates.company_name, "Firmenname")
    if updates.company_street is not None:
        set_setting(db, "company_street", updates.company_street, "Strasse")
    if updates.company_postal_code is not None:
        set_setting(db, "company_postal_code", updates.company_postal_code, "PLZ")
    if updates.company_city is not None:
        set_setting(db, "company_city", updates.company_city, "Stadt")

    # LLM-Einstellungen
    if updates.openrouter_api_key is not None:
        set_llm_api_key(db, updates.openrouter_api_key)
    if updates.openrouter_model is not None:
        set_llm_model(db, updates.openrouter_model)
    if updates.llm_correction_enabled is not None:
        set_llm_enabled(db, updates.llm_correction_enabled)

    return get_settings(db)


@router.get("/recommended-models", response_model=List[RecommendedModel])
def get_recommended_models():
    """Liste der empfohlenen LLM-Modelle fuer OCR-Korrektur"""
    return [RecommendedModel(id=m["id"], name=m["name"]) for m in RECOMMENDED_MODELS]


@router.post("/test-openrouter", response_model=TestConnectionResponse)
async def test_openrouter(
    request: TestConnectionRequest,
    db: Session = Depends(get_db)
):
    """
    Teste die Verbindung zu OpenRouter.

    Verwendet entweder die uebergebenen Werte oder die gespeicherten Einstellungen.
    """
    llm_settings = get_llm_settings(db)

    # Verwende uebergebene Werte oder Fallback auf DB-Werte
    api_key = request.api_key if request.api_key else llm_settings.api_key
    model = request.model if request.model else llm_settings.model

    if not api_key:
        return TestConnectionResponse(
            success=False,
            message="Kein API-Key angegeben"
        )

    if not model:
        model = DEFAULT_LLM_MODEL

    result = await test_openrouter_connection(api_key, model)

    return TestConnectionResponse(
        success=result["success"],
        message=result["message"]
    )
