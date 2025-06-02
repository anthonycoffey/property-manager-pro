import { https } from 'firebase-functions/v1'; // Correct import for https namespace
import { CallableContext } from 'firebase-functions/v1/https'; // Correct import for types
import { db } from '../firebaseAdmin.js'; // Import db
import { FieldValue as FirebaseAdminFieldValue } from 'firebase-admin/firestore'; // Import FieldValue directly and alias
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import type {
  ServiceRequest,
  ServiceRequestStatus,
  Resident,
} from '../types.js'; // Import from local types.ts
import fetch from 'node-fetch'; // For making HTTP requests

// Updated interface to match frontend payload
interface ServiceLocationAddress {
  address_1: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  fullAddress: string;
}

interface CreateServiceRequestData {
  organizationId: string;
  propertyId: string;
  residentNotes?: string;
  serviceDateTime: string; // ISO string from client
  phone?: string;
  description: string; // Kept for now, can be merged with residentNotes if needed

  // New fields from frontend
  smsConsent: boolean;
  serviceLocationAddress: ServiceLocationAddress;
  serviceTypes: Array<{ id: number | string; value: string }>; // Updated for multi-select
}

export const createServiceRequest = https.onCall(
  async (data: CreateServiceRequestData, context: CallableContext) => {
    if (!context.auth) {
      throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { uid: residentId } = context.auth;
    const {
      organizationId: tokenOrgId,
      propertyId: tokenPropId,
      roles,
      name: residentNameFromToken,
    } = context.auth.token;

    if (!tokenOrgId || !tokenPropId) {
      throw handleHttpsError(
        'failed-precondition',
        'User is not associated with an organization or property via token.'
      );
    }

    if (tokenOrgId !== data.organizationId || tokenPropId !== data.propertyId) {
      throw handleHttpsError(
        'permission-denied',
        'Token organization/property ID does not match request data.'
      );
    }

    if (!roles?.includes('resident')) {
      throw handleHttpsError(
        'permission-denied',
        'User does not have permission to create a service request.'
      );
    }

    if (
      !data.serviceTypes || data.serviceTypes.length === 0 || // Updated validation
      !data.serviceLocationAddress ||
      !data.serviceLocationAddress.fullAddress?.trim() ||
      !data.serviceDateTime ||
      !data.phone?.trim() // Added phone to required check based on frontend form
    ) {
      throw handleHttpsError(
        'invalid-argument',
        'At least one service type, service location, service date/time, and phone are required.'
      );
    }
    
    const PHOENIX_API_URL_BACKEND = process.env.PHOENIX_API_URL;
    if (!PHOENIX_API_URL_BACKEND) {
      console.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error. Please contact support.');
    }

    // Fetch resident's unitNumber and potentially a more definitive displayName
    let residentDisplayName = residentNameFromToken || 'N/A';
    // let unitNumber: string | undefined;

    const residentDocRef = db.doc(
      `organizations/${data.organizationId}/properties/${data.propertyId}/residents/${residentId}`
    );
    try {
      const residentDocSnap = await residentDocRef.get();
      
      if (residentDocSnap.exists) {
        const residentData = residentDocSnap.data() as Resident;
        residentDisplayName = residentData.displayName || residentDisplayName;
        // unitNumber = residentData.unitNumber;
      } else {
        console.warn(
          `Resident document not found for ${residentId} during service request creation. Using token name.`
        );
      }
    } catch (err) {
      console.error(`Error fetching resident details for ${residentId}:`, err);
      // Continue, but name/unit might be less accurate
    }

    const serviceRequestCollectionRef = db.collection(
      `organizations/${data.organizationId}/services`
    );

    const newServiceRequest: Omit<ServiceRequest, 'id'> = {
      organizationId: data.organizationId,
      propertyId: data.propertyId,
      residentId: residentId,
      residentName: residentDisplayName,
      // unitNumber: unitNumber,
      // For Firestore, store a comma-separated list of names, or just the first one.
      // Alternatively, update ServiceRequest type to store an array of names/objects.
      // For now, using a comma-separated string of names.
      requestType: data.serviceTypes.map(st => st.value).join(', '), 
      description: data.description?.trim() || '', 
      residentNotes: data.residentNotes?.trim(),
      serviceDateTime: new Date(data.serviceDateTime), // Store as Timestamp
      phone: data.phone?.trim(),
      // Store structured address or just the full string, or both
      serviceLocation: data.serviceLocationAddress.fullAddress, 
      serviceLocationData: data.serviceLocationAddress, // Optional: store the whole object
      status: 'submitted' as ServiceRequestStatus,
      submittedAt: FirebaseAdminFieldValue.serverTimestamp(),
      smsConsent: data.smsConsent, // Store consent
      // phoenixSubmissionId: phoenixSubmissionId, // Store Phoenix ID
      // assignedTo, completedAt, notes will be set later
    };
    
    // 1. Construct Phoenix API Payload
    const phoenixPayload = {
      submission: [
        { name: "full_name", value: residentDisplayName },
        { name: "phone", value: data.phone ? data.phone.trim() : "" }, // Consider formatting phone: formatPhoneNumber(data.phone)
        { name: "sms_consent", value: data.smsConsent },
        { name: "email", value: context.auth.token.email || "" },
        { name: "service_time", value: data.serviceDateTime }, // ISO string
        { 
          name: "location", 
          value: data.serviceLocationAddress.fullAddress,
          obj: { // Ensure this structure matches Phoenix expectations
            address_1: data.serviceLocationAddress.address_1,
            city: data.serviceLocationAddress.city,
            state: data.serviceLocationAddress.state,
            country: data.serviceLocationAddress.country,
            zipcode: data.serviceLocationAddress.zipcode,
          }
        },
        { name: "car_year", value: "" },
        { name: "car_make", value: "" },
        { name: "car_model", value: "" },
        { name: "car_color", value: "" },
        { 
          name: "service_type", 
          value: data.serviceTypes // Directly use the array of {id, value} from frontend
        },
        { name: "notes", value: data.residentNotes || "" }
      ],
      source: "phoenix-property-manager-pro.web.app", // As per user's request
      completed: false,
      submitted: true
    };

    try {
      // 2. Call Phoenix API First
      const phoenixResponse = await fetch(`${PHOENIX_API_URL_BACKEND}/form-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(phoenixPayload),
      });

      if (phoenixResponse.status !== 201) {
        // Type errorBody more specifically with a cast
        const errorBody = await phoenixResponse.json().catch(() => ({ message: 'Unknown error structure from Phoenix API' })) as { message?: string; error?: any };
        console.error('Phoenix API error:', phoenixResponse.status, errorBody);
        const phoenixErrorMessage = errorBody?.message || (typeof errorBody?.error === 'string' ? errorBody.error : phoenixResponse.statusText);
        throw handleHttpsError('internal', `Phoenix API submission failed: ${phoenixErrorMessage}`);
      }
      
      // Type phoenixResult more specifically with a cast
      const phoenixResult = await phoenixResponse.json() as { id?: string | number; [key: string]: any };
      const phoenixSubmissionId = phoenixResult?.id;

      // 3. If Phoenix call successful, save to Firestore
      const serviceRequestWithPhoenixId = {
        ...newServiceRequest,
        phoenixSubmissionId: phoenixSubmissionId || null, // Store Phoenix ID
      };
      
      const docRef = await serviceRequestCollectionRef.add(serviceRequestWithPhoenixId);
      return {
        success: true,
        serviceRequestId: docRef.id,
        message: 'Service request created successfully and submitted to Phoenix.',
      };

    } catch (error: any) {
      console.error('Error in createServiceRequest:', error);
      if (error.code && error.message) { // Check if it's already an HttpsError
        throw error;
      }
      throw handleHttpsError(
        'internal',
        error.message || 'An internal error occurred during service request processing.'
      );
    }
  }
);
