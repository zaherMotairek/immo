import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type DocumentType = 'mandat_gestion' | 'bail_location' | 'service_entretien' | 'assurance_habitation' | 'assurance_batiment'
export type ExportFormat = 'pdf' | 'docx' | 'rtf'

// Generate Document Request
export interface GenerateDocumentRequest {
  format: ExportFormat
  templateId?: IdString
  customData?: any
  options?: {
    includeSignature?: boolean
    watermark?: string
    password?: string
  }
}

// Generate Document Response
export interface GenerateDocumentResponse {
  documentId: IdString
  downloadUrl: string
  expiresAt: string
  fileSize?: number
}

// Document Entity
export interface ContractDocument {
  id: IdString
  tenant_id: IdString
  document_type: DocumentType
  contract_id: IdString
  format: ExportFormat
  file_path: string
  file_size?: number
  generated_at: string
  expires_at?: string
  download_count: number
  meta_json?: any
  created_at: string
}

// Response Types
export type GenerateDocumentApiResponse = ApiItemResponse<GenerateDocumentResponse>
export type ListDocumentsResponse = ApiListResponse<ContractDocument>

// List Parameters
export interface ListDocumentsParams {
  page?: number
  pageSize?: number
  q?: string
  type?: DocumentType
  contractId?: IdString
  format?: ExportFormat
  sort?: string
}
