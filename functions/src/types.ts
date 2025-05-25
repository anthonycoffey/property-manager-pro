// This file contains types duplicated from the main /src/types.ts
// to be used within Cloud Functions, as they are a separate package.

// It's important to keep these types in sync with the main /src/types.ts

// Using google.protobuf.Timestamp for server-side representation if needed,
// or firebase.firestore.Timestamp. For simplicity, using a generic Timestamp type
// that aligns with what Firestore expects or returns.
// Firebase Admin SDK typically uses its own Timestamp type.
import { Timestamp } from 'firebase-admin/firestore'; // Firebase Admin SDK Timestamp

export interface Resident {
  id: string; 
  displayName: string;
  email: string; 
  organizationId: string;
  propertyId: string;
  unitNumber?: string;
  roles: string[]; 
  leaseStartDate?: Timestamp | Date;
  leaseEndDate?: Timestamp | Date;
  invitedBy?: string; 
  createdAt: Timestamp | Date;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
}

export type ServiceRequestStatus = 
  | 'submitted' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold';

export interface ServiceRequest {
  id: string; 
  organizationId: string;
  propertyId: string;
  residentId: string; 
  residentName?: string; 
  unitNumber?: string; 
  requestType: string; 
  description: string;
  status: ServiceRequestStatus;
  submittedAt: Timestamp | Date | FirebaseFirestore.FieldValue; // Allow FieldValue for server timestamps
  serviceDateTime?: Timestamp | Date | FirebaseFirestore.FieldValue; // Desired date and time of service
  phone?: string; // Contact phone for the service
  serviceLocation?: string; // Location where service is needed
  residentNotes?: string; // Initial notes from the resident
  assignedTo?: string; 
  assignedToName?: string; 
  completedAt?: Timestamp | Date | FirebaseFirestore.FieldValue; // Allow FieldValue
  notes?: Array<{ // This is more for a log of updates by staff/system
    userId: string;
    userName: string;
    note: string;
    timestamp: Timestamp | Date | FirebaseFirestore.FieldValue; // Allow FieldValue
  }>;
}
