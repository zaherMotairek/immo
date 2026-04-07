import type { ApiItemResponse, IdString } from './common'

// Login Request/Response
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  user: AuthUser
}

export interface AuthUser {
  id: IdString
  email: string
  full_name: string
  tenant_id: IdString
  role: string
}

// Profile Response
export interface UserProfile {
  user: AuthUser
}

// Validation Response
export interface TokenValidation {
  valid: boolean
  user: AuthUser
}

// Logout Response
export interface LogoutResponse {
  message: string
}

// Refresh Token Request/Response
export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token?: string
}

// Password Change Request
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ChangePasswordResponse {
  message: string
}

// Forgot Password Request
export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

// Reset Password Request
export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface ResetPasswordResponse {
  message: string
}

// API Response Types
export type LoginApiResponse = ApiItemResponse<LoginResponse>
export type UserProfileApiResponse = ApiItemResponse<UserProfile>
export type TokenValidationApiResponse = ApiItemResponse<TokenValidation>
export type LogoutApiResponse = ApiItemResponse<LogoutResponse>
export type RefreshTokenApiResponse = ApiItemResponse<RefreshTokenResponse>
export type ChangePasswordApiResponse = ApiItemResponse<ChangePasswordResponse>
export type ForgotPasswordApiResponse = ApiItemResponse<ForgotPasswordResponse>
export type ResetPasswordApiResponse = ApiItemResponse<ResetPasswordResponse>
