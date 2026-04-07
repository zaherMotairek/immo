import type { ApiItemResponse, ApiListResponse, IdString } from './common'
import { PaymentMethod } from './finance.receipts'

// Enums matching backend
export type OwnerPayoutStatus = 'brouillon' | 'en_attente_validation' | 'verse' | 'annule'

// Calculate Payout Request
export interface CalculatePayoutRequest {
  ownerId: IdString
  period: {
    start: string // ISO date string
    end: string // ISO date string
  }
}

// Mark Paid Request
export interface MarkPaidRequest {
  method: PaymentMethod
  reference?: string
  paidAt?: string // ISO date string
}

// Owner Payout Entity
export interface OwnerPayout {
  id: IdString
  tenant_id: IdString
  owner_id: IdString
  period_start: string
  period_end: string
  gross_collected: number
  agency_commission: number
  owner_expenses: number
  net_to_owner: number
  status: OwnerPayoutStatus
  paid_at?: string
  payment_method?: PaymentMethod
  reference?: string
  meta_json?: any
}

// Response Types
export type CalculatePayoutResponse = ApiItemResponse<OwnerPayout>
export type GetPayoutResponse = ApiItemResponse<OwnerPayout>
export type ListPayoutsResponse = ApiListResponse<OwnerPayout>
export type ValidatePayoutResponse = ApiItemResponse<OwnerPayout>
export type MarkPaidResponse = ApiItemResponse<OwnerPayout>

// List Parameters
export interface ListPayoutsParams {
  page?: number
  pageSize?: number
  q?: string
  ownerId?: IdString
  status?: OwnerPayoutStatus
  periodStart?: string
  periodEnd?: string
  sort?: string
}
