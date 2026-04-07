import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type ExpenseKind = 'owner' | 'agency'
export type Counterparty = 'tenant' | 'owner' | 'provider' | 'agency'

// Owner Expense Request
export interface OwnerExpenseRequest {
  ownerId: IdString
  propertyId?: IdString
  unitId?: IdString
  ticketId?: IdString
  category: string
  amount: number
  currency?: string
  date: string // ISO date string
  docKey?: string
}

// Agency Expense Request
export interface AgencyExpenseRequest {
  category: string
  amount: number
  currency?: string
  date: string // ISO date string
  counterparty: Counterparty
  docKey?: string
}

// Expense Entity
export interface Expense {
  id: IdString
  tenant_id: IdString
  kind: ExpenseKind
  owner_id?: IdString
  property_id?: IdString
  unit_id?: IdString
  ticket_id?: IdString
  category: string
  amount: number
  currency: string
  date: string
  counterparty?: string
  doc_url?: string
  meta_json?: any
}

// Response Types
export type CreateOwnerExpenseResponse = ApiItemResponse<Expense>
export type CreateAgencyExpenseResponse = ApiItemResponse<Expense>
export type GetExpenseResponse = ApiItemResponse<Expense>
export type ListExpensesResponse = ApiListResponse<Expense>

// List Parameters
export interface ListExpensesParams {
  page?: number
  pageSize?: number
  q?: string
  kind?: ExpenseKind
  ownerId?: IdString
  propertyId?: IdString
  unitId?: IdString
  category?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
}
