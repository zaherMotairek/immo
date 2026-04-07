import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type DepositStatus = 'collecte' | 'partiellement_restitue' | 'restitue'

// Deposit Refund Request
export interface DepositRefundRequest {
  refundAmount: number
  deductionAmount?: number
  notes?: string
}

// Deposit Deduction Request
export interface DepositDeductionRequest {
  inspectionId?: IdString
  ticketId?: IdString
  amount: number
  justification: string
}

// Deposit Entity
export interface Deposit {
  id: IdString
  tenant_id: IdString
  lease_id: IdString
  collected_on: string
  amount: number
  currency: string
  balance: number
  status: DepositStatus
  meta_json?: any
}

// Response Types
export type GetDepositResponse = ApiItemResponse<Deposit>
export type ListDepositsResponse = ApiListResponse<Deposit>
export type DepositRefundResponse = ApiItemResponse<Deposit>
export type DepositDeductionResponse = ApiItemResponse<Deposit>

// List Parameters
export interface ListDepositsParams {
  page?: number
  pageSize?: number
  q?: string
  status?: DepositStatus
  leaseId?: IdString
  dateFrom?: string
  dateTo?: string
  sort?: string
}
