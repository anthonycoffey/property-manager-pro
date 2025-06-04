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
  totalUnits?: number; // Total number of rentable units in the property
  // Add any other relevant property fields
}

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
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
  vehicles?: Vehicle[];
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
  createdAt: Timestamp; // Firestore Timestamp for consistency with backend
  maxUses?: number | null;
  totalAccepted: number;
  totalInvitedFromCsv?: number; // Only for csv_import type
  expiresAt?: Timestamp | null; // Firestore Timestamp
  accessUrl?: string; // Only for public_link type
  storageFilePath?: string; // Only for csv_import type
  sourceFileName?: string; // Only for csv_import type
  errorDetails?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string; // Firestore document ID
  email?: string; // Email can be undefined for public campaign invites initially
  rolesToAssign: string[];
  organizationId: string; 
  targetPropertyId?: string; // If for a resident
  status: InvitationStatus;
  createdBy: string; // UID of the creator
  createdAt: Timestamp; // Firestore Timestamp
  expiresAt: Timestamp; // Firestore Timestamp
  campaignId?: string; // Links to a campaign if originated from one
  // Add other relevant fields if any, e.g. name of invitee if collected
}

export interface CampaignActionResult {
  success: boolean;
  message?: string;
}

// --- Cloud Function Data Payloads (mirrored from functions/src/types.ts for frontend use) ---

export interface UpdateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
  campaignName?: string;
  maxUses?: number | null;
  expiresAt?: Timestamp | null; // Frontend might send Date, Cloud Function converts to Timestamp
}

export interface DeactivateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface ActivateCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}

export interface DeleteCampaignData {
  campaignId: string;
  organizationId: string;
  propertyId: string;
}
