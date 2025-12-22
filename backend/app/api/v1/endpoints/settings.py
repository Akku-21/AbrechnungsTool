"""
API-Endpunkte für Einstellungen
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.settings import Settings
from app.config import settings as app_settings

router = APIRouter()

# Standardwerte für Einstellungen
DEFAULT_SETTINGS = {
    "company_name": "",
    "company_street": "",
    "company_postal_code": "",
    "company_city": "",
    "default_allocation_percentage": "100",
}


class SettingsUpdate(BaseModel):
    """Schema für Einstellungs-Updates"""
    company_name: Optional[str] = None
    company_street: Optional[str] = None
    company_postal_code: Optional[str] = None
    company_city: Optional[str] = None
    default_allocation_percentage: Optional[str] = None


class SettingsResponse(BaseModel):
    """Schema für Einstellungs-Response"""
    company_name: str
    company_street: str
    company_postal_code: str
    company_city: str
    default_allocation_percentage: str
    signing_enabled: bool
    signing_cert_path: Optional[str]


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
    return SettingsResponse(
        company_name=get_setting(db, "company_name") or "",
        company_street=get_setting(db, "company_street") or "",
        company_postal_code=get_setting(db, "company_postal_code") or "",
        company_city=get_setting(db, "company_city") or "",
        default_allocation_percentage=get_setting(db, "default_allocation_percentage") or "100",
        signing_enabled=app_settings.signing_enabled,
        signing_cert_path=app_settings.SIGNING_CERT_PATH if app_settings.signing_enabled else None,
    )


@router.put("", response_model=SettingsResponse)
def update_settings(updates: SettingsUpdate, db: Session = Depends(get_db)):
    """Einstellungen aktualisieren"""
    if updates.company_name is not None:
        set_setting(db, "company_name", updates.company_name, "Firmenname")
    if updates.company_street is not None:
        set_setting(db, "company_street", updates.company_street, "Straße")
    if updates.company_postal_code is not None:
        set_setting(db, "company_postal_code", updates.company_postal_code, "PLZ")
    if updates.company_city is not None:
        set_setting(db, "company_city", updates.company_city, "Stadt")
    if updates.default_allocation_percentage is not None:
        set_setting(db, "default_allocation_percentage", updates.default_allocation_percentage, "Standard-Umlageanteil")

    return get_settings(db)
