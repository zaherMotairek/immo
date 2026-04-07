import type { ApiItemResponse, IdString } from './common'

// Finance Settings Entity
export interface FinanceSettings {
  tenant_id: IdString
  defaults_currency: string
  tax_type: string
  tax_rate_pct: number
  penalty_mode: string
  penalty_value: number
  reminder_days: number
  mandate_default_mode: string
  mandate_default_value: number
  numbering_invoice: string
  numbering_receipt: string
  bank_iban: string
  bank_import_format: string
  meta_json?: any
}

// Update Finance Settings Request
export interface UpdateFinanceSettingsRequest {
  defaults_currency?: string
  tax_type?: string
  tax_rate_pct?: number
  penalty_mode?: string
  penalty_value?: number
  reminder_days?: number
  mandate_default_mode?: string
  mandate_default_value?: number
  numbering_invoice?: string
  numbering_receipt?: string
  bank_iban?: string
  bank_import_format?: string
  meta?: any
}

// Response Types
export type GetFinanceSettingsResponse = ApiItemResponse<FinanceSettings>
export type UpdateFinanceSettingsResponse = ApiItemResponse<FinanceSettings>
