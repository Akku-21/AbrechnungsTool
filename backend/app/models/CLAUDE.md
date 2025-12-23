# Models Module

SQLAlchemy ORM models for PostgreSQL database.

## Entity Relationships

```
Property (Liegenschaft)
├── units: Unit[]           # 1:N
└── settlements: Settlement[]  # 1:N

Unit (Wohneinheit)
├── property: Property      # N:1
├── tenants: Tenant[]       # 1:N
└── allocations: UnitAllocation[]  # 1:N

Tenant (Mieter)
├── unit: Unit              # N:1
└── addresses: TenantAddress[]  # 1:N (forwarding addresses)

Settlement (Abrechnung)
├── property: Property      # N:1
├── documents: Document[]   # 1:N
├── invoices: Invoice[]     # 1:N
├── manual_entries: ManualEntry[]  # 1:N
└── results: SettlementResult[]    # 1:N

Invoice (Rechnung)
├── settlement: Settlement  # N:1
├── document: Document      # N:1 (optional, OCR source)
└── line_items: LineItem[]  # 1:N

SettlementResult
├── settlement: Settlement  # N:1
├── unit: Unit              # N:1
├── tenant: Tenant          # N:1
└── cost_breakdowns: SettlementCostBreakdown[]  # 1:N
```

## Key Models

| Model | German | Description |
|-------|--------|-------------|
| Property | Liegenschaft | Rental property with address |
| Unit | Wohneinheit | Apartment/unit within property |
| Tenant | Mieter | Tenant with prepayment info |
| Settlement | Abrechnung | Annual expense settlement |
| Invoice | Rechnung | Expense invoice |
| Document | Dokument | Uploaded file with OCR status |
| ManualEntry | Manuelle Buchung | Credit/debit adjustments |
| SettlementResult | Abrechnungsergebnis | Calculated costs per tenant |
| UnitAllocation | Verteilerschlüssel | Custom allocation rules |

## Enumerations (`enums.py`)

### CostCategory (BetrKV §2)
17 categories: GRUNDSTEUER, WASSERVERSORGUNG, ENTWAESSERUNG, HEIZUNG, WARMWASSER, VERBUNDENE_ANLAGEN, AUFZUG, STRASSENREINIGUNG, GEBAEUDEREINIGUNG, GARTENPFLEGE, BELEUCHTUNG, SCHORNSTEINREINIGUNG, VERSICHERUNG, HAUSWART, ANTENNE_KABEL, WAESCHEPFLEGE, SONSTIGE

### AllocationMethod
- WOHNFLAECHE: By unit area (m²)
- PERSONENZAHL: By resident count
- EINHEIT: Equal per unit
- VERBRAUCH: By consumption
- MITEIGENTUMSANTEIL: Co-ownership share

### SettlementStatus
DRAFT → CALCULATED → FINALIZED → EXPORTED

### DocumentStatus
PENDING → PROCESSING → PROCESSED/FAILED → VERIFIED

## Common Patterns

### UUID Primary Keys
```python
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

### Decimal for Money
```python
amount = Column(Numeric(12, 2), nullable=False)
```

### Computed Properties
```python
@property
def current_tenant(self) -> Optional["Tenant"]:
    return next((t for t in self.tenants if t.is_active), None)
```

## Adding a New Model

1. Create `models/new_entity.py`:
```python
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import uuid

class NewEntity(Base):
    __tablename__ = "new_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("parents.id"))

    parent = relationship("Parent", back_populates="children")
```

2. Import in `models/__init__.py`
3. Generate migration: `alembic revision --autogenerate`
