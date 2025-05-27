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

export interface Resident {
  id: string; // Firestore document ID (matches Firebase Auth UID)
  displayName: string;
  email: string; // Should match Firebase Auth email
  organizationId: string;
  propertyId: string;
  unitNumber?: string;
  roles: string[]; // Should include "resident"
  leaseStartDate?: Timestamp | Date | null;
  leaseEndDate?: Timestamp | Date | null;
  invitedBy?: string; // UID of the user who invited them
  createdAt: Timestamp | Date;
  // Vehicle Information
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  // Add other resident-specific fields as needed
}

export type ServiceRequestStatus = 
  | 'submitted' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold';

export interface Organization {
  id: string; // Firestore document ID
  name: string;
  createdBy: string; // UID of the user who created this organization
  createdAt: Timestamp | Date;
  status: string; // e.g., "active", "trial", "suspended"
}

export interface ServiceRequest {
  id: string; // Firestore document ID
  organizationId: string;
  propertyId: string;
  residentId: string; // UID of the resident making the request
  residentName?: string; // Denormalized for easier display
  unitNumber?: string; // Denormalized for easier display
  requestType: string; // e.g., "maintenance", "amenity_booking", "general_inquiry"
  description: string;
  status: ServiceRequestStatus;
  submittedAt: Timestamp | Date;
  serviceDateTime?: Timestamp | Date; // Desired date and time of service
  phone?: string; // Contact phone for the service
  serviceLocation?: string; // Location where service is needed
  residentNotes?: string; // Initial notes from the resident
  assignedTo?: string; // UID of an org user (PM or staff)
  assignedToName?: string; // Denormalized
  completedAt?: Timestamp | Date;
  notes?: Array<{ // This is more for a log of updates by staff/system
    userId: string;
    userName: string;
    note: string;
    timestamp: Timestamp | Date;
  }>;
  // Add other relevant fields like priority, images, etc.
}
