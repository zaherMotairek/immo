import type { ApiItemResponse, ApiListResponse, IdString } from './common'

// Enums matching backend
export type CollectionSlotStatus = 'planifie' | 'confirme' | 'effectue' | 'annule'

// Schedule Collection Request
export interface ScheduleCollectionRequest {
  tenantId: IdString
  slotStart: string // ISO timestamp
  slotEnd: string // ISO timestamp
  reason: string
}

// Validate Collection Request
export interface ValidateCollectionRequest {
  confirmedBy: string
  notes?: string
}

// Mark Done Collection Request
export interface MarkDoneCollectionRequest {
  result: string
  collectedAmount?: number
  notes?: string
}

// Collection Slot Entity
export interface CollectionSlot {
  id: IdString
  tenant_id: IdString
  tenant_person_id: IdString
  agent_id: IdString
  slot_start: string
  slot_end: string
  reason: string
  status: CollectionSlotStatus
  meta_json?: any
}

// Response Types
export type ScheduleCollectionResponse = ApiItemResponse<CollectionSlot>
export type GetCollectionResponse = ApiItemResponse<CollectionSlot>
export type ListCollectionsResponse = ApiListResponse<CollectionSlot>
export type ValidateCollectionResponse = ApiItemResponse<CollectionSlot>
export type MarkDoneCollectionResponse = ApiItemResponse<CollectionSlot>

// List Parameters
export interface ListCollectionsParams {
  page?: number
  pageSize?: number
  q?: string
  status?: CollectionSlotStatus
  tenantId?: IdString
  agentId?: IdString
  dateFrom?: string
  dateTo?: string
  sort?: string
}
