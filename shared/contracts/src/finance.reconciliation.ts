import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Import Statement Request
export interface ImportStatementRequest {
  format: 'CSV' | 'OFX'
  fileKey: string
}

// Auto Match Request
export interface AutoMatchRequest {
  // Parameters for auto-matching logic
}

// Assist Match Request
export interface AssistMatchRequest {
  // Parameters for assisted matching
}

// Create Adjustment Request
export interface CreateAdjustmentRequest {
  bankStatementId?: IdString
  ledgerEntryId?: IdString
  amount: number
  currency?: string
  reason: string
}

// Bank Statement Entity
export interface BankStatement {
  id: IdString
  tenant_id: IdString
  bank_date: string
  label: string
  amount: number
  currency: string
  raw_json: any
  status: string
  match_payment_id?: IdString
}

// Adjustment Entity
export interface Adjustment {
  id: IdString
  tenant_id: IdString
  bank_statement_id?: IdString
  ledger_entry_id?: IdString
  amount: number
  currency: string
  reason: string
  created_at: string
}

// Response Types
export type ImportStatementResponse = ApiItemResponse<{ batchId: IdString; importedCount: number }>
export type AutoMatchResponse = ApiItemResponse<{ matchedCount: number; unmatchedCount: number }>
export type AssistMatchResponse = ApiItemResponse<{ matched: boolean }>
export type CreateAdjustmentResponse = ApiItemResponse<Adjustment>
export type ListBankStatementsResponse = ApiListResponse<BankStatement>

// List Parameters
export interface ListBankStatementsParams {
  page?: number
  pageSize?: number
  q?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
}
