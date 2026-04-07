import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Override Penalty Request
export interface OverridePenaltyRequest {
  value: number
  reason: string
}

// Payment Plan Request
export interface PaymentPlanRequest {
  installments: Array<{
    date: string // ISO date string
    amount: number
  }>
  sendForSignature?: boolean
}

// Send Dunning Letter Request
export interface SendDunningLetterRequest {
  templateId?: IdString
  sendMethod?: string
  customMessage?: string
}

// Arrear Entity
export interface Arrear {
  id: IdString
  tenant_id: IdString
  lease_id: IdString
  tenant_person_id: IdString
  principal: number
  penalties: number
  days_late: number
  policy_snapshot: any
  meta_json?: any
}

// Response Types
export type GetArrearResponse = ApiItemResponse<Arrear>
export type ListArrearsResponse = ApiListResponse<Arrear>
export type OverridePenaltyResponse = ApiItemResponse<Arrear>
export type CreatePaymentPlanResponse = ApiItemResponse<Arrear>
export type SendDunningLetterResponse = ApiItemResponse<Arrear>

// List Parameters
export interface ListArrearsParams {
  page?: number
  pageSize?: number
  q?: string
  leaseId?: IdString
  tenantId?: IdString
  daysLateMin?: number
  daysLateMax?: number
  sort?: string
}
