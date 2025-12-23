# PDF Module

Settlement PDF generation with WeasyPrint and Jinja2.

## Components

### PDFGenerator (`generator.py`)

Main PDF generation class.

```python
from app.pdf.generator import PDFGenerator

generator = PDFGenerator(db)
pdf_bytes = generator.generate_settlement_pdf(settlement_id)
```

**Features:**
- Jinja2 HTML templating
- WeasyPrint CSS-based rendering
- German number/date formatting
- Optional digital signature (pyHanko)
- Attachment merging (invoice documents)

### Template (`templates/settlement.html`)

Jinja2 HTML template for settlement PDF.

**Sections:**
1. Header (landlord info, property address)
2. Settlement period
3. Invoice overview table
4. Cost breakdown per unit/tenant
5. Summary box (balance, new prepayment)
6. Legal notice (§556 BGB)

### Styles (`templates/styles.css`)

WeasyPrint-compatible CSS for print layout.

## Custom Jinja2 Filters

```python
# Currency: 1234.56 → "1.234,56 EUR"
{{ amount | euro }}

# Date: 2024-01-15 → "15.01.2024"
{{ date | german_date }}

# Percentage: 0.25 → "25,00 %"
{{ value | percentage }}

# Area: 45.5 → "45,50 m²"
{{ area | area }}

# Round up to even: 125.15 → "126,00"
{{ amount | round_up_even }}
```

## PDF Structure

```
Page 1-N: Settlement report (rendered from HTML)
Page N+1...: Attached invoice documents (if include_in_export=True)
```

## Attachment Handling

```python
# Merges PDFs and images
# - PDFs: Direct append
# - Images: Convert to A4 PDF pages via img2pdf
```

## Digital Signature

When `SIGNING_CERT_PATH` is configured:
```python
from app.services.signing_service import SigningService

signer = SigningService()
signed_pdf = signer.sign_pdf(pdf_bytes, reason="Nebenkostenabrechnung")
```

## Modifying the Template

1. Edit `templates/settlement.html`
2. Test locally: Generate PDF via API endpoint
3. Check print preview for pagination

### Adding New Data to Template

1. Pass data in `generator.py`:
```python
context = {
    "settlement": settlement,
    "new_field": calculate_new_field(),
}
```

2. Use in template:
```html
<p>{{ new_field | euro }}</p>
```

## Common Issues

### Fonts
WeasyPrint needs system fonts. In Docker, ensure fonts are installed:
```dockerfile
RUN apt-get install -y fonts-liberation
```

### Page Breaks
```css
.section { page-break-inside: avoid; }
.new-page { page-break-before: always; }
```

### Long Tables
```css
table { table-layout: fixed; }
td { overflow: hidden; text-overflow: ellipsis; }
```
