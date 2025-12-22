// Property Types
export interface Property {
  id: string
  name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  total_area_sqm: number
  full_address: string
  unit_count?: number
  created_at: string
  updated_at: string
}

export interface PropertyCreate {
  name: string
  street: string
  house_number: string
  postal_code: string
  city: string
  total_area_sqm: number
}

export interface PropertyUpdate {
  name?: string
  street?: string
  house_number?: string
  postal_code?: string
  city?: string
  total_area_sqm?: number
}

export interface PropertyListResponse {
  items: Property[]
  total: number
}

// Unit Types
export interface Unit {
  id: string
  property_id: string
  designation: string
  area_sqm: number
  floor?: number
  rooms?: number
  has_balcony: boolean
  has_garden: boolean
  created_at: string
  updated_at: string
}

export interface UnitCreate {
  property_id: string
  designation: string
  area_sqm: number
  floor?: number
  rooms?: number
  has_balcony?: boolean
  has_garden?: boolean
}

export interface UnitUpdate {
  designation?: string
  area_sqm?: number
  floor?: number
  rooms?: number
  has_balcony?: boolean
  has_garden?: boolean
}

// Tenant Types
export interface TenantAddress {
  id: string
  street: string
  house_number?: string
  postal_code: string
  city: string
  country: string
  is_current: boolean
  valid_from: string
  full_address: string
}

export interface Tenant {
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
  monthly_prepayment?: number
  is_active: boolean
  full_name: string
  created_at: string
  updated_at: string
  addresses: TenantAddress[]
}

export interface TenantCreate {
  unit_id: string
  salutation?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  move_in_date: string
  move_out_date?: string
  resident_count?: number
  monthly_prepayment?: number
  address?: {
    street: string
    house_number?: string
    postal_code: string
    city: string
    country?: string
    valid_from: string
  }
}

export interface TenantUpdate {
  salutation?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  move_in_date?: string
  move_out_date?: string
  resident_count?: number
  monthly_prepayment?: number
  is_active?: boolean
}

// Settlement Types
export type SettlementStatus = 'DRAFT' | 'CALCULATED' | 'FINALIZED' | 'EXPORTED'

export interface Settlement {
  id: string
  property_id: string
  period_start: string
  period_end: string
  status: SettlementStatus
  notes?: string
  period_label: string
  year: number
  created_at: string
  updated_at: string
  finalized_at?: string
}

export interface SettlementCreate {
  property_id: string
  period_start: string
  period_end: string
  notes?: string
}

export interface SettlementUpdate {
  period_start?: string
  period_end?: string
  notes?: string
  status?: SettlementStatus
}

// Document Types
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'VERIFIED'

export interface Document {
  id: string
  settlement_id: string
  original_filename: string
  stored_filename: string
  file_size_bytes: number
  file_size_mb: number
  mime_type: string
  document_status: DocumentStatus
  ocr_raw_text?: string
  ocr_confidence?: number
  include_in_export: boolean
  upload_date: string
  processed_at?: string
}

export interface DocumentUpdate {
  include_in_export?: boolean
}

export interface DocumentUploadResponse {
  id: string
  status: DocumentStatus
  message: string
}

export interface OCRExtractedData {
  vendor_name?: string
  invoice_number?: string
  invoice_date?: string
  total_amount?: number
  suggested_category?: CostCategory
}

export interface OCRResult {
  document_id: string
  status: DocumentStatus
  raw_text?: string
  confidence?: number
  extracted_data?: OCRExtractedData
}

// Invoice Types
export type CostCategory =
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

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  GRUNDSTEUER: 'Grundsteuer',
  WASSERVERSORGUNG: 'Wasserversorgung',
  ENTWAESSERUNG: 'Entwässerung',
  HEIZUNG: 'Heizkosten',
  WARMWASSER: 'Warmwasser',
  VERBUNDENE_ANLAGEN: 'Verbundene Anlagen',
  AUFZUG: 'Aufzug',
  STRASSENREINIGUNG: 'Straßenreinigung/Müll',
  GEBAEUDEREINIGUNG: 'Gebäudereinigung',
  GARTENPFLEGE: 'Gartenpflege',
  BELEUCHTUNG: 'Beleuchtung',
  SCHORNSTEINREINIGUNG: 'Schornsteinreinigung',
  VERSICHERUNG: 'Versicherungen',
  HAUSWART: 'Hauswart',
  ANTENNE_KABEL: 'Antenne/Kabel',
  WAESCHEPFLEGE: 'Wäschepflege',
  SONSTIGE: 'Sonstige',
}

export interface LineItem {
  id: string
  invoice_id: string
  description: string
  amount: number
  quantity: number
  unit_price?: number
  vat_rate: number
  cost_category?: CostCategory
  created_at: string
}

export interface Invoice {
  id: string
  settlement_id: string
  document_id?: string
  vendor_name: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  total_amount: number
  cost_category: CostCategory
  allocation_percentage?: number  // 0.0 - 1.0 (z.B. 0.5 = 50%)
  notes?: string
  is_verified: boolean
  created_at: string
  updated_at: string
  line_items: LineItem[]
}

export interface InvoiceCreate {
  settlement_id: string
  document_id?: string
  vendor_name: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  total_amount: number
  cost_category: CostCategory
  allocation_percentage?: number  // 0.0 - 1.0 (z.B. 0.5 = 50%)
  notes?: string
  line_items?: {
    description: string
    amount: number
    quantity?: number
    unit_price?: number
    vat_rate?: number
    cost_category?: CostCategory
  }[]
}

export interface InvoiceUpdate {
  vendor_name?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  total_amount?: number
  cost_category?: CostCategory
  notes?: string
  is_verified?: boolean
}

// Manual Entry Types
export interface ManualEntry {
  id: string
  settlement_id: string
  unit_id?: string
  entry_type: string
  description: string
  amount: number
  cost_category?: CostCategory
  notes?: string
  is_credit: boolean
  is_debit: boolean
  created_at: string
  updated_at: string
}

export interface ManualEntryCreate {
  settlement_id: string
  unit_id?: string
  entry_type: string
  description: string
  amount: number
  cost_category?: CostCategory
  notes?: string
}

export interface ManualEntryUpdate {
  entry_type?: string
  description?: string
  amount?: number
  cost_category?: CostCategory
  notes?: string
  unit_id?: string
}
