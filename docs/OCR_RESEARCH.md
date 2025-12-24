# OCR Research & Verbesserungsoptionen

Stand: Dezember 2025

## Aktuelle Situation

- **Engine**: Tesseract mit deutscher Sprachunterstützung
- **Durchschnittliche Konfidenz**: ~83%
- **Problem**: Preprocessing-Versuche haben Ergebnisse verschlechtert

## OCR-Engines im Vergleich

### Tesseract (aktuell verwendet)
- **Genauigkeit**: ~85%
- **Vorteile**: Etabliert, CPU-basiert, gute deutsche Unterstützung
- **Nachteile**: Schwächen bei komplexen Layouts, Handschrift, Tabellen
- **Quelle**: [Modal Blog](https://modal.com/blog/8-top-open-source-ocr-models-compared)

### PaddleOCR
- **Genauigkeit**: ~92%
- **Vorteile**: Beste Präzision in Tests, schnell, 80+ Sprachen
- **Nachteile**: Größere Dependencies (PaddlePaddle Framework)
- **Quelle**: [Koncile Analysis](https://www.koncile.ai/en/ressources/paddleocr-analyse-avantages-alternatives-open-source)

### EasyOCR
- **Genauigkeit**: ~88%
- **Vorteile**: Einfache Integration, PyTorch-basiert, 80+ Sprachen
- **Nachteile**: Weniger Anpassungsoptionen
- **Quelle**: [Plugger.ai Comparison](https://www.plugger.ai/blog/comparison-of-paddle-ocr-easyocr-kerasocr-and-tesseract-ocr)

### docTR (Mindee)
- **Genauigkeit**: ~90%
- **Vorteile**: Optimiert für Dokumente/Rechnungen, 3 Zeilen Code, PyTorch & TensorFlow
- **Nachteile**: Weniger Sprachen als andere
- **Ideal für**: Rechnungen, Formulare, Belege
- **Quelle**: [Unstract Blog](https://unstract.com/blog/best-opensource-ocr-tools-in-2025/)

### Surya
- **Genauigkeit**: ~91%
- **Vorteile**: Übertrifft Tesseract in Geschwindigkeit und Genauigkeit, 90+ Sprachen
- **Nachteile**: Relativ neu
- **Quelle**: [KDnuggets](https://www.kdnuggets.com/10-awesome-ocr-models-for-2025)

## LLM-basierte Post-Korrektur

### Forschungsergebnisse

#### ACM Symposium 2024
- GPT-Modelle (3.5-turbo, 4, 4-turbo) für OCR-Korrektur getestet
- **Beste Verbesserung**: 38.83% CER-Reduktion
- Temperatur-Parameter beeinflusst Ergebnisse
- Modelle neigen zu Überkorrektur bei bereits gutem OCR
- **Quelle**: [ACM Digital Library](https://dl.acm.org/doi/10.1145/3685650.3685669)

#### Multimodal LLMs (2025)
- **Gemini 2.0 Flash**: 0.84% CER (nahezu perfekt)
- **GPT-4o**: Sehr gute Ergebnisse, leicht hinter Gemini
- **Claude**: Übertrifft traditionelle OCR bei Handschrift
- **Quelle**: [arXiv](https://arxiv.org/html/2504.00414)

### Ansätze

1. **Post-Processing**: OCR-Rohtext → LLM korrigiert Fehler
2. **Direct Vision**: Bild direkt an multimodales LLM (kein OCR nötig)
3. **Hybrid**: OCR + LLM-Verifikation für kritische Felder

## Empfehlung für AbrechnungsaBot8000

### Gewählte Strategie: docTR + LLM-Korrektur

**Warum docTR?**
- Speziell für Dokumentenverarbeitung optimiert
- Gute Balance aus Genauigkeit und Geschwindigkeit
- Einfache Integration (Python)
- Ideal für Rechnungen und Belege

**Warum LLM-Korrektur?**
- Kann OCR-Fehler kontextbasiert korrigieren
- Versteht deutsche Rechnungsterminologie
- Optional aktivierbar (nur mit API-Key)

### Implementierungsplan

1. **docTR Integration**
   - `python-doctr` als Dependency
   - Neuer `DocTRProcessor` als Alternative zu `OCRProcessor`
   - Fallback auf Tesseract wenn docTR fehlschlägt

2. **LLM-Korrektur Service**
   - OpenRouter API Integration
   - Konfigurierbar in Einstellungen (API-Key, Model)
   - Optional: Nur wenn aktiviert
   - Prompt für deutsche Rechnungskorrektur

3. **Empfohlene Modelle** (via OpenRouter)
   - `anthropic/claude-3.5-sonnet` - Beste Qualität
   - `google/gemini-flash-1.5` - Schnell & günstig
   - `meta-llama/llama-3.1-70b-instruct` - Open-Source Alternative

### Kosten-Schätzung (OpenRouter)

| Modell | Input/1M Token | Output/1M Token | Pro Rechnung (~500 Token) |
|--------|----------------|-----------------|---------------------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | ~$0.009 |
| Gemini Flash 1.5 | $0.075 | $0.30 | ~$0.0002 |
| Llama 3.1 70B | $0.52 | $0.75 | ~$0.0006 |

## Offene Fragen

- [ ] Soll docTR Tesseract komplett ersetzen oder als Alternative?
- [ ] Soll LLM auch für Kategorisierung verwendet werden?
- [ ] Caching von LLM-Korrekturen für identische Dokumente?

## Quellen

- [Modal: 8 Top Open-Source OCR Models](https://modal.com/blog/8-top-open-source-ocr-models-compared)
- [Medium: OCR Comparison](https://toon-beerten.medium.com/ocr-comparison-tesseract-versus-easyocr-vs-paddleocr-vs-mmocr-a362d9c79e66)
- [ACM: Post-OCR with GPT](https://dl.acm.org/doi/10.1145/3685650.3685669)
- [arXiv: Multimodal LLMs for OCR](https://arxiv.org/html/2504.00414)
- [OmniAI OCR Benchmark](https://getomni.ai/blog/ocr-benchmark)
