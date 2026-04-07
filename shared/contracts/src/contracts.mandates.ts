import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type ContractStatus = 'brouillon' | 'actif' | 'suspendu' | 'resilie' | 'expire'
export type RenewalType = 'aucun' | 'auto' | 'manuel'
export type CommissionMode = 'fixe' | 'pourcentage' | 'mixte'
export type NoticeUnit = 'jour' | 'mois'
export type MandateType = 'gestion' | 'syndic' | 'location'
export type ScopeType = 'property' | 'all_properties' | 'units'
export type SignatureStatus = 'brouillon' | 'en_attente' | 'signe' | 'refuse' | 'expire'
export type Currency = 'EUR' | 'USD' | 'XOF' | 'GBP'

// Signature Object
export interface SignatureParty {
  party: string
  role: 'proprietaire' | 'agent'
  email: string
  status: SignatureStatus
  signedAt?: string
}

// Document Object
export interface MandateDocument {
  id: string
  title: string
  category: 'CONTRAT' | 'ADMIN' | 'FINANCIAL'
  visibility: 'public' | 'prive'
  createdAt: string
  updatedAt: string
}

// History Event
export interface HistoryEvent {
  event: string
  date: string
  description?: string
  by?: string
}

// Create Mandate Request
export interface CreateMandateRequest {
  ownerId: IdString
  propertyId: IdString
  code?: string
  status?: ContractStatus
  renewalType?: RenewalType
  commissionMode: CommissionMode
  commissionValue: number
  commissionCap?: number
  commissionMinFee?: number
  commissionNotes?: string
  startDate: string // ISO date string
  endDate?: string // ISO date string
  noticeValue?: number
  noticeUnit?: NoticeUnit
  mandateType?: MandateType
  scopeType?: ScopeType
  scopeAllProperties?: boolean
  currency?: Currency
  signatureStatus?: SignatureStatus
  signatureProvider?: string
  signatureDueAt?: string
  servicesAddons?: string[]
  documents?: MandateDocument[]
  signatures?: SignatureParty[]
  meta?: any
}

// Update Mandate Request
export interface UpdateMandateRequest {
  endDate?: string
  commissionMode?: CommissionMode
  commissionValue?: number
  commissionCap?: number
  commissionMinFee?: number
  commissionNotes?: string
  status?: ContractStatus
  renewalType?: RenewalType
  noticeValue?: number
  noticeUnit?: NoticeUnit
  mandateType?: MandateType
  scopeType?: ScopeType
  scopeAllProperties?: boolean
  currency?: Currency
  signatureStatus?: SignatureStatus
  signatureProvider?: string
  signatureDueAt?: string
  servicesAddons?: string[]
}

// Renew Mandate Request
export interface RenewMandateRequest {
  newEndDate?: string
  renewalType?: RenewalType
}

// Terminate Mandate Request
export interface TerminateMandateRequest {
  endDate?: string
  reason?: string
}

// Send for Signature Request
export interface SendForSignatureRequest {
  provider?: string
  dueAt?: string
  parties?: any[]
  meta?: any
}

// Mandate Entity
export interface Mandate {
  id: IdString
  tenant_id: IdString
  owner_id: IdString
  property_id: IdString
  code: string
  status: ContractStatus
  renewal_type: RenewalType
  commission_mode: CommissionMode
  commission_value: number
  commission_cap?: number
  commission_min_fee?: number
  commission_notes?: string
  start_date: string
  end_date?: string
  notice_value?: number
  notice_unit?: NoticeUnit
  mandate_type: MandateType
  scope_type: ScopeType
  scope_all_properties: boolean
  currency: Currency
  signature_status: SignatureStatus
  signature_provider?: string
  signature_due_at?: string
  services_addons?: string[]
  documents_json?: MandateDocument[]
  signatures_json?: SignatureParty[]
  history_json?: HistoryEvent[]
  meta_json?: any
  created_at: string
  updated_at?: string
  
  // Relations
  owner?: {
    id: IdString
    legal_name: string
    email?: string
  }
  property?: {
    id: IdString
    name?: string
    address_line?: string
  }
}

// Response Types
export type CreateMandateResponse = ApiItemResponse<Mandate>
export type UpdateMandateResponse = ApiItemResponse<Mandate>
export type GetMandateResponse = ApiItemResponse<Mandate>
export type ListMandatesResponse = ApiListResponse<Mandate>
export type RenewMandateResponse = ApiItemResponse<Mandate>
export type TerminateMandateResponse = ApiItemResponse<Mandate>
export type SendForSignatureResponse = ApiItemResponse<Mandate>

// List Parameters
export interface ListMandatesParams {
  page?: number
  pageSize?: number
  q?: string
  status?: ContractStatus
  ownerId?: IdString
  propertyId?: IdString
  renewalType?: RenewalType
  sort?: string
}
