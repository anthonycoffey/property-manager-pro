// Existing types (if any, keep them)

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
}

export interface Resident {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  unitNumber?: string;
  profilePictureUrl?: string;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  organizationId?: string;
  propertyId?: string;
  vehicles?: Vehicle[]; // Updated to array
}

export interface Property {
  id?: string;
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    fullAddress?: string; // For display
    // Potentially add lat/lng if needed directly on property
  };
  organizationId?: string;
  propertyManagerId?: string;
  imageUrl?: string;
  totalUnits?: number; // Added for dashboard stats
  type?: string; // Added property type e.g. Residential/Commercial
  // other fields
}

export interface Organization {
  id?: string;
  name?: string;
  // other fields
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  organizationId?: string; // For single-org users
  organizationIds?: string[]; // For multi-org users (like org managers)
  propertyId?: string; // For residents
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

export interface JobCommentData {
  // Define if structure is known, otherwise use any or a generic object
  // For now, assuming it's an array of any if not detailed
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
  JobFiles: any[]; // Define if structure is known
  Car: CarData;
  Payments: PaymentData[];
  Invoices: InvoiceData[];
  Discounts: any[]; // Define if structure is known
  Payouts: PayoutData[];
  JobComments: JobCommentData[]; // Or any[]
  dispatcher: PhoenixUser;
  assignedTechnician: PhoenixUser;
  Customer: CustomerData;
  JobLineItems: JobLineItemData[];
  JobActions: JobActionData[];
  proxy: ProxyData | null;
}

// Campaign related types (ensure these are present if not already)
export interface Campaign {
  id: string;
  campaignName: string;
  campaignType: 'csv_import' | 'public_link';
  status: 'active' | 'inactive' | 'expired' | 'limit_reached';
  rolesToAssign: string[]; // e.g., ['resident']
  createdBy: string; // UID of the creator
  createdAt: any; // Firestore Timestamp
  organizationId: string;
  propertyId: string; // ID of the property this campaign is for
  maxUses?: number;
  totalAccepted?: number;
  expiresAt?: any; // Firestore Timestamp
  storageFilePath?: string; // For CSV imports
  accessUrl?: string; // For public links
  totalInvitedFromCsv?: number;
}

export interface Invitation {
  id: string;
  email: string;
  rolesToAssign: string[];
  organizationId: string; // The organization this invitation belongs to
  targetPropertyId?: string; // If inviting a resident to a specific property
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdBy: string; // UID of the user who created the invitation
  createdAt: any; // Firestore Timestamp
  expiresAt?: any; // Firestore Timestamp
  campaignId?: string; // Link to the campaign, if applicable
  acceptedBy?: string; // UID of the user who accepted
  acceptedAt?: any; // Firestore Timestamp
  name?: string; // Optional name for the invitee
  invitationType?: 'resident' | 'property_manager' | 'organization_manager'; // To distinguish types
}

// Service Request type for Firestore (ensure this is present if not already)
export interface ServiceRequest {
  id?: string;
  propertyId: string;
  residentId: string;
  residentName?: string;
  unitNumber?: string;
  requestType: string; // Comma-separated string of service names
  description: string;
  residentNotes?: string;
  status: 'submitted' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  submittedAt: any; // Firestore Timestamp
  serviceDateTime?: any; // Firestore Timestamp or ISO string
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
  assignedTo?: string; // UID of assigned technician/staff
  assignedToName?: string;
  completedAt?: any; // Firestore Timestamp
  notes?: Array<{
    userId: string;
    userName: string;
    note: string;
    timestamp: any;
  }>;
  organizationId: string; // Added for easier querying/rules
}

// Add other existing types below if this file already had content.
// If this is a new file or overwriting, this is the full content.

export interface AppError {
  message: string;
  code?: string; // Optional error code
}

export interface CreatePropertyResponse {
  success: boolean;
  message?: string;
  propertyId?: string;
}
