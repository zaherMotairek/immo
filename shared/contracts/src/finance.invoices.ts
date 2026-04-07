import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type InvoiceType = 'loyer' | 'charges' | 'penalite' | 'maintenance_refacturable' | 'frais_agence' | 'autre'
export type InvoiceStatus = 'brouillon' | 'emise' | 'partiellement_payee' | 'payee' | 'annulee'

// Create Invoice Request
export interface CreateInvoiceRequest {
  type: InvoiceType
  leaseId?: IdString
  tenantPersonId?: IdString
  ownerId?: IdString
  amount: number
  currency?: string
  dueDate: string // ISO date string
  notes?: string
}

// Update Invoice Request
export interface UpdateInvoiceRequest {
  dueDate?: string
  notes?: string
}

// Send Invoice Request
export interface SendInvoiceRequest {
  sendMethod?: string
}

// Cancel Invoice Request
export interface CancelInvoiceRequest {
  reason?: string
}

// Invoice Entity
export interface Invoice {
  id: IdString
  tenant_id: IdString
  number: string
  type: InvoiceType
  status: InvoiceStatus
  lease_id?: IdString
  tenant_person_id?: IdString
  owner_id?: IdString
  amount: number
  currency: string
  due_date: string
  issued_at?: string
  cancelled_at?: string
  meta_json?: any
}

// Response Types
export type CreateInvoiceResponse = ApiItemResponse<Invoice>
export type UpdateInvoiceResponse = ApiItemResponse<Invoice>
export type GetInvoiceResponse = ApiItemResponse<Invoice>
export type ListInvoicesResponse = ApiListResponse<Invoice>
export type SendInvoiceResponse = ApiItemResponse<Invoice>
export type CancelInvoiceResponse = ApiItemResponse<Invoice>

// List Parameters
export interface ListInvoicesParams {
  page?: number
  pageSize?: number
  q?: string
  type?: InvoiceType
  status?: InvoiceStatus
  leaseId?: IdString
  ownerId?: IdString
  dateFrom?: string
  dateTo?: string
  sort?: string
}
