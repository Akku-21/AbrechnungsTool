"""
API-Endpunkte fuer Einstellungen
"""
import uuid
import shutil
from pathlib import Path
from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
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
from app.services.signing_service import (
    get_signature_type,
    get_signature_setting,
    set_signature_setting,
    validate_pkcs12,
    save_signature_image_from_base64,
    SIGNATURE_TYPE_KEY,
    SIGNATURE_CERT_PATH_KEY,
    SIGNATURE_CERT_PASSWORD_KEY,
    SIGNATURE_IMAGE_PATH_KEY,
    SIGNATURE_TEXT_KEY,
    SIGNATURE_TEXT_FONT_KEY,
)
from app.services.crypto_service import encrypt_value

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
    # Legacy signing (deprecated)
    signing_enabled: bool
    signing_cert_path: Optional[str]
    # Neue Signatur-Einstellungen
    signature_type: str
    signature_configured: bool
    signature_text: Optional[str]
    signature_text_font: Optional[str]
    # LLM-Einstellungen (API-Key wird nie zurueckgegeben)
    openrouter_api_key_set: bool
    openrouter_model: str
    llm_correction_enabled: bool


# Signatur-spezifische Schemas
SignatureTypeEnum = Literal["NONE", "CERTIFICATE", "PAD", "IMAGE", "TEXT"]
TextFontStyleEnum = Literal["HANDWRITING", "SERIF", "SANS"]


class SignatureSettingsResponse(BaseModel):
    """Aktuelle Signatur-Einstellungen"""
    signature_type: SignatureTypeEnum
    configured: bool
    # Certificate info (ohne Passwort)
    certificate_uploaded: bool
    certificate_filename: Optional[str]
    # Image/Pad info
    signature_image_uploaded: bool
    # Text info
    signature_text: Optional[str]
    signature_text_font: Optional[TextFontStyleEnum]


class SignatureTypeUpdate(BaseModel):
    """Signaturtyp aendern"""
    signature_type: SignatureTypeEnum


class SignatureTextUpdate(BaseModel):
    """Text-Signatur konfigurieren"""
    text: str
    font: TextFontStyleEnum = "HANDWRITING"


class SignaturePadSave(BaseModel):
    """Pad-Signatur speichern (Base64 PNG)"""
    image_data: str  # Base64-encodiertes PNG


class SignatureTestResponse(BaseModel):
    """Response fuer Signatur-Test"""
    success: bool
    message: str


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


def _is_signature_configured(db: Session, sig_type: str) -> bool:
    """Pruefe ob die Signatur vollstaendig konfiguriert ist"""
    if sig_type == "NONE":
        return False
    if sig_type == "CERTIFICATE":
        cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)
        cert_pw = get_signature_setting(db, SIGNATURE_CERT_PASSWORD_KEY)
        return bool(cert_path and cert_pw and Path(cert_path).exists())
    if sig_type in ["PAD", "IMAGE"]:
        img_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)
        return bool(img_path and Path(img_path).exists())
    if sig_type == "TEXT":
        text = get_signature_setting(db, SIGNATURE_TEXT_KEY)
        return bool(text)
    return False


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Alle Einstellungen abrufen"""
    llm_settings = get_llm_settings(db)
    sig_type = get_signature_type(db)

    return SettingsResponse(
        company_name=get_setting(db, "company_name") or "",
        company_street=get_setting(db, "company_street") or "",
        company_postal_code=get_setting(db, "company_postal_code") or "",
        company_city=get_setting(db, "company_city") or "",
        # Legacy signing (deprecated)
        signing_enabled=app_settings.signing_enabled,
        signing_cert_path=app_settings.SIGNING_CERT_PATH if app_settings.signing_enabled else None,
        # Neue Signatur-Einstellungen
        signature_type=sig_type,
        signature_configured=_is_signature_configured(db, sig_type),
        signature_text=get_signature_setting(db, SIGNATURE_TEXT_KEY) or None,
        signature_text_font=get_signature_setting(db, SIGNATURE_TEXT_FONT_KEY) or None,
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


# =============================================================================
# Signatur-Endpunkte
# =============================================================================


@router.get("/signature", response_model=SignatureSettingsResponse)
def get_signature_settings(db: Session = Depends(get_db)):
    """Aktuelle Signatur-Einstellungen abrufen"""
    sig_type = get_signature_type(db)
    cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)
    img_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)
    sig_text = get_signature_setting(db, SIGNATURE_TEXT_KEY)
    sig_font = get_signature_setting(db, SIGNATURE_TEXT_FONT_KEY) or "HANDWRITING"

    # Zertifikat-Dateiname extrahieren
    cert_filename = None
    if cert_path:
        cert_file = Path(cert_path)
        if cert_file.exists():
            cert_filename = cert_file.name

    return SignatureSettingsResponse(
        signature_type=sig_type,
        configured=_is_signature_configured(db, sig_type),
        certificate_uploaded=bool(cert_path and Path(cert_path).exists()),
        certificate_filename=cert_filename,
        signature_image_uploaded=bool(img_path and Path(img_path).exists()),
        signature_text=sig_text or None,
        signature_text_font=sig_font if sig_font in ["HANDWRITING", "SERIF", "SANS"] else "HANDWRITING",
    )


@router.put("/signature/type", response_model=SignatureSettingsResponse)
def update_signature_type(
    update: SignatureTypeUpdate,
    db: Session = Depends(get_db)
):
    """Signaturtyp aendern"""
    set_signature_setting(db, SIGNATURE_TYPE_KEY, update.signature_type, "Signaturtyp")
    db.commit()
    return get_signature_settings(db)


@router.post("/signature/certificate", response_model=SignatureSettingsResponse)
async def upload_certificate(
    file: UploadFile = File(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    PKCS#12 Zertifikat hochladen.

    Validiert das Zertifikat mit dem Passwort vor dem Speichern.
    """
    # Dateiendung pruefen
    filename = file.filename or "certificate.p12"
    if not filename.lower().endswith(('.p12', '.pfx')):
        raise HTTPException(
            status_code=400,
            detail="Nur .p12 oder .pfx Dateien sind erlaubt"
        )

    # Zertifikat-Verzeichnis erstellen
    cert_dir = Path(app_settings.UPLOAD_DIR) / "signatures" / "certificates"
    cert_dir.mkdir(parents=True, exist_ok=True)

    # Temporaer speichern zum Validieren
    temp_filename = f"temp_{uuid.uuid4()}.p12"
    temp_path = cert_dir / temp_filename

    try:
        # Datei speichern
        content = await file.read()
        temp_path.write_bytes(content)

        # Validieren
        success, message = validate_pkcs12(str(temp_path), password)

        if not success:
            temp_path.unlink()  # Temporaere Datei loeschen
            raise HTTPException(status_code=400, detail=message)

        # Altes Zertifikat loeschen falls vorhanden
        old_cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)
        if old_cert_path:
            old_cert = Path(old_cert_path)
            if old_cert.exists():
                old_cert.unlink()

        # Umbenennen zur finalen Datei
        final_filename = f"cert_{uuid.uuid4()}.p12"
        final_path = cert_dir / final_filename
        temp_path.rename(final_path)

        # Berechtigungen setzen (nur Lesen/Schreiben fuer Owner)
        final_path.chmod(0o600)

        # In DB speichern
        set_signature_setting(db, SIGNATURE_CERT_PATH_KEY, str(final_path), "Zertifikatspfad")
        encrypted_pw = encrypt_value(password)
        set_signature_setting(db, SIGNATURE_CERT_PASSWORD_KEY, encrypted_pw, "Zertifikatspasswort (verschluesselt)")
        set_signature_setting(db, SIGNATURE_TYPE_KEY, "CERTIFICATE", "Signaturtyp")
        db.commit()

        return get_signature_settings(db)

    except HTTPException:
        raise
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Fehler beim Hochladen: {str(e)}")


@router.delete("/signature/certificate", response_model=SignatureSettingsResponse)
def delete_certificate(db: Session = Depends(get_db)):
    """Zertifikat loeschen"""
    cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)

    if cert_path:
        cert_file = Path(cert_path)
        if cert_file.exists():
            cert_file.unlink()

    # DB-Eintraege loeschen
    set_signature_setting(db, SIGNATURE_CERT_PATH_KEY, "", "Zertifikatspfad")
    set_signature_setting(db, SIGNATURE_CERT_PASSWORD_KEY, "", "Zertifikatspasswort")

    # Signaturtyp auf NONE setzen falls aktuell CERTIFICATE
    if get_signature_type(db) == "CERTIFICATE":
        set_signature_setting(db, SIGNATURE_TYPE_KEY, "NONE", "Signaturtyp")

    db.commit()
    return get_signature_settings(db)


@router.post("/signature/image", response_model=SignatureSettingsResponse)
async def upload_signature_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Unterschriftsbild hochladen (PNG/JPG)"""
    filename = file.filename or "signature.png"
    extension = Path(filename).suffix.lower()

    if extension not in ['.png', '.jpg', '.jpeg']:
        raise HTTPException(
            status_code=400,
            detail="Nur PNG oder JPG Dateien sind erlaubt"
        )

    # Verzeichnis erstellen
    img_dir = Path(app_settings.UPLOAD_DIR) / "signatures" / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Altes Bild loeschen falls vorhanden
        old_img_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)
        if old_img_path:
            old_img = Path(old_img_path)
            if old_img.exists():
                old_img.unlink()

        # Neues Bild speichern
        final_filename = f"sig_{uuid.uuid4()}{extension}"
        final_path = img_dir / final_filename

        content = await file.read()
        final_path.write_bytes(content)
        final_path.chmod(0o600)

        # In DB speichern
        set_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY, str(final_path), "Signaturbildpfad")
        set_signature_setting(db, SIGNATURE_TYPE_KEY, "IMAGE", "Signaturtyp")
        db.commit()

        return get_signature_settings(db)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Hochladen: {str(e)}")


@router.post("/signature/pad", response_model=SignatureSettingsResponse)
def save_signature_pad(
    data: SignaturePadSave,
    db: Session = Depends(get_db)
):
    """Pad-Signatur speichern (Base64 PNG vom Canvas)"""
    try:
        # Altes Bild loeschen falls vorhanden
        old_img_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)
        if old_img_path:
            old_img = Path(old_img_path)
            if old_img.exists():
                old_img.unlink()

        # Neues Bild speichern
        filename = f"pad_{uuid.uuid4()}"
        file_path = save_signature_image_from_base64(
            data.image_data,
            app_settings.UPLOAD_DIR,
            filename
        )

        # In DB speichern
        set_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY, file_path, "Signaturbildpfad")
        set_signature_setting(db, SIGNATURE_TYPE_KEY, "PAD", "Signaturtyp")
        db.commit()

        return get_signature_settings(db)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Speichern: {str(e)}")


@router.put("/signature/text", response_model=SignatureSettingsResponse)
def update_signature_text(
    data: SignatureTextUpdate,
    db: Session = Depends(get_db)
):
    """Text-Signatur konfigurieren"""
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Signaturtext darf nicht leer sein")

    set_signature_setting(db, SIGNATURE_TEXT_KEY, data.text.strip(), "Signaturtext")
    set_signature_setting(db, SIGNATURE_TEXT_FONT_KEY, data.font, "Signaturschrift")
    set_signature_setting(db, SIGNATURE_TYPE_KEY, "TEXT", "Signaturtyp")
    db.commit()

    return get_signature_settings(db)


@router.delete("/signature", response_model=SignatureSettingsResponse)
def clear_signature(db: Session = Depends(get_db)):
    """Alle Signaturdaten loeschen und Signatur deaktivieren"""
    # Zertifikat loeschen
    cert_path = get_signature_setting(db, SIGNATURE_CERT_PATH_KEY)
    if cert_path:
        cert_file = Path(cert_path)
        if cert_file.exists():
            cert_file.unlink()

    # Bild loeschen
    img_path = get_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY)
    if img_path:
        img_file = Path(img_path)
        if img_file.exists():
            img_file.unlink()

    # Alle Signatur-Einstellungen zuruecksetzen
    set_signature_setting(db, SIGNATURE_TYPE_KEY, "NONE", "Signaturtyp")
    set_signature_setting(db, SIGNATURE_CERT_PATH_KEY, "", "Zertifikatspfad")
    set_signature_setting(db, SIGNATURE_CERT_PASSWORD_KEY, "", "Zertifikatspasswort")
    set_signature_setting(db, SIGNATURE_IMAGE_PATH_KEY, "", "Signaturbildpfad")
    set_signature_setting(db, SIGNATURE_TEXT_KEY, "", "Signaturtext")
    set_signature_setting(db, SIGNATURE_TEXT_FONT_KEY, "", "Signaturschrift")
    db.commit()

    return get_signature_settings(db)
