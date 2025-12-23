# OCR Module

Tesseract-based OCR for German invoice processing.

## Components

### OCRProcessor (`processor.py`)

Main OCR processing engine.

```python
processor = OCRProcessor()
result = processor.process_file("/path/to/invoice.pdf")
# Returns: OCRResult(raw_text, confidence, extracted_data)
```

**Supported Formats:**
- PDF (converted via pdf2image/poppler)
- Images: PNG, JPG, JPEG

**Tesseract Configuration:**
- Language: German (`-l deu`)
- Page segmentation: `--psm 6` (uniform block of text)
- Output: Raw text + confidence score

### InvoiceDataExtractor (`extractor.py`)

German invoice data extraction via regex patterns.

**Extracted Fields:**
- `vendor_name`: First significant line of text
- `invoice_number`: Patterns like "Re.-Nr.", "Rechnungsnummer", etc.
- `invoice_date`: German date formats (DD.MM.YYYY, DD/MM/YYYY)
- `total_amount`: German currency format (1.234,56 EUR)
- `cost_category`: Keyword-based detection

**Cost Category Keywords:**
```python
HEIZUNG: ["heizöl", "gas", "fernwärme", "heizung"]
WASSERVERSORGUNG: ["wasserwerk", "stadtwerke", "wasser"]
VERSICHERUNG: ["versicherung", "police", "beitrag"]
STRASSENREINIGUNG: ["müll", "awb", "bsr", "abfall"]
# ... etc
```

## Usage in API

```python
# In documents.py endpoint
from app.ocr.processor import OCRProcessor
from app.ocr.extractor import InvoiceDataExtractor

processor = OCRProcessor()
extractor = InvoiceDataExtractor()

# Process uploaded file
ocr_result = processor.process_bytes(file_content, filename)
extracted = extractor.extract(ocr_result.raw_text)

# extracted contains:
# - vendor_name
# - invoice_number
# - invoice_date
# - total_amount
# - cost_category (suggested)
```

## Improving OCR Accuracy

### Adding New Cost Category Keywords
Edit `extractor.py`:
```python
CATEGORY_KEYWORDS = {
    CostCategory.NEW_CATEGORY: ["keyword1", "keyword2"],
    ...
}
```

### Debugging OCR
```bash
# Test Tesseract directly
docker-compose exec backend tesseract /path/to/file.pdf output -l deu

# In Python
from app.ocr.processor import OCRProcessor
processor = OCRProcessor()
result = processor.process_file("/app/uploads/test.pdf")
print(result.raw_text)
print(f"Confidence: {result.confidence}")
```

### Common Issues

1. **Low confidence**: Check image quality, try preprocessing
2. **Wrong category**: Add keywords to `CATEGORY_KEYWORDS`
3. **Date parsing fails**: Add format to `DATE_PATTERNS`
4. **Amount parsing fails**: Check for unusual German formats

## Dependencies

- `pytesseract`: Python Tesseract wrapper
- `pdf2image`: PDF to image conversion (requires poppler)
- `Pillow`: Image processing
- `opencv-python-headless`: Image preprocessing (optional)
