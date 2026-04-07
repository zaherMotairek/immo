import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Compliance Issue Types
export type ComplianceIssueType = 'missing_mandate' | 'lease_without_insurance' | 'service_expiring' | 'signature_overdue' | 'document_missing'

// Compliance Issue Entity
export interface ComplianceIssue {
  id: IdString
  tenant_id: IdString
  type: ComplianceIssueType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  related_entity_id?: IdString
  related_entity_type?: string
  due_date?: string
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  meta_json?: any
}

// Missing Mandate Issue
export interface MissingMandateIssue extends ComplianceIssue {
  type: 'missing_mandate'
  related_entity_type: 'owner' | 'property'
  related_entity_id: IdString
  owner_name?: string
  property_name?: string
}

// Lease Without Insurance Issue
export interface LeaseWithoutInsuranceIssue extends ComplianceIssue {
  type: 'lease_without_insurance'
  related_entity_type: 'lease'
  related_entity_id: IdString
  lease_number?: string
  tenant_name?: string
  property_name?: string
}

// Service Expiring Issue
export interface ServiceExpiringIssue extends ComplianceIssue {
  type: 'service_expiring'
  related_entity_type: 'service_contract'
  related_entity_id: IdString
  service_type?: string
  provider_name?: string
  property_name?: string
  expires_in_days?: number
}

// Signature Overdue Issue
export interface SignatureOverdueIssue extends ComplianceIssue {
  type: 'signature_overdue'
  related_entity_type: 'signature_envelope'
  related_entity_id: IdString
  contract_type?: string
  days_overdue?: number
}

// Document Missing Issue
export interface DocumentMissingIssue extends ComplianceIssue {
  type: 'document_missing'
  related_entity_type: 'contract'
  related_entity_id: IdString
  document_type?: string
  contract_type?: string
}

// Compliance Summary
export interface ComplianceSummary {
  total_issues: number
  issues_by_type: Record<ComplianceIssueType, number>
  issues_by_severity: Record<'low' | 'medium' | 'high' | 'critical', number>
  critical_issues: number
  overdue_count: number
  last_updated: string
}

// Response Types
export type ListMissingMandatesResponse = ApiListResponse<MissingMandateIssue>
export type ListLeasesWithoutInsuranceResponse = ApiListResponse<LeaseWithoutInsuranceIssue>
export type ListServicesExpiringResponse = ApiListResponse<ServiceExpiringIssue>
export type GetComplianceSummaryResponse = ApiItemResponse<ComplianceSummary>
export type ListComplianceIssuesResponse = ApiListResponse<ComplianceIssue>

// List Parameters
export interface ListComplianceIssuesParams {
  page?: number
  pageSize?: number
  q?: string
  type?: ComplianceIssueType
  severity?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'open' | 'in_progress' | 'resolved' | 'dismissed'
  overdue?: boolean
  sort?: string
}
