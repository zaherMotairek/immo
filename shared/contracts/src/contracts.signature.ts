import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type SignatureStatus = 'brouillon' | 'envoye' | 'en_attente' | 'signe' | 'refuse' | 'expire'
export type ContractType = 'mandat_gestion' | 'bail_location' | 'service_entretien' | 'assurance_habitation' | 'assurance_batiment'

// Send for Signature Request
export interface SendForSignatureRequest {
  docKey: string
  type: ContractType
  parties?: any[]
  provider?: string
  dueAt?: string
  meta?: any
}

// Remind Request
export interface RemindSignatureRequest {
  message?: string
}

// Cancel Request
export interface CancelSignatureRequest {
  reason?: string
}

// Webhook Request (from signature provider)
export interface SignatureWebhookRequest {
  eventType: string
  envelopeId: string
  status: SignatureStatus
  data: any
}

// Signature Envelope Entity
export interface SignatureEnvelope {
  id: IdString
  tenant_id: IdString
  doc_key: string
  contract_type: ContractType
  parties_json: any
  status: SignatureStatus
  sent_at?: string
  due_at?: string
  provider: string
  provider_envelope_id?: string
  last_error?: string
  meta_json?: any
  created_at: string
  updated_at?: string
}

// Response Types
export type SendForSignatureResponse = ApiItemResponse<SignatureEnvelope>
export type ListSignatureEnvelopesResponse = ApiListResponse<SignatureEnvelope>
export type RemindSignatureResponse = ApiItemResponse<{ reminded: boolean }>
export type CancelSignatureResponse = ApiItemResponse<SignatureEnvelope>
export type SignatureWebhookResponse = ApiItemResponse<{ received: boolean }>

// List Parameters
export interface ListSignatureEnvelopesParams {
  page?: number
  pageSize?: number
  q?: string
  status?: SignatureStatus
  type?: ContractType
  dueBefore?: string
  sort?: string
}
