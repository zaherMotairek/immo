import type { ApiItemResponse, ApiListResponse, IdString } from './common'

export type PersonType = 'INDIVIDUAL' | 'COMPANY'
export type PayMethod = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'MOBILE_MONEY'

// Core Tenants
export interface TenantsListParams {
  q?: string
  page?: number
  pageSize?: number
}

export interface CreateTenantRequest {
  personType: PersonType
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  financial?: Record<string, unknown>
  active?: boolean
  propertyId?: string  // NOUVEAU
  unitId?: string      // NOUVEAU
}

export interface UpdateTenantRequest {
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  financial?: Record<string, unknown>
  active?: boolean
}

export interface Tenant {
  id: IdString
  tenant_id?: IdString
  person_type: PersonType
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  email?: string | null
  phone?: string | null
  active?: boolean
  property_id?: string | null  // NOUVEAU
  unit_id?: string | null      // NOUVEAU
  created_at?: string
  // Convenience for UI
  fullName?: string
}

export interface CreatePaymentRequest {
  method: PayMethod
  amount: number
  currency?: string
  reference?: string
  leaseId?: IdString
}

export interface Payment {
  id: IdString
  method: PayMethod
  amount: number
  currency: string
  reference?: string | null
  received_at?: string
}

export interface LeaseRef {
  id: IdString
  starts_on?: string
  ends_on?: string
}

// Prospects Submodule
export type ProspectType = 'PARTICULIER' | 'SOCIETE'

export interface Prospect {
  id: IdString
  tenant_id: IdString
  type?: ProspectType | null
  name: string
  email?: string | null
  phone?: string | null
  budget_max?: number | null
  preferences?: Record<string, any> | null
  stage?: string | null
  assigned_user_id?: string | null
  created_at: string
}

export interface CreateProspectRequest {
  type?: ProspectType
  name: string
  email?: string
  phone?: string
  budgetMax?: number
  preferences?: Record<string, any>
  stage?: string
  assignedUserId?: string
}

export interface UpdateProspectRequest {
  name?: string
  email?: string
  phone?: string
  preferences?: Record<string, any>
  stage?: string
}

export interface MoveProspectRequest {
  stage: string
}

// Applications Submodule
export interface Application {
  id: IdString
  tenant_id: IdString
  candidate_id?: string | null
  property_id?: string | null  // NEW FIELD
  unit_id?: string | null
  household?: Record<string, any> | null
  documents?: any[] | null
  consents?: { screening?: boolean } | null
  score?: number | null
  checklist?: Record<string, any> | null
  guarantor?: { type?: string; linkId?: string } | null
  notes?: string | null
  completeness?: number | null
  status?: string | null
  created_at: string
}

export interface CreateApplicationRequest {
  candidateId?: string
  propertyId?: string  // NEW FIELD
  unitId?: string
  household?: Record<string, any>
  documents?: any[]
  consents?: { screening?: boolean }
}

export interface UpdateApplicationRequest {
  score?: number
  checklist?: Record<string, any>
  guarantor?: { type?: string; linkId?: string }
  notes?: string
  completeness?: number
}

export interface ApplicationsListParams {
  q?: string
  status?: string
  scoreMin?: number
  agent?: string
  page?: number
  pageSize?: number
}

// Guarantors Submodule
export type GuarantorType = 'PARTICULIER' | 'SOCIETE' | 'ORGANISME'

export interface Guarantor {
  id: IdString
  tenant_id: IdString
  type?: GuarantorType | null
  name: string
  email?: string | null
  phone?: string | null
  application_id?: string | null
  documents?: any[] | null
  created_at: string
}

export interface CreateGuarantorRequest {
  type?: GuarantorType
  name: string
  email?: string
  phone?: string
  applicationId?: string
  documents?: any[]
}

export interface UpdateGuarantorRequest {
  name?: string
  email?: string
  phone?: string
}

export interface GuarantorsListParams {
  q?: string
  type?: string
  page?: number
  pageSize?: number
}

// Matching Submodule
export interface UnitRecommendation {
  unitId: IdString
  propertyId: IdString
  score: number
  reasons: string[]
  unit: {
    name?: string
    type: string
    size?: number
    rentAmount?: number
  }
  property: {
    name?: string
    address?: string
    city?: string
  }
}

export interface MatchingRecommendationsParams {
  applicationId?: string
  q?: string
}

export interface ReserveUnitRequest {
  startDate?: string
  endDate?: string
  notes?: string
}

// Analytics Submodule
export interface FunnelDataPoint {
  stage: string
  count: number
  change?: number
  conversionRate?: number
}

export interface ApprovalTimeDataPoint {
  period: string
  averageDays: number
  medianDays?: number
}

export interface RetentionDataPoint {
  period: string
  retentionRate: number
  churnRate?: number
}

export interface ConversionDataPoint {
  stage: string
  rate: number
}

export interface RevenueDataPoint {
  monthly: number
  change: number
  forecast: number
  growth: number
}

export interface AnalyticsParams {
  period?: string
}

// Settings Submodule
export interface TenantSettings {
  tenant_id: IdString
  screening_threshold?: number | null
  require_documents: boolean
  effort_rate_max_pct?: number | null
  reserve_hold_hours?: number | null
  numbering_tenant?: string | null
  meta?: Record<string, any> | null
}

export interface UpdateTenantSettingsRequest {
  screeningThreshold?: number
  requireDocuments?: boolean
  effortRateMaxPct?: number
  reserveHoldHours?: number
  numberingTenant?: string
  meta?: Record<string, any>
}

// Documents Submodule
export interface TenantDocument {
  id: IdString
  tenant_id: IdString
  application_id?: string | null
  name: string
  description?: string | null
  url: string
  mime_type?: string | null
  category?: string | null
  uploaded_at: string
}

export interface UploadTenantDocumentRequest {
  name: string
  description?: string
  url: string
  mimeType?: string
  category?: string
}

// Communications Submodule
export interface Communication {
  id: IdString
  tenant_id: IdString
  application_id?: string | null
  type: string
  subject?: string | null
  content?: string | null
  sent_at: string
  from_user_id?: string | null
  to_email?: string | null
}

export interface LogCommunicationRequest {
  type: string
  subject?: string
  content?: string
  toEmail?: string
}

export interface CommunicationsListParams {
  applicationId?: string
  type?: string
  page?: number
  pageSize?: number
}

// Selection Submodule
export interface SelectionReview {
  id: IdString
  application_id: IdString
  status: string
  reviewed_at?: string
  reviewer_id?: string
  notes?: string
}

export interface SelectionListParams {
  status?: string
  page?: number
  pageSize?: number
}

// Screening Submodule
export interface ScreeningRequest {
  applicationId: string
  provider?: string
  type?: string
}

export interface ScreeningReport {
  id: IdString
  application_id: IdString
  provider: string
  status: string
  score?: number
  report_data?: Record<string, any>
  created_at: string
}

// API Response Types
export type CreateTenantResponse = ApiItemResponse<Tenant>
export type UpdateTenantResponse = ApiItemResponse<Tenant>
export type GetTenantResponse = ApiItemResponse<Tenant>
export type ListTenantsResponse = ApiListResponse<Tenant>
export type CreatePaymentResponse = ApiItemResponse<Payment>
export type ListTenantPaymentsResponse = ApiListResponse<Payment>
export type ListTenantLeasesResponse = ApiListResponse<LeaseRef>

// Prospects API Responses
export type CreateProspectResponse = ApiItemResponse<Prospect>
export type UpdateProspectResponse = ApiItemResponse<Prospect>
export type GetProspectResponse = ApiItemResponse<Prospect>
export type ListProspectsResponse = ApiListResponse<Prospect>
export type MoveProspectResponse = ApiItemResponse<Prospect>

// Applications API Responses
export type CreateApplicationResponse = ApiItemResponse<Application>
export type UpdateApplicationResponse = ApiItemResponse<Application>
export type GetApplicationResponse = ApiItemResponse<Application>
export type ListApplicationsResponse = ApiListResponse<Application>
export type ApproveApplicationResponse = ApiItemResponse<Application>
export type RejectApplicationResponse = ApiItemResponse<Application>

// Guarantors API Responses
export type CreateGuarantorResponse = ApiItemResponse<Guarantor>
export type UpdateGuarantorResponse = ApiItemResponse<Guarantor>
export type GetGuarantorResponse = ApiItemResponse<Guarantor>
export type ListGuarantorsResponse = ApiListResponse<Guarantor>

// Matching API Responses
export type GetMatchingRecommendationsResponse = ApiListResponse<UnitRecommendation>
export type ReserveUnitResponse = ApiItemResponse<{ message: string; reservationId: string }>

// Analytics API Responses
export type GetFunnelAnalyticsResponse = ApiListResponse<FunnelDataPoint>
export type GetApprovalTimeAnalyticsResponse = ApiListResponse<ApprovalTimeDataPoint>
export type GetRetentionAnalyticsResponse = ApiListResponse<RetentionDataPoint>
export type GetConversionAnalyticsResponse = ApiListResponse<ConversionDataPoint>
export type GetRevenueAnalyticsResponse = ApiItemResponse<RevenueDataPoint>

// Settings API Responses
export type GetTenantSettingsResponse = ApiItemResponse<TenantSettings>
export type UpdateTenantSettingsResponse = ApiItemResponse<TenantSettings>

// Documents API Responses
export type UploadTenantDocumentResponse = ApiItemResponse<TenantDocument>
export type ListTenantDocumentsResponse = ApiListResponse<TenantDocument>

// Communications API Responses
export type LogCommunicationResponse = ApiItemResponse<Communication>
export type ListCommunicationsResponse = ApiListResponse<Communication>

// Selection API Responses
export type ListSelectionReviewsResponse = ApiListResponse<SelectionReview>
export type ApproveSelectionResponse = ApiItemResponse<SelectionReview>
export type RejectSelectionResponse = ApiItemResponse<SelectionReview>

// Screening API Responses
export type RequestScreeningResponse = ApiItemResponse<{ message: string; screeningId: string }>
export type GetScreeningReportResponse = ApiItemResponse<ScreeningReport>
