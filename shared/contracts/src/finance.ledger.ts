import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type LedgerEntryType = 
  | 'rent_due' | 'rent_payment' | 'charge_due' | 'charge_payment'
  | 'deposit_collected' | 'deposit_refunded' | 'deposit_deduction'
  | 'owner_payout' | 'agency_commission' | 'maintenance_owner_expense' | 'maintenance_tenant_charge'
  | 'service_fee' | 'adjustment' | 'bank_fee' | 'other_expense' | 'other_income'

export type ReconciliationStatus = 'non_rapproche' | 'partiellement_rapproche' | 'rapproche'

// Post Ledger Entry Request
export interface PostLedgerEntryRequest {
  date: string // ISO date string
  entryType: LedgerEntryType
  description: string
  debit: number
  credit: number
  currency?: string
  ownerId?: IdString
  propertyId?: IdString
  unitId?: IdString
  tenantId?: IdString
  leaseId?: IdString
}

// Adjust Ledger Entry Request
export interface AdjustLedgerEntryRequest {
  description?: string
  debit?: number
  credit?: number
  reason?: string
}

// Ledger Entry Entity
export interface LedgerEntry {
  id: IdString
  tenant_id: IdString
  date: string
  entry_type: LedgerEntryType
  description: string
  debit: number
  credit: number
  balance_after: number
  currency: string
  owner_id?: IdString
  property_id?: IdString
  unit_id?: IdString
  tenant_person_id?: IdString
  lease_id?: IdString
  reconciliation_status: ReconciliationStatus
  link_type?: string
  link_id?: IdString
  meta_json?: any
}

// Response Types
export type PostLedgerEntryResponse = ApiItemResponse<LedgerEntry>
export type GetLedgerEntryResponse = ApiItemResponse<LedgerEntry>
export type ListLedgerEntriesResponse = ApiListResponse<LedgerEntry>
export type AdjustLedgerEntryResponse = ApiItemResponse<LedgerEntry>

// List Parameters
export interface ListLedgerEntriesParams {
  page?: number
  pageSize?: number
  q?: string
  entryType?: LedgerEntryType
  ownerId?: IdString
  propertyId?: IdString
  unitId?: IdString
  tenantId?: IdString
  leaseId?: IdString
  dateFrom?: string
  dateTo?: string
  reconciliationStatus?: ReconciliationStatus
  sort?: string
}
