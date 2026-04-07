import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Supported Report Types
export type ReportType = 
  | 'owner_pl' | 'property_pl' | 'unit_pl' | 'tenant_statement'
  | 'rent_roll' | 'aging_report' | 'cashflow_forecast'

// Generate Report Request
export interface GenerateReportRequest {
  type: ReportType
  period: {
    start: string // ISO date string
    end: string // ISO date string
  }
  filters?: {
    ownerId?: IdString
    propertyId?: IdString
    unitId?: IdString
    tenantId?: IdString
    [key: string]: any
  }
  format?: 'JSON' | 'PDF'
}

// Report Entity
export interface Report {
  id: IdString
  tenant_id: IdString
  type: ReportType
  period_start: string
  period_end: string
  filters_json: any
  status: 'generating' | 'completed' | 'failed'
  file_url?: string
  generated_at: string
  expires_at: string
}

// Response Types
export type GenerateReportResponse = ApiItemResponse<Report>
export type GetReportResponse = ApiItemResponse<Report>
export type ListReportsResponse = ApiListResponse<Report>

// List Parameters
export interface ListReportsParams {
  page?: number
  pageSize?: number
  q?: string
  type?: ReportType
  status?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
}
