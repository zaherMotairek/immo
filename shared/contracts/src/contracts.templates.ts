import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type ContractType = 'mandat_gestion' | 'bail_location' | 'service_entretien' | 'assurance_habitation' | 'assurance_batiment'

// Create Template Request
export interface CreateTemplateRequest {
  name: string
  type: ContractType
  placeholders?: string[]
  contentRtf: string
  meta?: any
}

// Update Template Request
export interface UpdateTemplateRequest {
  name?: string
  type?: ContractType
  placeholders?: string[]
  contentRtf?: string
  meta?: any
}

// Contract Template Entity
export interface ContractTemplate {
  id: IdString
  tenant_id: IdString
  name: string
  type: ContractType
  placeholders: string[]
  content_rtf: string
  meta_json?: any
  created_at: string
  updated_at?: string
}

// Response Types
export type CreateTemplateResponse = ApiItemResponse<ContractTemplate>
export type UpdateTemplateResponse = ApiItemResponse<ContractTemplate>
export type GetTemplateResponse = ApiItemResponse<ContractTemplate>
export type ListTemplatesResponse = ApiListResponse<ContractTemplate>

// List Parameters
export interface ListTemplatesParams {
  page?: number
  pageSize?: number
  q?: string
  type?: ContractType
  sort?: string
}
