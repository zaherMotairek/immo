import type { ApiItemResponse, ApiListResponse, IdString } from './common'

export interface OwnersListParams {
  page?: number
  pageSize?: number
  q?: string
  type?: string
  mandateStatus?: string
  agent?: IdString
  zone?: string
  sort?: string // field:asc|desc
}

export interface OwnerCreateRequest {
  type: string
  name: string
  contacts?: { email?: string; phone?: string }
  address?: { line1?: string; city?: string; country?: string }
  agentId?: IdString
  sendPortalInvite?: boolean
}

export interface OwnerUpdateRequest {
  type?: string
  name?: string
  contacts?: { email?: string; phone?: string }
  address?: { line1?: string; city?: string; country?: string }
  commissionProfile?: { mode: string; value: number; cap?: number }
  paymentCycle?: string
  servicesAddons?: string[]
}

export interface Owner {
  id: IdString
  tenant_id: IdString
  type: string
  legal_name?: string
  email?: string
  phone?: string
  tax_id?: string
  segmentation?: string
  consent_at?: string
  created_at: string
}

// Mandates
export interface MandateCreateRequest {
  startDate: string
  endDate?: string
  commissionType: string
  commissionValue: number
  termsPdfUrl?: string
}

export interface MandateRenewRequest {
  newEndDate?: string
}

export interface Mandate {
  id: IdString
  tenant_id: IdString
  owner_id: IdString
  status: string
  starts_on: string
  ends_on?: string
  commission_type: string
  commission_value: number
  terms_pdf_url?: string
  created_at: string
}

// Communications
export interface LogCommunicationRequest {
  channel: string
  toAddress?: string
  templateCode?: string
  providerId?: string
  meta?: any
}

export interface Communication {
  id: IdString
  tenant_id: IdString
  channel: string
  to_address?: string
  template_code?: string
  status: string
  provider_id?: string
  meta_json?: any
  created_at: string
}

// Analytics
export interface OwnerPerformanceParams {
  period?: string
  startDate?: string
  endDate?: string
}

export interface OwnerPerformance {
  ownerId: IdString
  period: {
    startDate: string
    endDate: string
  }
  metrics: {
    revenue: {
      total: number
      currency: string
      breakdown: {
        rent: number
        fees: number
        other: number
      }
    }
    propertiesCount: number
    unitsCount: number
    mandatesCount: number
    activeLeasesCount: number
  }
}

// Settings
export interface OwnerSettingsUpdateRequest {
  defaults?: {
    commissionMode?: string
    commissionValue?: number
    paymentCycle?: string
  }
  numberingOwner?: string
  meta?: any
}

export interface OwnerSettings {
  tenantId: IdString
  defaults: {
    commissionMode: string
    commissionValue: number
    paymentCycle: string
  }
  numberingOwner: string
  meta: any
}

// Import/Export
export interface ImportCsvRequest {
  csvData: string
}

export interface ImportCsvResult {
  total: number
  success: number
  errors: string[]
}

// Documents
export interface DocumentUploadRequest {
  category?: string
  type?: string
  storageUrl: string
  isPublic?: boolean
  uploadedBy?: IdString
}

export interface Document {
  id: IdString
  tenant_id: IdString
  entity_type: string
  entity_id: IdString
  category?: string
  type?: string
  storage_url: string
  is_public: boolean
  version: number
  uploaded_by?: IdString
  uploaded_at: string
}

export interface DocumentListParams {
  category?: string
  type?: string
}

// Response types
export type CreateOwnerResponse = ApiItemResponse<Owner>
export type ListOwnersResponse = ApiListResponse<Owner>
export type ListMandatesResponse = ApiListResponse<Mandate>
export type ListCommunicationsResponse = ApiListResponse<Communication>
export type ListDocumentsResponse = ApiListResponse<Document>
export type OwnerPerformanceResponse = ApiItemResponse<OwnerPerformance>
export type OwnerSettingsResponse = ApiItemResponse<OwnerSettings>
export type ImportCsvResponse = ApiItemResponse<ImportCsvResult>
