# Services Module

Business logic services separated from API endpoints.

## Services Overview

### CalculationService (`calculation_service.py`)

Core settlement calculation engine.

**Main Method:**
```python
def calculate_settlement(settlement_id: UUID, db: Session) -> List[SettlementResult]
```

**Calculation Logic:**
1. Aggregate invoices by CostCategory
2. Apply invoice-level allocation percentages
3. For each unit:
   - Find active tenant in settlement period
   - Calculate occupancy days (handle move-in/out)
   - Apply unit allocation (area-based default)
   - Calculate prepayments (months × monthly_prepayment)
   - Compute balance (positive = Nachzahlung, negative = Guthaben)
4. Store SettlementResult + SettlementCostBreakdown records

**Cost Allocation Formula:**
```
unit_cost = (invoice_total × invoice_allocation_pct)
          × (unit_area / property_area)
          × (occupancy_days / total_days)
```

### SigningService (`signing_service.py`)

PDF digital signature with pyHanko.

```python
def sign_pdf(
    pdf_bytes: bytes,
    reason: str = "Nebenkostenabrechnung",
    location: str = "Deutschland",
    field_name: str = "Signature"
) -> bytes
```

**Requirements:**
- PKCS#12 certificate file (.p12/.pfx)
- Set `SIGNING_CERT_PATH` and `SIGNING_CERT_PASSWORD` in config

## Service Patterns

### Dependency Injection
```python
from app.services.calculation_service import CalculationService

@router.post("/{id}/calculate")
def calculate(id: UUID, db: Session = Depends(get_db)):
    service = CalculationService(db)
    results = service.calculate_settlement(id)
    return results
```

### Transaction Handling
Services receive `db: Session` and let endpoints handle commits:
```python
# In service
def create_something(self, data: dict) -> Entity:
    entity = Entity(**data)
    self.db.add(entity)
    self.db.flush()  # Get ID without committing
    return entity

# In endpoint
result = service.create_something(data)
db.commit()
```

## Adding a New Service

1. Create `services/new_service.py`:
```python
from sqlalchemy.orm import Session

class NewService:
    def __init__(self, db: Session):
        self.db = db

    def do_something(self, param: str) -> Result:
        # Business logic here
        ...
```

2. Use in endpoint:
```python
from app.services.new_service import NewService

@router.post("/action")
def action(db: Session = Depends(get_db)):
    service = NewService(db)
    return service.do_something("param")
```
