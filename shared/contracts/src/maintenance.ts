import type { ApiItemResponse } from './common'

export interface CreateTicketRequest {
  ticketNumber: string
  status: 'ouvert' | 'en_cours' | 'resolu'
  priority: 'faible' | 'normal' | 'eleve'
  category: string
}

export interface Ticket {
  id: string
  ticketNumber: string
  status: 'ouvert' | 'en_cours' | 'resolu'
  priority: 'faible' | 'normal' | 'eleve'
  category: string
}

export type CreateTicketResponse = ApiItemResponse<Ticket>
