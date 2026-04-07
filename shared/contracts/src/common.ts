export interface PaginationRequest {
  page?: number
  limit?: number
}

export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListResponse<T> {
  data: T[]
  pagination: PaginationResponse
}

export interface ApiItemResponse<T> {
  data: T
  message?: string
}

export type IdString = string
export type BigIntString = string
export type DecimalString = string
export type IsoDateString = string
