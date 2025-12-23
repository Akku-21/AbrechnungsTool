# AbrechnungsaBot8000

**German rental property expense settlement system (Betriebskostenabrechnung) for landlords.**

A web application to manage operating cost settlements for rental properties according to German BetrKV regulations. Upload invoices, let OCR extract the data, calculate tenant shares, and generate professional PDF settlements.

## Features

- **Property Management**: Manage multiple rental properties (Liegenschaften) with units (Wohneinheiten)
- **Tenant Tracking**: Track tenants with move-in/out dates and monthly prepayments
- **Document OCR**: Upload invoices (PDF/images) with automatic text extraction
- **Smart Categorization**: Auto-detect cost categories from German invoice text
- **Cost Calculation**: Allocate costs by area (Wohnflächenanteil) or other methods
- **PDF Export**: Generate professional settlement documents with internal links to attachments
- **Digital Signatures**: Optional PAdES signature support via pyHanko
- **BetrKV Compliant**: Supports all 17 operating cost categories per German law

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 15, React 19, TanStack Query, Tailwind CSS |
| OCR | Tesseract (German), pdf2image, OpenCV |
| PDF | WeasyPrint, Jinja2, pyHanko |
| Deployment | Docker Compose |

## Quick Start

```bash
# Clone and start
git clone <repository-url>
cd AbrechnungsaBot8000
docker-compose up -d
```

Access the application:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/v1
- **Database**: PostgreSQL on port 5433

## Project Structure

```
AbrechnungsaBot8000/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # REST API endpoints
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── services/     # Business logic (calculation, signing)
│   │   ├── ocr/          # OCR processing
│   │   └── pdf/          # PDF generation with templates
│   └── alembic/          # Database migrations
├── frontend/             # Next.js application
│   └── src/
│       ├── app/          # App Router pages
│       ├── components/   # React components
│       ├── hooks/        # React Query hooks
│       ├── lib/          # API client & utilities
│       └── types/        # TypeScript interfaces
├── docker-compose.yml
└── README.md
```

## Settlement Workflow

1. **Create Settlement** - Define the settlement period (typically one year)
2. **Upload Documents** - Add invoice PDFs or images
3. **OCR Processing** - System extracts vendor, amount, date, and category
4. **Review & Edit** - Verify or correct extracted invoice data
5. **Calculate** - Allocate costs to units based on area
6. **Finalize** - Lock the settlement (creates immutable record)
7. **Export PDF** - Generate professional document with attachments

## Cost Allocation Methods

| Method | German | Description |
|--------|--------|-------------|
| `WOHNFLAECHE` | Wohnfläche | By unit area in m² (default) |
| `PERSONENZAHL` | Personenzahl | By number of residents |
| `EINHEIT` | Einheit | Equal share per unit |
| `VERBRAUCH` | Verbrauch | By metered consumption |
| `MITEIGENTUMSANTEIL` | Miteigentumsanteil | Custom percentage |

## Configuration

### Environment Variables

**Backend** (configure in `docker-compose.yml` or `.env`):

```env
DATABASE_URL=postgresql://user:pass@db:5432/nebenkosten_db
UPLOAD_DIR=/app/uploads
CORS_ORIGINS=http://localhost:3000

# Optional: Digital signature
SIGNING_CERT_PATH=/app/certs/settlement.p12
SIGNING_CERT_PASSWORD=your-password
```

**Frontend**:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Digital Signatures (Optional)

To enable PDF signing:

```bash
# Generate a self-signed certificate for development
docker-compose exec backend python scripts/create_cert.py

# Or provide your own PKCS#12 certificate
# Set SIGNING_CERT_PATH and SIGNING_CERT_PASSWORD
```

## Development

### Database Migrations

```bash
# Apply migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Running Tests

```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test
```

## German Formatting

The application uses German locale formatting throughout:

- **Dates**: DD.MM.YYYY (e.g., 31.12.2024)
- **Currency**: 1.234,56 EUR
- **Decimal separator**: Comma (,)
- **Thousands separator**: Period (.)

## Key Domain Concepts

| German Term | English | Description |
|-------------|---------|-------------|
| Liegenschaft | Property | Rental property with address and total area |
| Wohneinheit | Unit | Individual rental unit within a property |
| Mieter | Tenant | Tenant with lease dates and prepayment amount |
| Abrechnung | Settlement | Annual expense settlement document |
| Rechnung | Invoice | Expense invoice with cost category |
| Vorauszahlung | Prepayment | Monthly advance payment by tenant |
| BetrKV | Operating Cost Regulation | German law defining 17 allocable cost types |

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
