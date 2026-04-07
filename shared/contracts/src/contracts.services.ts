import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type ServiceContractStatus = 'brouillon' | 'actif' | 'suspendu' | 'resilie' | 'expire'
export type ServiceContractType = 'service_entretien' | 'eau' | 'electricite' | 'securite' | 'nettoyage' | 'jardinage' | 'piscine' | 'autre_service'
export type RenewalType = 'aucun' | 'auto' | 'manuel'
export type PaymentFrequency = 'mensuel' | 'trimestriel' | 'annuel'
export type PaymentMethod = 'virement' | 'cheque' | 'especes' | 'carte' | 'mobile_money'
export type InvoiceRecipient = 'agence' | 'proprietaire' | 'locataire'

// Create Service Contract Request
export interface CreateServiceContractRequest {
  type: ServiceContractType
  providerId: IdString
  propertyId: IdString
  contractNumber?: string
  status?: ServiceContractStatus
  startDate: string
  endDate?: string
  renewalType?: RenewalType
  sla?: {
    responseHours?: number
    resolutionHours?: number
    scope?: string
  }
  billing: {
    amount: number
    currency?: string
    frequency?: PaymentFrequency
    paymentMethod?: PaymentMethod
    invoiceRecipient?: InvoiceRecipient
  }
  attachments?: any[]
}

// Update Service Contract Request
export interface UpdateServiceContractRequest {
  endDate?: string
  status?: ServiceContractStatus
  sla?: {
    responseHours?: number
    resolutionHours?: number
    scope?: string
  }
  billing?: {
    amount?: number
    currency?: string
    frequency?: PaymentFrequency
    paymentMethod?: PaymentMethod
    invoiceRecipient?: InvoiceRecipient
  }
}

// Renew Service Contract Request
export interface RenewServiceContractRequest {
  newEndDate?: string
  renewalType?: RenewalType
}

// Terminate Service Contract Request
export interface TerminateServiceContractRequest {
  endDate?: string
  reason?: string
}

// Service Contract Entity
export interface ServiceContract {
  id: IdString
  tenant_id: IdString
  contract_number: string
  type: ServiceContractType
  status: ServiceContractStatus
  provider_id: IdString
  property_id: IdString
  start_date: string
  end_date?: string
  renewal_type: RenewalType
  sla_response_hours?: number
  sla_resolution_hours?: number
  scope?: string
  amount: number
  currency: string
  frequency: PaymentFrequency
  payment_method: PaymentMethod
  invoice_recipient: InvoiceRecipient
  documents_json?: any
  history_json?: any
  meta_json?: any
  created_at: string
  updated_at?: string
  
  // Relations
  property?: {
    id: IdString
    name?: string
    address_line?: string
  }
}

// Response Types
export type CreateServiceContractResponse = ApiItemResponse<ServiceContract>
export type UpdateServiceContractResponse = ApiItemResponse<ServiceContract>
export type GetServiceContractResponse = ApiItemResponse<ServiceContract>
export type ListServiceContractsResponse = ApiListResponse<ServiceContract>
export type RenewServiceContractResponse = ApiItemResponse<ServiceContract>
export type TerminateServiceContractResponse = ApiItemResponse<ServiceContract>

// List Parameters
export interface ListServiceContractsParams {
  page?: number
  pageSize?: number
  q?: string
  type?: ServiceContractType
  status?: ServiceContractStatus
  providerId?: IdString
  propertyId?: IdString
  endBefore?: string
  sort?: string
}
