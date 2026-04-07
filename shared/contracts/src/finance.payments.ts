import type { ApiItemResponse, ApiListResponse, IdString } from './common'
import { PaymentMethod } from './finance.receipts'

// Record Payment Request
export interface RecordPaymentRequest {
  invoiceId: IdString
  amount: number
  currency?: string
  method: PaymentMethod
  date?: string // ISO date string
  reference?: string
  generateReceipt?: boolean
  collectedBy?: string
}

// Reverse Payment Request
export interface ReversePaymentRequest {
  reference?: string
  reversedBy?: string
}

// Link to Invoice Request
export interface LinkToInvoiceRequest {
  // Additional linking parameters if needed
}

// Payment Entity
export interface Payment {
  id: IdString
  tenant_id: IdString
  lease_id?: IdString
  rent_schedule_id?: IdString
  method: PaymentMethod
  amount: number
  currency: string
  received_at: string
  collected_by?: string
  receipt_url?: string
  reference?: string
}

// Response Types
export type RecordPaymentResponse = ApiItemResponse<Payment>
export type GetPaymentResponse = ApiItemResponse<Payment>
export type ListPaymentsResponse = ApiListResponse<Payment>
export type ReversePaymentResponse = ApiItemResponse<{ id: IdString; reversed: boolean; reversalId: IdString }>
export type LinkToInvoiceResponse = ApiItemResponse<Payment>

// List Parameters
export interface ListPaymentsParams {
  page?: number
  pageSize?: number
  q?: string
  method?: PaymentMethod
  invoiceId?: IdString
  leaseId?: IdString
  tenantId?: IdString
  ownerId?: IdString
  dateFrom?: string
  dateTo?: string
  sort?: string
}
