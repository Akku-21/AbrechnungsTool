# Types Module

TypeScript type definitions for the application.

## Main Types (`index.ts`)

### Domain Entities

```typescript
interface Property {
  id: string
  name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  total_area_sqm: number
  units?: Unit[]
}

interface Unit {
  id: string
  property_id: string
  designation: string
  area_sqm: number
  floor?: number
  rooms?: number
  has_balcony: boolean
  has_garden: boolean
  current_tenant?: Tenant
}

interface Tenant {
  id: string
  unit_id: string
  salutation?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  move_in_date: string
  move_out_date?: string
  resident_count: number
  monthly_prepayment: number
  is_active: boolean
}

interface Settlement {
  id: string
  property_id: string
  period_start: string
  period_end: string
  status: SettlementStatus
  notes?: string
  finalized_at?: string
  property?: Property
  results?: SettlementResult[]
}

interface Invoice {
  id: string
  settlement_id: string
  document_id?: string
  vendor_name: string
  invoice_number?: string
  invoice_date?: string
  total_amount: number
  cost_category: CostCategory
  allocation_percentage?: number
  is_verified: boolean
}

interface Document {
  id: string
  settlement_id: string
  original_filename: string
  file_path: string
  document_status: DocumentStatus
  ocr_raw_text?: string
  ocr_confidence?: number
  include_in_export: boolean
}
```

### Enums

```typescript
type SettlementStatus = 'DRAFT' | 'CALCULATED' | 'FINALIZED' | 'EXPORTED'

type DocumentStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'VERIFIED'

type CostCategory =
  | 'GRUNDSTEUER'
  | 'WASSERVERSORGUNG'
  | 'ENTWAESSERUNG'
  | 'HEIZUNG'
  | 'WARMWASSER'
  | 'VERBUNDENE_ANLAGEN'
  | 'AUFZUG'
  | 'STRASSENREINIGUNG'
  | 'GEBAEUDEREINIGUNG'
  | 'GARTENPFLEGE'
  | 'BELEUCHTUNG'
  | 'SCHORNSTEINREINIGUNG'
  | 'VERSICHERUNG'
  | 'HAUSWART'
  | 'ANTENNE_KABEL'
  | 'WAESCHEPFLEGE'
  | 'SONSTIGE'
```

### Create/Update Types

```typescript
// Omit id and computed fields for create
type PropertyCreate = Omit<Property, 'id' | 'units'>

// Partial for update
type PropertyUpdate = Partial<PropertyCreate>
```

## Adding New Types

1. Add interface/type to `index.ts`
2. Export from module
3. Import where needed:
```typescript
import type { Property, Settlement } from '@/types'
```

## Type Guards

```typescript
function isSettlementFinalized(settlement: Settlement): boolean {
  return settlement.status === 'FINALIZED'
}
```
