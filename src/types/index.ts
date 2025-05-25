import { Timestamp } from 'firebase/firestore';

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

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  // country?: string; // Optional, if needed
}

export interface Property {
  id: string; // Firestore document ID
  name: string;
  address: PropertyAddress;
  type: string; // e.g., "residential", "commercial"
  managedBy?: string; // UID of the property manager
  organizationId: string; // ID of the organization this property belongs to
  createdAt?: Timestamp | Date; // Optional, depending on how it's handled client-side
  // Add any other relevant property fields
}
