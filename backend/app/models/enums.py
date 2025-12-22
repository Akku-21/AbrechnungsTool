import enum


class CostCategory(str, enum.Enum):
    """Betriebskostenarten gemäß BetrKV §2"""
    GRUNDSTEUER = "GRUNDSTEUER"  # 1. Grundsteuer
    WASSERVERSORGUNG = "WASSERVERSORGUNG"  # 2. Wasserversorgung
    ENTWAESSERUNG = "ENTWAESSERUNG"  # 3. Entwässerung
    HEIZUNG = "HEIZUNG"  # 4. Heizkosten
    WARMWASSER = "WARMWASSER"  # 5. Warmwasser
    VERBUNDENE_ANLAGEN = "VERBUNDENE_ANLAGEN"  # 6. Verbundene Anlagen
    AUFZUG = "AUFZUG"  # 7. Aufzug
    STRASSENREINIGUNG = "STRASSENREINIGUNG"  # 8. Straßenreinigung/Müll
    GEBAEUDEREINIGUNG = "GEBAEUDEREINIGUNG"  # 9. Gebäudereinigung
    GARTENPFLEGE = "GARTENPFLEGE"  # 10. Gartenpflege
    BELEUCHTUNG = "BELEUCHTUNG"  # 11. Beleuchtung
    SCHORNSTEINREINIGUNG = "SCHORNSTEINREINIGUNG"  # 12. Schornsteinreinigung
    VERSICHERUNG = "VERSICHERUNG"  # 13. Versicherungen
    HAUSWART = "HAUSWART"  # 14. Hauswart
    ANTENNE_KABEL = "ANTENNE_KABEL"  # 15. Antenne/Kabel
    WAESCHEPFLEGE = "WAESCHEPFLEGE"  # 16. Wäschepflege
    SONSTIGE = "SONSTIGE"  # 17. Sonstige


COST_CATEGORY_LABELS = {
    CostCategory.GRUNDSTEUER: "Grundsteuer (§2 Nr. 1 BetrKV)",
    CostCategory.WASSERVERSORGUNG: "Wasserversorgung (§2 Nr. 2 BetrKV)",
    CostCategory.ENTWAESSERUNG: "Entwässerung (§2 Nr. 3 BetrKV)",
    CostCategory.HEIZUNG: "Heizkosten (§2 Nr. 4 BetrKV)",
    CostCategory.WARMWASSER: "Warmwasserversorgung (§2 Nr. 5 BetrKV)",
    CostCategory.VERBUNDENE_ANLAGEN: "Verbundene Anlagen (§2 Nr. 6 BetrKV)",
    CostCategory.AUFZUG: "Aufzug (§2 Nr. 7 BetrKV)",
    CostCategory.STRASSENREINIGUNG: "Straßenreinigung/Müllbeseitigung (§2 Nr. 8 BetrKV)",
    CostCategory.GEBAEUDEREINIGUNG: "Gebäudereinigung (§2 Nr. 9 BetrKV)",
    CostCategory.GARTENPFLEGE: "Gartenpflege (§2 Nr. 10 BetrKV)",
    CostCategory.BELEUCHTUNG: "Beleuchtung (§2 Nr. 11 BetrKV)",
    CostCategory.SCHORNSTEINREINIGUNG: "Schornsteinreinigung (§2 Nr. 12 BetrKV)",
    CostCategory.VERSICHERUNG: "Versicherungen (§2 Nr. 13 BetrKV)",
    CostCategory.HAUSWART: "Hauswart (§2 Nr. 14 BetrKV)",
    CostCategory.ANTENNE_KABEL: "Antenne/Kabel (§2 Nr. 15 BetrKV)",
    CostCategory.WAESCHEPFLEGE: "Wäschepflege (§2 Nr. 16 BetrKV)",
    CostCategory.SONSTIGE: "Sonstige Betriebskosten (§2 Nr. 17 BetrKV)",
}


class AllocationMethod(str, enum.Enum):
    """Verteilerschlüssel"""
    WOHNFLAECHE = "WOHNFLAECHE"  # Nach Wohnfläche (m²)
    PERSONENZAHL = "PERSONENZAHL"  # Nach Personenzahl
    EINHEIT = "EINHEIT"  # Gleich pro Einheit
    VERBRAUCH = "VERBRAUCH"  # Nach Verbrauch
    MITEIGENTUMSANTEIL = "MITEIGENTUMSANTEIL"  # Nach Miteigentumsanteil


ALLOCATION_METHOD_LABELS = {
    AllocationMethod.WOHNFLAECHE: "Nach Wohnfläche (m²)",
    AllocationMethod.PERSONENZAHL: "Nach Personenzahl",
    AllocationMethod.EINHEIT: "Gleich pro Einheit",
    AllocationMethod.VERBRAUCH: "Nach Verbrauch",
    AllocationMethod.MITEIGENTUMSANTEIL: "Nach Miteigentumsanteil",
}


class DocumentStatus(str, enum.Enum):
    """Status eines hochgeladenen Dokuments"""
    PENDING = "PENDING"  # Hochgeladen, wartet auf OCR
    PROCESSING = "PROCESSING"  # OCR läuft
    PROCESSED = "PROCESSED"  # OCR abgeschlossen
    FAILED = "FAILED"  # OCR fehlgeschlagen
    VERIFIED = "VERIFIED"  # Manuell verifiziert


class SettlementStatus(str, enum.Enum):
    """Status einer Abrechnung"""
    DRAFT = "DRAFT"  # In Bearbeitung
    CALCULATED = "CALCULATED"  # Berechnung durchgeführt
    FINALIZED = "FINALIZED"  # Abgeschlossen
    EXPORTED = "EXPORTED"  # PDF exportiert
