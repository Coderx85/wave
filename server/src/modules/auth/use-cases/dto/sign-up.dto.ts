/**
 * Sign Up DTO (Data Transfer Object)
 * 
 * Request and Response objects for the SignUp use case.
 * These objects cross the boundary between HTTP layer and business logic.
 */

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResponse {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}
