export interface AppError {
  message: string;
  code?: string; // Firebase errors often have a 'code' property
}

export interface CreateInvitationResponse {
  success: boolean;
  invitationId?: string; // Present on business logic success
  message?: string;      // Present on business logic error, or optionally on success
}

export interface CreatePropertyResponse {
  success: boolean;
  propertyId?: string; // Present on business logic success
  message?: string;    // Present on business logic error, or optionally on success
}

export interface SignUpWithInvitationResponse {
  success: boolean;
  message?: string;    // Present on business logic error, or optionally on success
}
