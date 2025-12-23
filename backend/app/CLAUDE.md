# Backend App Module

Main FastAPI application code.

## Entry Points

- `main.py`: FastAPI app initialization, CORS setup, router mounting
- `config.py`: Pydantic Settings for environment configuration

## Module Overview

| Module | Purpose |
|--------|---------|
| `api/` | REST API endpoints (v1) |
| `models/` | SQLAlchemy ORM models |
| `schemas/` | Pydantic request/response schemas |
| `services/` | Business logic (calculation, signing) |
| `ocr/` | OCR processing with Tesseract |
| `pdf/` | PDF generation with WeasyPrint |
| `db/` | Database session and base model |

## Adding New Features

1. **New Entity**: model → schema → endpoint → service (if complex logic)
2. **New Business Logic**: Add to `services/` or create new service
3. **New Integration**: Create new module under `app/`

## Import Patterns

```python
# Models
from app.models import Property, Unit, Settlement

# Schemas
from app.schemas.settlement import SettlementCreate, SettlementResponse

# Database session
from app.db.session import get_db

# Services
from app.services.calculation_service import CalculationService
```

## Database Access Pattern

All endpoints use dependency injection for database sessions:

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

@router.get("/items")
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).all()
```
