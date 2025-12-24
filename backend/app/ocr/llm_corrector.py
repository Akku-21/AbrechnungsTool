"""
LLM-basierte OCR-Textkorrektur und Datenextraktion via OpenRouter API.
- Korrigiert OCR-Fehler kontextbasiert unter Beibehaltung des Originalformats
- Extrahiert strukturierte Rechnungsdaten direkt aus OCR-Text
"""
import logging
import json
from typing import Optional
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

import httpx

from app.models.enums import CostCategory

logger = logging.getLogger(__name__)

# Empfohlene Modelle fuer OCR-Korrektur
RECOMMENDED_MODELS = [
    # Anthropic Claude
    {"id": "anthropic/claude-sonnet-4.5", "name": "Claude Sonnet 4.5 (empfohlen)"},
    {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
    {"id": "anthropic/claude-3.5-haiku", "name": "Claude 3.5 Haiku (schnell)"},
    # Google Gemini
    {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro"},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash"},
    {"id": "google/gemini-2.0-flash-001", "name": "Gemini 2.0 Flash"},
    # OpenAI GPT
    {"id": "openai/gpt-4o", "name": "GPT-4o"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini (guenstig)"},
    # Meta Llama
    {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B (kostenguenstig)"},
]

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Maximale Eingabelaenge (Zeichen)
MAX_INPUT_LENGTH = 8000

# System-Prompt fuer OCR-Korrektur
CORRECTION_SYSTEM_PROMPT = """Du bist ein OCR-Korrektur-Assistent fuer deutsche Rechnungen und Belege.

Deine Aufgabe:
1. Korrigiere offensichtliche OCR-Fehler (z.B. "0" statt "O", "1" statt "l", "rn" statt "m")
2. Behalte das EXAKTE Format und die Struktur bei
3. Aendere KEINE Zahlen, Betraege oder Daten - diese sind kritisch
4. Korrigiere nur eindeutige Textfehler bei Woertern

Regeln:
- Gib NUR den korrigierten Text zurueck, keine Erklaerungen
- Behalte alle Zeilenumbrueche und Leerzeichen bei
- Bei Unsicherheit: Original beibehalten
- Deutsche Sonderzeichen (ue, ae, oe, ss) korrekt verwenden"""

CORRECTION_USER_PROMPT = """Korrigiere den folgenden OCR-Text einer deutschen Rechnung.
Gib NUR den korrigierten Text zurueck:

{text}"""


@dataclass
class CorrectionResult:
    """Ergebnis der LLM-Korrektur"""
    original_text: str
    corrected_text: str
    model_used: str
    success: bool
    error_message: Optional[str] = None


class LLMCorrector:
    """LLM-basierte Textkorrektur via OpenRouter API"""

    def __init__(self, api_key: str, model: str):
        """
        Initialisiere den Korrektor.

        Args:
            api_key: OpenRouter API-Key
            model: Modell-ID (z.B. "anthropic/claude-3.5-sonnet")
        """
        self.api_key = api_key
        self.model = model
        self.timeout = 60.0  # Sekunden

    async def correct_text(self, text: str) -> CorrectionResult:
        """
        Korrigiere OCR-Text mittels LLM.

        Args:
            text: OCR-Rohtext zur Korrektur

        Returns:
            CorrectionResult mit korrigiertem Text
        """
        if not text or not text.strip():
            return CorrectionResult(
                original_text=text,
                corrected_text=text,
                model_used=self.model,
                success=True,
                error_message=None
            )

        # Eingabe auf maximale Laenge begrenzen
        truncated = text[:MAX_INPUT_LENGTH] if len(text) > MAX_INPUT_LENGTH else text

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/AbrechnungsaBot8000",
                        "X-Title": "AbrechnungsaBot8000"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": CORRECTION_SYSTEM_PROMPT},
                            {"role": "user", "content": CORRECTION_USER_PROMPT.format(text=truncated)}
                        ],
                        "temperature": 0.1,  # Niedrig fuer Genauigkeit
                        "max_tokens": 4000
                    }
                )

                if response.status_code != 200:
                    error_msg = f"OpenRouter API Fehler: {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data:
                            error_msg = f"{error_msg} - {error_data['error'].get('message', '')}"
                    except Exception:
                        pass

                    logger.error(error_msg)
                    return CorrectionResult(
                        original_text=text,
                        corrected_text=text,
                        model_used=self.model,
                        success=False,
                        error_message=error_msg
                    )

                data = response.json()
                corrected = data["choices"][0]["message"]["content"].strip()

                logger.info(f"LLM-Korrektur erfolgreich mit {self.model}")
                return CorrectionResult(
                    original_text=text,
                    corrected_text=corrected,
                    model_used=self.model,
                    success=True
                )

        except httpx.TimeoutException:
            error_msg = f"OpenRouter API Timeout nach {self.timeout}s"
            logger.error(error_msg)
            return CorrectionResult(
                original_text=text,
                corrected_text=text,
                model_used=self.model,
                success=False,
                error_message=error_msg
            )
        except httpx.RequestError as e:
            error_msg = f"OpenRouter API Verbindungsfehler: {str(e)}"
            logger.error(error_msg)
            return CorrectionResult(
                original_text=text,
                corrected_text=text,
                model_used=self.model,
                success=False,
                error_message=error_msg
            )
        except Exception as e:
            error_msg = f"Unerwarteter Fehler bei LLM-Korrektur: {str(e)}"
            logger.error(error_msg)
            return CorrectionResult(
                original_text=text,
                corrected_text=text,
                model_used=self.model,
                success=False,
                error_message=error_msg
            )

    def correct_text_sync(self, text: str) -> CorrectionResult:
        """
        Synchrone Version der Textkorrektur.

        Args:
            text: OCR-Rohtext zur Korrektur

        Returns:
            CorrectionResult mit korrigiertem Text
        """
        import asyncio
        return asyncio.run(self.correct_text(text))


async def test_openrouter_connection(api_key: str, model: str) -> dict:
    """
    Teste die Verbindung zu OpenRouter.

    Args:
        api_key: OpenRouter API-Key
        model: Modell-ID zum Testen

    Returns:
        Dict mit success, message
    """
    if not api_key:
        return {"success": False, "message": "Kein API-Key angegeben"}

    if not model:
        return {"success": False, "message": "Kein Modell ausgewaehlt"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/AbrechnungsaBot8000",
                    "X-Title": "AbrechnungsaBot8000"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "user", "content": "Antworte nur mit: OK"}
                    ],
                    "temperature": 0,
                    "max_tokens": 10
                }
            )

            if response.status_code == 200:
                return {"success": True, "message": f"Verbindung erfolgreich mit {model}"}
            elif response.status_code == 401:
                return {"success": False, "message": "Ungueltiger API-Key"}
            elif response.status_code == 402:
                return {"success": False, "message": "Nicht genuegend Guthaben bei OpenRouter"}
            elif response.status_code == 404:
                return {"success": False, "message": f"Modell '{model}' nicht gefunden"}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
                except Exception:
                    error_msg = f"HTTP {response.status_code}"
                return {"success": False, "message": error_msg}

    except httpx.TimeoutException:
        return {"success": False, "message": "Verbindungs-Timeout"}
    except httpx.RequestError as e:
        return {"success": False, "message": f"Verbindungsfehler: {str(e)}"}
    except Exception as e:
        return {"success": False, "message": f"Fehler: {str(e)}"}


# ============================================================================
# LLM-basierte Datenextraktion
# ============================================================================

# Liste der verfuegbaren Kostenkategorien fuer den Prompt
COST_CATEGORIES_LIST = ", ".join([c.value for c in CostCategory])

EXTRACTION_SYSTEM_PROMPT = f"""Du bist ein Experte fuer die Extraktion von Daten aus deutschen Rechnungen und Belegen.

Deine Aufgabe ist es, aus OCR-Text einer Rechnung folgende Informationen zu extrahieren:
- vendor_name: Name des Lieferanten/Unternehmens
- invoice_number: Rechnungsnummer
- invoice_date: Rechnungsdatum (Format: YYYY-MM-DD)
- total_amount: Gesamtbetrag in EUR (nur Zahl, z.B. 123.45)
- cost_category: Passende Kategorie aus: {COST_CATEGORIES_LIST}

Regeln:
1. Extrahiere NUR Informationen, die im Text vorhanden sind
2. Bei Unsicherheit: null zurueckgeben
3. Betraege: Deutsches Format (1.234,56) zu Dezimal (1234.56) konvertieren
4. Datum: Immer als YYYY-MM-DD formatieren
5. Kategorie: Waehle die passendste aus der Liste, im Zweifel SONSTIGE

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, keine Erklaerungen:
{{"vendor_name": "...", "invoice_number": "...", "invoice_date": "YYYY-MM-DD", "total_amount": 123.45, "cost_category": "..."}}"""

EXTRACTION_USER_PROMPT = """Extrahiere die Rechnungsdaten aus folgendem OCR-Text:

{text}

Antworte NUR mit dem JSON-Objekt."""


@dataclass
class ExtractionResult:
    """Ergebnis der LLM-Extraktion"""
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    cost_category: Optional[CostCategory] = None
    success: bool = False
    error_message: Optional[str] = None
    model_used: str = ""


class LLMExtractor:
    """LLM-basierte Rechnungsdaten-Extraktion via OpenRouter API"""

    def __init__(self, api_key: str, model: str):
        """
        Initialisiere den Extraktor.

        Args:
            api_key: OpenRouter API-Key
            model: Modell-ID (z.B. "anthropic/claude-3.5-sonnet")
        """
        self.api_key = api_key
        self.model = model
        self.timeout = 60.0

    async def extract_data(self, text: str) -> ExtractionResult:
        """
        Extrahiere Rechnungsdaten mittels LLM.

        Args:
            text: OCR-Rohtext zur Extraktion

        Returns:
            ExtractionResult mit extrahierten Daten
        """
        if not text or not text.strip():
            return ExtractionResult(
                success=False,
                error_message="Kein Text zur Extraktion",
                model_used=self.model
            )

        truncated = text[:MAX_INPUT_LENGTH] if len(text) > MAX_INPUT_LENGTH else text

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/AbrechnungsaBot8000",
                        "X-Title": "AbrechnungsaBot8000"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                            {"role": "user", "content": EXTRACTION_USER_PROMPT.format(text=truncated)}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500
                    }
                )

                if response.status_code != 200:
                    error_msg = f"OpenRouter API Fehler: {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data:
                            error_msg = f"{error_msg} - {error_data['error'].get('message', '')}"
                    except Exception:
                        pass

                    logger.error(error_msg)
                    return ExtractionResult(
                        success=False,
                        error_message=error_msg,
                        model_used=self.model
                    )

                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()

                # JSON aus der Antwort extrahieren
                return self._parse_response(content)

        except httpx.TimeoutException:
            error_msg = f"OpenRouter API Timeout nach {self.timeout}s"
            logger.error(error_msg)
            return ExtractionResult(success=False, error_message=error_msg, model_used=self.model)
        except httpx.RequestError as e:
            error_msg = f"OpenRouter API Verbindungsfehler: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(success=False, error_message=error_msg, model_used=self.model)
        except Exception as e:
            error_msg = f"Unerwarteter Fehler bei LLM-Extraktion: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(success=False, error_message=error_msg, model_used=self.model)

    def _parse_response(self, content: str) -> ExtractionResult:
        """Parse die LLM-Antwort und extrahiere die Daten"""
        try:
            # Versuche JSON zu extrahieren (auch wenn drumherum Text ist)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start == -1 or json_end == 0:
                return ExtractionResult(
                    success=False,
                    error_message="Kein JSON in LLM-Antwort gefunden",
                    model_used=self.model
                )

            json_str = content[json_start:json_end]
            parsed = json.loads(json_str)

            # Daten extrahieren und konvertieren
            result = ExtractionResult(success=True, model_used=self.model)

            # vendor_name
            if parsed.get("vendor_name"):
                result.vendor_name = str(parsed["vendor_name"]).strip()[:100]

            # invoice_number
            if parsed.get("invoice_number"):
                result.invoice_number = str(parsed["invoice_number"]).strip()

            # invoice_date
            if parsed.get("invoice_date"):
                try:
                    date_str = str(parsed["invoice_date"])
                    parts = date_str.split("-")
                    if len(parts) == 3:
                        result.invoice_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
                except (ValueError, IndexError):
                    pass

            # total_amount
            if parsed.get("total_amount") is not None:
                try:
                    amount = parsed["total_amount"]
                    if isinstance(amount, str):
                        # Konvertiere deutsches Format falls noetig
                        amount = amount.replace('.', '').replace(',', '.')
                    result.total_amount = Decimal(str(amount)).quantize(Decimal("0.01"))
                except (InvalidOperation, ValueError):
                    pass

            # cost_category
            if parsed.get("cost_category"):
                category_str = str(parsed["cost_category"]).upper()
                try:
                    result.cost_category = CostCategory(category_str)
                except ValueError:
                    result.cost_category = CostCategory.SONSTIGE

            logger.info(f"LLM-Extraktion erfolgreich mit {self.model}")
            return result

        except json.JSONDecodeError as e:
            error_msg = f"JSON-Parsing fehlgeschlagen: {e}"
            logger.error(error_msg)
            return ExtractionResult(
                success=False,
                error_message=error_msg,
                model_used=self.model
            )

    def extract_data_sync(self, text: str) -> ExtractionResult:
        """
        Synchrone Version der Datenextraktion.

        Args:
            text: OCR-Rohtext zur Extraktion

        Returns:
            ExtractionResult mit extrahierten Daten
        """
        import asyncio
        return asyncio.run(self.extract_data(text))
