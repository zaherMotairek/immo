import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type ReceiptType = 'loyer' | 'charges' | 'caution' | 'remboursement' | 'autre'
export type PaymentMethod = 'virement' | 'cheque' | 'especes' | 'carte' | 'wallet'

// Generate Receipt Request
export interface GenerateReceiptRequest {
  type: ReceiptType
  payerId?: IdString
  invoiceId?: IdString
  amount: number
  currency?: string
  method: PaymentMethod
  date?: string // ISO date string
  meta?: any
}

// Receipt Entity
export interface Receipt {
  id: IdString
  tenant_id: IdString
  number: string
  type: ReceiptType
  payer_id?: IdString
  invoice_id?: IdString
  amount: number
  currency: string
  method: PaymentMethod
  date: string
  file_url?: string
  meta_json?: any
}

// Response Types
export type GenerateReceiptResponse = ApiItemResponse<Receipt>
export type GetReceiptResponse = ApiItemResponse<Receipt>
export type ListReceiptsResponse = ApiListResponse<Receipt>

// List Parameters
export interface ListReceiptsParams {
  page?: number
  pageSize?: number
  q?: string
  type?: ReceiptType
  payerId?: IdString
  invoiceId?: IdString
  dateFrom?: string
  dateTo?: string
  sort?: string
}
