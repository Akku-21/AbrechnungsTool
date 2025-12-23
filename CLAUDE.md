# AbrechnungsaBot8000 - Nebenkostenabrechnung

<!-- SYNC: Keep README.md in sync when making major changes to:
     - Tech stack, project structure, or architecture
     - Settlement workflow or cost allocation methods
     - Environment variables or configuration
     - Quick start instructions or deployment
-->

German rental property expense settlement system (Betriebskostenabrechnung) for landlords.

## Tech Stack

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0, PostgreSQL 16
- **Frontend**: Next.js 15, React 19, TanStack Query, Tailwind CSS
- **OCR**: Tesseract (German), pdf2image, OpenCV
- **PDF**: WeasyPrint, Jinja2, pyHanko (digital signatures)
- **Deployment**: Docker Compose

## Quick Start

```bash
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1
- Database: PostgreSQL on port 5433

## Project Structure

```
├── backend/          # FastAPI application
│   ├── app/          # Main application code
│   │   ├── api/      # REST API endpoints
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic validation schemas
│   │   ├── services/ # Business logic (calculation, signing)
│   │   ├── ocr/      # OCR processing
│   │   └── pdf/      # PDF generation
│   └── alembic/      # Database migrations
├── frontend/         # Next.js application
│   └── src/
│       ├── app/      # App Router pages
│       ├── components/
│       ├── hooks/    # React Query hooks
│       ├── lib/      # API client & utilities
│       └── types/    # TypeScript interfaces
└── docker-compose.yml
```

## Key Domain Concepts

- **Liegenschaft (Property)**: Rental property with address and total area
- **Wohneinheit (Unit)**: Individual rental unit within a property
- **Mieter (Tenant)**: Tenant with move dates and monthly prepayment
- **Abrechnung (Settlement)**: Annual expense settlement for a period
- **Rechnung (Invoice)**: Expense invoice with cost category
- **BetrKV**: German operating cost regulation (17 cost categories)

## Settlement Workflow

1. Create settlement with date range
2. Upload invoice documents (PDF/images)
3. OCR extracts vendor, amount, date, category
4. User verifies/edits extracted data
5. Calculate costs (allocates by unit area)
6. Finalize settlement (locks it)
7. Export PDF with optional digital signature

## Cost Allocation Methods

- `WOHNFLAECHE`: By unit area (m²) - default
- `PERSONENZAHL`: By resident count
- `EINHEIT`: Equal per unit
- `VERBRAUCH`: By consumption (meter values)
- `MITEIGENTUMSANTEIL`: Custom percentage

## German Formatting

- Dates: DD.MM.YYYY
- Currency: 1.234,56 EUR
- Decimal separator: comma
- Thousands separator: period

## Environment Variables

Backend (`.env`):
```
DATABASE_URL=postgresql://user:pass@db:5432/nebenkosten_db
UPLOAD_DIR=/app/uploads
CORS_ORIGINS=http://localhost:3000
SIGNING_CERT_PATH=/app/certs/settlement.p12  # optional
SIGNING_CERT_PASSWORD=secret                  # optional
```

Frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Database Migrations

```bash
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic revision --autogenerate -m "description"
```

## Common Tasks

### Adding a new cost category
1. Add to `backend/app/models/enums.py` CostCategory enum
2. Add German keywords to `backend/app/ocr/extractor.py` for auto-detection
3. Update frontend `types/index.ts` CostCategory type

### Adding a new API endpoint
1. Create endpoint in `backend/app/api/v1/endpoints/`
2. Add router to `backend/app/api/v1/router.py`
3. Create frontend API function in `frontend/src/lib/api/`
4. Create React Query hook in `frontend/src/hooks/`
