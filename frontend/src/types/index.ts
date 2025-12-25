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
  ocr_engine?: string
  llm_extraction_used: boolean
  llm_extraction_error?: string
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
  engine?: string
  llm_extraction_used: boolean
  llm_extraction_error?: string
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
  unit_id?: string  // NULL = Settlement-weit, gesetzt = Unit-spezifisch
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
  unit_id?: string  // NULL = Settlement-weit, gesetzt = Unit-spezifisch
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

// Signature Types
export type SignatureType = 'NONE' | 'CERTIFICATE' | 'PAD' | 'IMAGE' | 'TEXT'
export type TextFontStyle = 'HANDWRITING' | 'SERIF' | 'SANS'

export interface SignatureSettings {
  signature_type: SignatureType
  configured: boolean
  certificate_uploaded: boolean
  certificate_filename?: string
  signature_image_uploaded: boolean
  signature_text?: string
  signature_text_font?: TextFontStyle
}

export interface SignatureTypeUpdate {
  signature_type: SignatureType
}

export interface SignatureTextUpdate {
  text: string
  font: TextFontStyle
}

export interface SignaturePadSave {
  image_data: string
}

export const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  NONE: 'Keine Signatur',
  CERTIFICATE: 'Digitales Zertifikat (PKCS#12)',
  PAD: 'Gezeichnete Unterschrift',
  IMAGE: 'Unterschriftsbild',
  TEXT: 'Text-Signatur',
}

export const TEXT_FONT_LABELS: Record<TextFontStyle, string> = {
  HANDWRITING: 'Handschrift (Kursiv)',
  SERIF: 'Serif (Times)',
  SANS: 'Sans-Serif (Arial)',
}

// Unit Settlement Types (Einzelabrechnung)
export type AllocationMethod =
  | 'WOHNFLAECHE'
  | 'PERSONENZAHL'
  | 'EINHEIT'
  | 'VERBRAUCH'
  | 'MITEIGENTUMSANTEIL'

export interface UnitBrief {
  id: string
  designation: string
  area_sqm: number
}

export interface TenantBrief {
  id: string
  salutation?: string
  first_name: string
  last_name: string
  full_name: string
}

export interface DocumentBrief {
  id: string
  original_filename: string
  mime_type: string
  document_status: DocumentStatus
  upload_date: string
}

export interface CostBreakdown {
  cost_category: CostCategory
  total_property_cost: number
  allocation_percentage: number
  allocated_amount: number
  allocation_method: AllocationMethod
}

export interface UnitSettlement {
  id: string
  settlement_id: string
  unit_id: string
  tenant_id: string
  total_costs: number
  total_prepayments: number
  balance: number  // Positiv = Nachzahlung, Negativ = Guthaben
  occupancy_days: number
  notes?: string
  unit: UnitBrief
  tenant: TenantBrief
  cost_breakdowns: CostBreakdown[]
  documents: DocumentBrief[]
  created_at: string
}

export interface UnitSettlementUpdate {
  notes?: string
}

export interface UnitSettlementListResponse {
  unit_settlements: UnitSettlement[]
  total_costs: number
  total_balance: number
}
