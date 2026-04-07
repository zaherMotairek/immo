import type { ApiItemResponse } from './common'

// Run Owner Payouts Request
export interface RunOwnerPayoutsRequest {
  period?: {
    start: string // ISO date string
    end: string // ISO date string
  }
  ownerIds?: string[]
  dryRun?: boolean
}

// Send Reminders Request
export interface SendRemindersRequest {
  types?: string[]
  daysBefore?: number
  dryRun?: boolean
}

// Response Types
export type RunOwnerPayoutsResponse = ApiItemResponse<{ 
  processed: number
  generated: number
  errors: number
  results: any[]
}>

export type SendRemindersResponse = ApiItemResponse<{
  sent: number
  failed: number
  results: any[]
}>
