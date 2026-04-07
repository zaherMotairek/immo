import type { ApiItemResponse, ApiListResponse, IdString } from './common'

export type PropertyType = 'BUILDING' | 'VILLA' | 'COMMERCIAL' | 'LAND' | 'WAREHOUSE'

export interface PropertiesListParams {
  q?: string
  owner?: IdString
  type?: PropertyType
  city?: string
  page?: number
  pageSize?: number
  sort?: string
}

export interface CreatePropertyRequest {
  ownerId: IdString
  type: PropertyType
  name?: string
  internalCode?: string
  location?: { address?: string; city?: string; district?: string; country?: string }
  geo?: { lat?: number; lng?: number }
}

export interface UpdatePropertyRequest {
  ownerId?: IdString
  type?: PropertyType
  name?: string
  internalCode?: string
  location?: { address?: string; city?: string; district?: string; country?: string }
  geo?: { lat?: number; lng?: number }
}

export interface Property {
  id: IdString
  tenant_id: IdString
  owner_id: IdString
  type: PropertyType
  name?: string | null
  internal_code?: string | null
  city?: string | null
  district?: string | null
  address_line?: string | null
  country?: string | null
  lat?: number | null
  lng?: number | null
  created_at?: string
  ownerName?: string
  unitsCount?: number
  availableUnitsCount?: number
}

export type CreatePropertyResponse = ApiItemResponse<Property>
export type UpdatePropertyResponse = ApiItemResponse<Property>
export type GetPropertyResponse = ApiItemResponse<Property>
export type ListPropertiesResponse = ApiListResponse<Property>

// Units
export type UnitStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'MAINTENANCE' | 'HORS_SERVICE'
export type UnitType = 'APARTMENT' | 'VILLA' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'PARKING'

export interface Unit {
  id: IdString
  tenant_id: IdString
  property_id: IdString
  label?: string | null
  unit_type?: UnitType | null
  floor?: string | null
  surface_m2?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  bathrooms_full?: number | null
  bathrooms_half?: number | null
  livingrooms?: number | null
  kitchen_type?: string | null
  furnishing_level?: string | null
  heating?: string | null
  cooling?: string | null
  amenities?: string[]
  status?: UnitStatus | null
  base_price?: number | null
  service_charges?: number | null
  tax_rate_pct?: number | null
  deposit_months?: number | null
  advance_months?: number | null
  currency?: string | null
  created_at?: string
}

export interface UnitCreateRequest {
  unitNumber?: string
  type?: UnitType
  floor?: string
  area?: number
  bedrooms?: number
  bathrooms?: number
  bathroomsFull?: number
  bathroomsHalf?: number
  livingrooms?: number
  kitchenType?: string
  furnishingLevel?: string
  heating?: string
  cooling?: string
  amenities?: string[]
  baseRentCents?: number
  serviceChargesCents?: number
  taxRate?: number
  depositMonths?: number
  advanceMonths?: number
  currency?: string
  status?: UnitStatus
}

export interface UnitUpdateRequest extends UnitCreateRequest {}

export interface UnitReserveRequest {
  start: string
  end: string
  notes?: string
  applicationId?: IdString
  tenantId?: IdString
  prospectName?: string
  prospectContact?: string
}

export type ListUnitsResponse = ApiListResponse<Unit>
export type GetUnitResponse = ApiItemResponse<Unit>
export type CreateUnitResponse = ApiItemResponse<Unit>
export type UpdateUnitResponse = ApiItemResponse<Unit>
export type ReserveUnitResponse = ApiItemResponse<{ id: IdString }>

// Documents
export interface PropertyDocument {
  id: IdString
  tenant_id: IdString
  entity_type: 'PROPERTY'
  entity_id: IdString
  category?: string | null
  type?: string | null
  storage_url?: string | null
  is_public?: boolean | null
  version?: number | null
  uploaded_at?: string
}

export interface DocumentUploadRequest {
  category?: string
  type?: string
  storageUrl?: string
  url?: string
  isPublic?: boolean
  filename?: string
  fileSize?: number
}

export type ListPropertyDocumentsResponse = ApiListResponse<PropertyDocument>
export type UploadPropertyDocumentResponse = ApiItemResponse<PropertyDocument>

// Maintenance bridge
export interface MaintenanceTicket {
  id: IdString
  tenant_id: IdString
  property_id: IdString
  title?: string | null
  status?: string | null
  priority?: string | null
  created_at?: string
}
export type ListMaintenanceTicketsResponse = ApiListResponse<MaintenanceTicket>

// Availability
export interface AvailabilityCalendar {
  units: Array<{ id: IdString; label?: string | null; status?: UnitStatus | null }>
  reservations: Array<{ unit_id: IdString; start_date: string; end_date: string; status?: string | null }>
}
export type GetAvailabilityCalendarResponse = ApiItemResponse<AvailabilityCalendar>
export type ReserveAnyResponse = ApiItemResponse<{ id: IdString }>

// Analytics
export interface UnitOccupancy {
  totalUnits: number
  occupiedUnits: number
  occupancyPct: number
}
export interface RentPerformance {
  totalRent: number
}
export type GetUnitOccupancyResponse = ApiItemResponse<UnitOccupancy>
export type GetRentPerformanceResponse = ApiItemResponse<RentPerformance>

// Settings
export interface PropertySettings {
  period_days_default?: number
  kpis_enabled?: string[]
  feeds_enabled?: string[]
  portfolio_scope_enabled?: boolean
  meta_json?: Record<string, unknown> | null
}
export interface PropertySettingsUpdateRequest extends PropertySettings {}
export type GetPropertySettingsResponse = ApiItemResponse<PropertySettings>
export type UpdatePropertySettingsResponse = ApiItemResponse<PropertySettings>

// Import/Export
export interface ImportCsvRequest {
  csv: string
  content?: string
}
export interface ImportCsvResponse { imported: number }
