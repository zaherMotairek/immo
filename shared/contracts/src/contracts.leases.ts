import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type LeaseStatus = 'brouillon' | 'actif' | 'suspendu' | 'resilie' | 'expire'
export type PaymentFrequency = 'mensuel' | 'trimestriel' | 'annuel'
export type DepositType = 'caution' | 'garantie_bancaire' | 'assurance_loyers'
export type PenaltyMode = 'pourcentage_journalier' | 'forfait_journalier' | 'aucun'
export type LeaseIndexation = 'aucune' | 'indice_officiel' | 'pourcentage_fixe'
export type InsuranceProofStatus = 'non_requis' | 'requis' | 'fournit' | 'expirant_bientot' | 'expire'

// Create Lease Request
export interface CreateLeaseRequest {
  ownerId: IdString
  tenantPersonId: IdString
  propertyId: IdString
  unitId: IdString
  contractNumber?: string
  status?: LeaseStatus
  startDate: string
  endDate: string
  dueDay: number
  rent: {
    amount: number
    currency?: string
    frequency?: PaymentFrequency
  }
  charges: {
    amount: number
    currency?: string
  }
  deposit: {
    type: DepositType
    value: number
  }
  advance?: {
    months: number
  }
  agencyFees?: number
  registrationFeePercent?: number
  penalty: {
    mode: PenaltyMode
    value: number
  }
  indexation: {
    mode: LeaseIndexation
    value?: string
  }
  insurance?: {
    required?: boolean
    providerId?: IdString
    policyNumber?: string
    startDate?: string
    endDate?: string
    proof?: any[]
  }
  clausesRtf?: string
  attachments?: any[]
}

// Update Lease Request
export interface UpdateLeaseRequest {
  endDate?: string
  dueDay?: number
  penalty?: {
    mode?: PenaltyMode
    value?: number
  }
  indexation?: {
    mode?: LeaseIndexation
    value?: string
  }
  insurance?: {
    providerId?: IdString
    policyNumber?: string
    startDate?: string
    endDate?: string
    proof?: any[]
  }
  clausesRtf?: string
}

// Renew Lease Request
export interface RenewLeaseRequest {
  newEndDate?: string
}

// Terminate Lease Request
export interface TerminateLeaseRequest {
  endDate?: string
  reason?: string
}

// Send for Signature Request
export interface SendLeaseForSignatureRequest {
  provider?: string
  dueAt?: string
  parties?: any[]
  meta?: any
}

// Lease Entity
export interface Lease {
  id: IdString
  tenant_id: IdString
  contract_number: string
  status: LeaseStatus
  owner_id: IdString
  tenant_person_id: IdString
  property_id: IdString
  unit_id: IdString
  start_date: string
  end_date: string
  due_day: number
  rent_amount: number
  rent_currency: string
  rent_frequency: PaymentFrequency
  charges_amount: number
  charges_currency: string
  deposit_type: DepositType
  deposit_value: number
  advance_months: number
  agency_fees: number
  registration_fee_percent: number
  penalty_mode: PenaltyMode
  penalty_value: number
  indexation_mode: LeaseIndexation
  indexation_value?: string
  clauses_rtf?: string
  insurance_required: boolean
  insurance_status: InsuranceProofStatus
  insurance_provider_id?: IdString
  insurance_policy_number?: string
  insurance_start?: string
  insurance_end?: string
  documents_json?: any
  history_json?: any
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
  unit?: {
    id: IdString
    label?: string
    unit_type?: string
  }
}

// Response Types
export type CreateLeaseResponse = ApiItemResponse<Lease>
export type UpdateLeaseResponse = ApiItemResponse<Lease>
export type GetLeaseResponse = ApiItemResponse<Lease>
export type ListLeasesResponse = ApiListResponse<Lease>
export type RenewLeaseResponse = ApiItemResponse<Lease>
export type TerminateLeaseResponse = ApiItemResponse<Lease>
export type SendLeaseForSignatureResponse = ApiItemResponse<Lease>

// List Parameters
export interface ListLeasesParams {
  page?: number
  pageSize?: number
  q?: string
  status?: LeaseStatus
  tenantPersonId?: IdString
  unitId?: IdString
  propertyId?: IdString
  ownerId?: IdString
  sort?: string
}
