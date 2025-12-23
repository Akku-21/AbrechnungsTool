# API Module

REST API endpoints organized by version (v1).

## Structure

```
api/
└── v1/
    ├── router.py           # Aggregates all endpoint routers
    └── endpoints/
        ├── properties.py   # Property CRUD
        ├── units.py        # Unit CRUD
        ├── tenants.py      # Tenant CRUD
        ├── settlements.py  # Settlement management + calculate + PDF
        ├── documents.py    # Document upload + OCR
        ├── invoices.py     # Invoice CRUD
        ├── manual_entries.py
        └── settings.py     # App settings key-value store
```

## Endpoint Patterns

### Standard CRUD
```python
@router.get("/")           # List all
@router.post("/")          # Create
@router.get("/{id}")       # Get by ID
@router.patch("/{id}")     # Update
@router.delete("/{id}")    # Delete
```

### Settlement Special Endpoints
```python
POST /settlements/{id}/calculate  # Run cost calculation
POST /settlements/{id}/finalize   # Lock settlement
POST /settlements/{id}/copy       # Create correction copy
GET  /settlements/{id}/pdf        # Generate PDF
```

### Document Endpoints
```python
POST /documents/upload            # Upload file, triggers OCR
POST /documents/{id}/ocr          # Re-run OCR
GET  /documents/{id}/ocr/suggestions  # Get extracted data
```

## Adding a New Endpoint Module

1. Create `endpoints/new_entity.py`:
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

router = APIRouter()

@router.get("/")
def list_items(db: Session = Depends(get_db)):
    ...
```

2. Register in `router.py`:
```python
from app.api.v1.endpoints import new_entity
api_router.include_router(new_entity.router, prefix="/new-entities", tags=["new-entities"])
```

## Error Handling

Use FastAPI's HTTPException:
```python
from fastapi import HTTPException

if not item:
    raise HTTPException(status_code=404, detail="Item not found")
```

## File Uploads

```python
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    ...
```
