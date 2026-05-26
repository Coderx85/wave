/**
 * Sign In DTO (Data Transfer Object)
 * 
 * Request and Response objects for the SignIn use case.
 * These objects cross the boundary between HTTP layer and business logic.
 */

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  userId?: string;
  email?: string;
  sessionToken?: string;
  error?: string;
}
