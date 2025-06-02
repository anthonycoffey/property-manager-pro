// This file contains types duplicated from the main /src/types.ts
// to be used within Cloud Functions, as they are a separate package.

// It's important to keep these types in sync with the main /src/types.ts

// Interface for structured address data, mirrored from createServiceRequest.ts
export interface ServiceLocationAddress {
  address_1: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  fullAddress: string;
}

// Using google.protobuf.Timestamp for server-side representation if needed,
// or firebase.firestore.Timestamp. For simplicity, using a generic Timestamp type
// that aligns with what Firestore expects or returns.
// Firebase Admin SDK typically uses its own Timestamp type.
import { Timestamp } from 'firebase-admin/firestore'; // Firebase Admin SDK Timestamp

// --- Campaign Types (mirrored from /src/types.ts) ---
export type CampaignStatus =
  | 'active'
  | 'inactive'
  | 'completed'
  | 'expired'
  | 'processing'
  | 'error';

export type CampaignType = 'csv_import' | 'public_link';

export interface Campaign {
  id: string; // Firestore document ID
  organizationId: string;
  propertyId: string;
  campaignName: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  rolesToAssign: string[]; // Typically ['resident']
  createdBy: string; // UID of the creator
  createdAt: Timestamp;
  maxUses?: number | null;
  totalAccepted: number;
  totalInvitedFromCsv?: number; // Only for csv_import type
  expiresAt?: Timestamp | null;
  accessUrl?: string; // Only for public_link type
  storageFilePath?: string; // Only for csv_import type
  sourceFileName?: string; // Only for csv_import type
  errorDetails?: string;
}

// --- Invitation Type (based on systemPatterns.md) ---
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string; // Firestore document ID
  email: string;
  rolesToAssign: string[];
  organizationId: string; // ID of the organization this invitation belongs to
  targetPropertyId?: string; // If for a resident
  status: InvitationStatus;
  createdBy: string; // UID of the creator
  createdAt: Timestamp;
  expiresAt: Timestamp;
  campaignId?: string; // Links to a campaign if originated from one
  // Add other relevant fields if any, e.g. name of invitee if collected
}


// --- Cloud Function Request/Response Types ---

export interface GetCampaignDetailsData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface GetCampaignDetailsResult {
  campaign: Campaign;
  invitations: Invitation[];
}

export interface UpdateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
  campaignName?: string;
  maxUses?: number | null;
  expiresAt?: Timestamp | null;
}

export interface DeactivateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface DeleteCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface ActivateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface CampaignActionResult {
  success: boolean;
  message?: string;
}


// --- Existing Types ---
export interface AppError {
  message: string;
  code?: string;
}

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
  serviceLocationData?: ServiceLocationAddress; // Optional: store the structured address
  smsConsent?: boolean; // Store SMS consent
  phoenixSubmissionId?: string | null; // Store ID from Phoenix API
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
