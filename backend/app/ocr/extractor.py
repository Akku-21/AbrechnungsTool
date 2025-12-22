"""
Extraktor für deutsche Rechnungsdaten aus OCR-Text
"""
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional
from dataclasses import dataclass, field

from app.models.enums import CostCategory


@dataclass
class ExtractedInvoiceData:
    """Extrahierte Rechnungsdaten"""
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    total_amount: Optional[Decimal] = None
    suggested_category: Optional[CostCategory] = None
    line_items: list = field(default_factory=list)


class InvoiceDataExtractor:
    """Extraktor für strukturierte Daten aus deutschem Rechnungstext"""

    # Patterns für deutsche Geldbeträge: 1.234,56 EUR oder 1.234,56 €
    AMOUNT_PATTERNS = [
        # Gesamtbetrag/Summe/Brutto Patterns
        r'(?:Gesamt|Summe|Brutto|Total|Endbetrag|Rechnungsbetrag)[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)?',
        # Euro-Beträge mit Währungssymbol
        r'(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)',
        # Zu zahlender Betrag
        r'[Zz]u\s*zahlen[:\s]*(\d{1,3}(?:\.\d{3})*,\d{2})',
    ]

    # Patterns für deutsche Datumsformate
    DATE_PATTERNS = [
        (r'(\d{2})\.(\d{2})\.(\d{4})', '%d.%m.%Y'),  # DD.MM.YYYY
        (r'(\d{2})/(\d{2})/(\d{4})', '%d/%m/%Y'),     # DD/MM/YYYY
        (r'(\d{2})-(\d{2})-(\d{4})', '%d-%m-%Y'),     # DD-MM-YYYY
    ]

    # Patterns für Rechnungsnummern
    INVOICE_NUMBER_PATTERNS = [
        r'(?:Rechnungs?(?:nummer|nr\.?)|Re\.?-?Nr\.?|Beleg-?Nr\.?)[:\s]*([A-Z0-9\-/]+)',
        r'(?:Invoice|Inv\.?)\s*(?:No\.?|Nr\.?)?[:\s]*([A-Z0-9\-/]+)',
    ]

    # Keywords für Kostenkategorien
    CATEGORY_KEYWORDS: dict[CostCategory, list[str]] = {
        CostCategory.WASSERVERSORGUNG: [
            'Stadtwerke', 'Wasserwerk', 'Wasser', 'Trinkwasser', 'Wasserversorgung'
        ],
        CostCategory.ENTWAESSERUNG: [
            'Abwasser', 'Kanal', 'Entwässerung', 'Schmutzwasser'
        ],
        CostCategory.HEIZUNG: [
            'Heizöl', 'Gas', 'Fernwärme', 'Heizung', 'Brennstoff', 'Wärme'
        ],
        CostCategory.WARMWASSER: [
            'Warmwasser', 'Boiler'
        ],
        CostCategory.STRASSENREINIGUNG: [
            'Stadtreinigung', 'Müll', 'Abfall', 'Entsorgung', 'AWB', 'BSR',
            'Müllabfuhr', 'Restmüll', 'Wertstoff'
        ],
        CostCategory.VERSICHERUNG: [
            'Versicherung', 'Haftpflicht', 'Gebäudeversicherung', 'Wohngebäude',
            'Allianz', 'HUK', 'Ergo'
        ],
        CostCategory.HAUSWART: [
            'Hausmeister', 'Facility', 'Gebäudemanagement', 'Hauswart'
        ],
        CostCategory.GARTENPFLEGE: [
            'Garten', 'Grünpflege', 'Landschaftspflege', 'Rasen'
        ],
        CostCategory.GEBAEUDEREINIGUNG: [
            'Reinigung', 'Treppenhausreinigung', 'Gebäudereinigung'
        ],
        CostCategory.AUFZUG: [
            'Aufzug', 'Fahrstuhl', 'Lift', 'Elevator'
        ],
        CostCategory.SCHORNSTEINREINIGUNG: [
            'Schornstein', 'Kamin', 'Bezirksschornsteinfeger', 'Feuerstätten'
        ],
        CostCategory.GRUNDSTEUER: [
            'Grundsteuer', 'Finanzamt', 'Steuerbescheid'
        ],
        CostCategory.BELEUCHTUNG: [
            'Beleuchtung', 'Strom', 'Allgemeinstrom', 'Hausbeleuchtung'
        ],
        CostCategory.ANTENNE_KABEL: [
            'Kabel', 'Antenne', 'Kabelanschluss', 'TV', 'Telekom', 'Vodafone'
        ],
    }

    def extract(self, text: str) -> ExtractedInvoiceData:
        """Extrahiere strukturierte Daten aus OCR-Text"""
        return ExtractedInvoiceData(
            vendor_name=self._extract_vendor_name(text),
            invoice_number=self._extract_invoice_number(text),
            invoice_date=self._extract_date(text),
            total_amount=self._extract_total_amount(text),
            suggested_category=self._suggest_category(text)
        )

    def _extract_total_amount(self, text: str) -> Optional[Decimal]:
        """Extrahiere den Gesamtbetrag"""
        amounts = []

        for pattern in self.AMOUNT_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    # Deutsches Zahlenformat in Decimal konvertieren
                    amount_str = match.replace('.', '').replace(',', '.')
                    amount = Decimal(amount_str)
                    if amount > 0:
                        amounts.append(amount)
                except (InvalidOperation, ValueError):
                    continue

        # Den größten Betrag zurückgeben (normalerweise der Gesamtbetrag)
        return max(amounts) if amounts else None

    def _extract_date(self, text: str) -> Optional[date]:
        """Extrahiere das Rechnungsdatum"""
        # Suche nach Datum in der Nähe von "Rechnungsdatum", "Datum", etc.
        date_context_pattern = r'(?:Rechnungs?datum|Datum|Date)[:\s]*(\d{2}[\./-]\d{2}[\./-]\d{4})'
        match = re.search(date_context_pattern, text, re.IGNORECASE)

        if match:
            date_str = match.group(1)
        else:
            # Fallback: Erstes Datum im Text finden
            for pattern, _ in self.DATE_PATTERNS:
                match = re.search(pattern, text)
                if match:
                    date_str = match.group(0)
                    break
            else:
                return None

        # Datum parsen
        for pattern, _ in self.DATE_PATTERNS:
            match = re.match(pattern, date_str)
            if match:
                day, month, year = match.groups()
                try:
                    return date(int(year), int(month), int(day))
                except ValueError:
                    continue

        return None

    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extrahiere die Rechnungsnummer"""
        for pattern in self.INVOICE_NUMBER_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_vendor_name(self, text: str) -> Optional[str]:
        """Extrahiere den Lieferantennamen (erste Zeile oder nach bestimmten Patterns)"""
        lines = text.strip().split('\n')

        # Erste nicht-leere Zeile als Firmenname nehmen
        for line in lines[:5]:  # Nur erste 5 Zeilen prüfen
            line = line.strip()
            if line and len(line) > 3:
                # Prüfen ob es wie ein Firmenname aussieht
                if not re.match(r'^\d', line) and not any(
                    keyword in line.lower()
                    for keyword in ['rechnung', 'datum', 'seite', 'nr']
                ):
                    return line[:100]  # Max 100 Zeichen

        return None

    def _suggest_category(self, text: str) -> Optional[CostCategory]:
        """Schlage eine Kostenkategorie basierend auf Keywords vor"""
        text_lower = text.lower()

        # Zähle Treffer pro Kategorie
        category_scores: dict[CostCategory, int] = {}

        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    score += 1
            if score > 0:
                category_scores[category] = score

        # Kategorie mit höchstem Score zurückgeben
        if category_scores:
            return max(category_scores, key=category_scores.get)

        return CostCategory.SONSTIGE
