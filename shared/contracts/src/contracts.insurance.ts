import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type InsuranceProofStatus = 'non_requis' | 'requis' | 'fournit' | 'expirant_bientot' | 'expire'

// Create Insurance Policy Request
export interface CreateInsurancePolicyRequest {
  tenantPersonId: IdString
  leaseId: IdString
  providerId: IdString
  policyNumber: string
  status?: InsuranceProofStatus
  startDate: string
  endDate: string
  proofFiles?: any[]
  meta?: any
}

// Update Insurance Policy Request
export interface UpdateInsurancePolicyRequest {
  status?: InsuranceProofStatus
  policyNumber?: string
  startDate?: string
  endDate?: string
  proofFiles?: any[]
  meta?: any
}

// Request Proof Request
export interface RequestProofRequest {
  message?: string
  deadline?: string
}

// Insurance Policy Entity
export interface InsurancePolicy {
  id: IdString
  tenant_id: IdString
  tenant_person_id: IdString
  lease_id: IdString
  provider_id: IdString
  policy_number: string
  status: InsuranceProofStatus
  start_date: string
  end_date: string
  proof_files_json?: any
  meta_json?: any
  created_at: string
  updated_at?: string
  
  // Relations
  lease?: {
    id: IdString
    contract_number: string
    unit?: {
      id: IdString
      label?: string
      property?: {
        id: IdString
        name?: string
        address_line?: string
      }
    }
  }
}

// Response Types
export type CreateInsurancePolicyResponse = ApiItemResponse<InsurancePolicy>
export type UpdateInsurancePolicyResponse = ApiItemResponse<InsurancePolicy>
export type GetInsurancePolicyResponse = ApiItemResponse<InsurancePolicy>
export type ListInsurancePoliciesResponse = ApiListResponse<InsurancePolicy>
export type RequestProofResponse = ApiItemResponse<InsurancePolicy>

// List Parameters
export interface ListInsurancePoliciesParams {
  page?: number
  pageSize?: number
  q?: string
  status?: InsuranceProofStatus
  tenantPersonId?: IdString
  leaseId?: IdString
  providerId?: IdString
  sort?: string
}
