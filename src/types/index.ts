import { Timestamp } from 'firebase/firestore';

export interface AppError {
  message: string;
  code?: string; // Firebase errors often have a 'code' property
}

export interface CreateInvitationResponse {
  success: boolean;
  invitationId?: string; // Present on business logic success
  message?: string; // Present on business logic error, or optionally on success
}

export interface CreatePropertyResponse {
  success: boolean;
  propertyId?: string; // Present on business logic success
  message?: string; // Present on business logic error, or optionally on success
}

export interface SignUpWithInvitationResponse {
  success: boolean;
  message?: string; // Present on business logic error, or optionally on success
}

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  // country?: string; // Optional, if needed
}
export interface Vehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  unit?: string;
}

export interface Resident {
  id: string; // Firestore document ID (matches Firebase Auth UID)
  displayName: string;
  email: string; // Should match Firebase Auth email
  organizationId: string;
  propertyId: string;
  address?: Address;
  roles: string[]; // Should include "resident"
  leaseStartDate?: Timestamp | Date | null;
  leaseEndDate?: Timestamp | Date | null;
  invitedBy?: string; // UID of the user who invited them
  createdAt: Timestamp | Date;
  phone?: string; // Resident's primary contact phone number
  // Vehicle Information
  vehicles?: Vehicle[];
  // Add other resident-specific fields as needed
}

export interface Property {
  id: string; // Firestore document ID
  name: string;
  address: PropertyAddress;
  addresses?: Address[];
  type: string; // e.g., "residential", "commercial"
  managedBy?: string; // UID of the property manager
  organizationId: string; // ID of the organization this property belongs to
  createdAt?: Timestamp | Date; // Optional, depending on how it's handled client-side
  totalUnits?: number; // Total number of rentable units in the property
  // Add any other relevant property fields
  // other fields
}
export interface Organization {
  id: string; // Firestore document ID
  name: string;
  createdBy: string; // UID of the user who created this organization
  createdAt: Timestamp | Date;
  status: string; // e.g., "active", "trial", "suspended"
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  organizationId?: string; // For single-org users
  organizationIds?: string[]; // For multi-org users (like org managers)
  propertyId?: string; // For residents
  fcmTokens?: string[];
  // other custom claims or profile data
}

// Types for Service Request Job Details (Phoenix API Response)

export interface LocationPoint {
  crs: {
    type: string;
    properties: {
      name: string;
    };
  };
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface PhoenixUser {
  fullName: string;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roles: string[];
  referralCode: string | null;
  referralCodeUsed: number;
  otp: string | null;
  otpExpiration: string | null;
  banned: boolean;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  location: LocationPoint;
  lastGeolocationUpdate: string; // ISO Date string
  darkMode: boolean;
  avatar: string;
  onboarded: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  deletedAt: string | null; // ISO Date string
}

export interface AddressData {
  short: string;
  id: number;
  address_1: string;
  address_2: string | null;
  city: string;
  state: string;
  zipcode: string; // API shows number, but zipcode can have leading zeros
  lat: number;
  lng: number;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export interface CarData {
  concat: string;
  id: number;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  vin: string | null;
  CustomerId: number;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export interface PaymentData {
  id: number;
  amount: number;
  received: number;
  tip: number;
  type: string;
  termsAccepted: boolean;
  signature: string | null;
  printedName: string | null;
  ipAddress: string | null;
  transactionId: string | null;
  authorizationCode: string | null;
  refundAmount: number | null;
  collectedAmount: number | null;
  voidedAt: string | null; // ISO Date string
  status: string | null;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  JobId: number;
  UserId: number;
  voidedById: number | null;
}

export interface InvoiceData {
  id: number;
  linkCode: string;
  status: string;
  total: number;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  JobId: number;
}

export interface PayoutData {
  id: number;
  amount: number;
  type: string;
  transactionId: string | null;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  JobId: number;
  PaycheckId: number | null;
  UserId: number;
  User: PhoenixUser;
}

export interface CustomerPhoneData {
  id: number;
  number: string;
  note: string | null;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  CustomerId: number;
}

export interface CustomerData {
  fullName: string;
  concat: string;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  defaultPhoneId: number;
  CustomerPhones: CustomerPhoneData[];
  defaultPhone: CustomerPhoneData;
}

export interface ServiceData {
  id: number;
  name: string;
  description: string;
  payoutRate: number;
  payoutMinimum: number;
  price: number;
  isDefault: boolean | null;
  isInternal: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  deletedAt: string | null; // ISO Date string
}

export interface JobLineItemData {
  id: number;
  price: number;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  JobId: number;
  ServiceId: number;
  Service: ServiceData;
}

export interface JobActionData {
  id: number;
  action: string; // This can contain HTML
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  JobId: number;
  UserId: number;
  User: PhoenixUser;
}

export interface ProxyData {
  // Structure based on technician tracker Vue component
  ProxyNumber?: {
    number: string;
  };
  // other proxy fields if known
}

export interface Job {
  id: number;
  status:
    | 'pending'
    | 'assigned'
    | 'en-route'
    | 'in-progress'
    | 'completed'
    | 'canceled'
    | string; // Allow other strings for future statuses
  paymentStatus: string;
  linkCode: string;
  arrivalTime: string; // ISO Date string
  completedAt: string | null; // ISO Date string
  canceledAt: string | null; // ISO Date string
  notes: string;
  taskSid: string | null;
  conversationSid: string | null;
  flexInteractionSid: string | null;
  referralCode: string | null;
  sourceMeta: {
    resident: {
      uid: string;
      email: string;
      displayName: string;
    };
    propertyId: string;
    organizationId: string;
    applicationName: string;
  };
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  deletedAt: string | null; // ISO Date string
  CarId: number;
  CustomerId: number;
  FormSubmissionId: number;
  dispatcherId: number;
  assignedTechnicianId: number;
  AddressId: number;
  Address: AddressData;
  Car: CarData;
  Payments: PaymentData[];
  Invoices: InvoiceData[];
  Discounts: unknown[]; // Define if structure is known
  Payouts: PayoutData[];
  dispatcher: PhoenixUser;
  assignedTechnician: PhoenixUser;
  Customer: CustomerData;
  JobLineItems: JobLineItemData[];
  JobActions: JobActionData[];
  proxy: ProxyData | null;
  // JobComments: JobCommentData[]; // Or any[]
  // JobFiles: any[]; // Define if structure is known
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

export type ServiceRequestStatus =
  | 'submitted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export interface ServiceRequest {
  id?: string;
  propertyId: string;
  residentId: string;
  residentName?: string;
  requestType: string; // Comma-separated string of service names
  description: string;
  residentNotes?: string;
  status: ServiceRequestStatus;
  submittedAt: Timestamp | Date; // Firestore Timestamp
  serviceDateTime?: Timestamp | Date | string | null; // Firestore Timestamp or ISO string
  phone?: string;
  serviceLocation?: string; // Full address string
  serviceLocationData?: {
    // Structured address from Google Places
    address_1?: string;
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
    fullAddress?: string;
  };
  smsConsent?: boolean;
  phoenixSubmissionId?: string | null; // ID from Phoenix API
  isOffPremise?: boolean; // New: Indicates if the request was for an off-premise location
  completedAt?: Timestamp | Date | string | null; // Firestore Timestamp
  organizationId: string; // Added for easier querying/rules
}

export type ViolationStatus =
  | 'reported'
  | 'claimed'
  | 'acknowledged'
  | 'resolved'
  | 'pending_tow'
  | 'towed';
export type ViolationType =
  | 'fire_lane'
  | 'unauthorized_parking'
  | 'blocking_driveway'
  | 'double_parked'
  | 'other';

export interface Violation {
  id: string;
  reporterId: string;
  residentId?: string; // Optional: ID of the resident associated with the license plate
  propertyId: string;
  organizationId: string;
  licensePlate: string;
  status: ViolationStatus;
  violationType: ViolationType;
  createdAt: Timestamp | { _seconds: number; _nanoseconds: number }; // Allow for serialized Timestamp
  claimedAt?: Timestamp | { _seconds: number; _nanoseconds: number }; // Allow for serialized Timestamp
  acknowledgedAt?: Timestamp | { _seconds: number; _nanoseconds: number }; // Allow for serialized Timestamp
  photoUrl: string; // Optional: URL of the violation photo
  // Add other fields from your data structure as needed
}

export interface GetViolationsResponse {
  violations: Violation[];
  total: number;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  mobileLink?: string;
  status?: 'pending' | 'sent' | 'failed';
  createdAt: Timestamp;
  read: boolean;
}

export interface PropertyNotification {
  id: string;
  title: string;
  message: string; // Maps to 'body'
  createdAt: Timestamp;
  createdBy: string;
  link?: string;
  mobileLink?: string;
  violationId?: string;
  vehicle?: {
    licensePlate: string;
  };
  // This type won't have a 'read' status in its own document,
  // it will be managed in a user-specific subcollection.
}

// This is the unified type that the UI will work with.
export interface Notification extends Omit<UserNotification, 'userId' | 'status'> {
  // All fields from UserNotification except userId and status
  // It can represent either a UserNotification or a PropertyNotification
  // after being processed by the context.
}
