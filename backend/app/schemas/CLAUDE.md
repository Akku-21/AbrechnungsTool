# Schemas Module

Pydantic validation schemas for API request/response bodies.

## Pattern

Each entity typically has:
- `{Entity}Base`: Common fields shared by create/update
- `{Entity}Create`: Fields for POST requests
- `{Entity}Update`: Optional fields for PATCH requests
- `{Entity}Response`: Fields returned in API responses

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import date

class InvoiceBase(BaseModel):
    vendor_name: str
    total_amount: Decimal
    cost_category: CostCategory

class InvoiceCreate(InvoiceBase):
    settlement_id: UUID
    document_id: Optional[UUID] = None

class InvoiceUpdate(BaseModel):
    vendor_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    # All fields optional for PATCH

class InvoiceResponse(InvoiceBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode
```

## Key Schemas

| File | Schemas |
|------|---------|
| `settlement.py` | Settlement CRUD + SettlementResult |
| `invoice.py` | Invoice CRUD + LineItem |
| `document.py` | Document CRUD + OCRResult |

## Validation

Use Pydantic validators for business rules:
```python
from pydantic import field_validator

class SettlementCreate(BaseModel):
    period_start: date
    period_end: date

    @field_validator('period_end')
    @classmethod
    def end_after_start(cls, v, info):
        if 'period_start' in info.data and v <= info.data['period_start']:
            raise ValueError('period_end must be after period_start')
        return v
```

## ORM Mode

For responses that map from SQLAlchemy models:
```python
class Config:
    from_attributes = True  # Pydantic v2
```

## Adding a New Schema

1. Create file or add to existing
2. Import in endpoint module
3. Use in FastAPI endpoint:
```python
@router.post("/", response_model=EntityResponse)
def create(data: EntityCreate, db: Session = Depends(get_db)):
    entity = Entity(**data.model_dump())
    db.add(entity)
    db.commit()
    return entity
```
