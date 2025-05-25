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

interface CreateServiceRequestData {
  organizationId: string;
  propertyId: string;
  requestType: string;
  description: string; // Original field, can be used or merged with residentNotes
  residentNotes?: string;
  serviceDateTime?: string; // ISO string from client
  phone?: string;
  serviceLocation?: string;
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
      !data.requestType ||
      !data.serviceLocation?.trim() ||
      !data.serviceDateTime
    ) {
      throw handleHttpsError(
        'invalid-argument',
        'Request type, service location, and service date/time are required.'
      );
    }

    // Fetch resident's unitNumber and potentially a more definitive displayName
    let residentDisplayName = residentNameFromToken || 'N/A';
    let unitNumber: string | undefined;

    const residentDocRef = db.doc(
      `organizations/${data.organizationId}/properties/${data.propertyId}/residents/${residentId}`
    );
    try {
      const residentDocSnap = await residentDocRef.get();
      
      if (residentDocSnap.exists) {
        const residentData = residentDocSnap.data() as Resident;
        residentDisplayName = residentData.displayName || residentDisplayName;
        unitNumber = residentData.unitNumber;
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
      unitNumber: unitNumber,
      requestType: data.requestType,
      description: data.description.trim(), // Keep original description for now
      residentNotes: data.residentNotes?.trim(),
      serviceDateTime: data.serviceDateTime
        ? new Date(data.serviceDateTime)
        : FirebaseAdminFieldValue.serverTimestamp(), // Store as Timestamp or keep as ISO string
      phone: data.phone?.trim(),
      serviceLocation: data.serviceLocation.trim(),
      status: 'submitted' as ServiceRequestStatus,
      submittedAt: FirebaseAdminFieldValue.serverTimestamp(), // Use server timestamp with alias
      // assignedTo, completedAt, notes will be set later
    };

    try {
      const docRef = await serviceRequestCollectionRef.add(newServiceRequest);
      return {
        success: true,
        serviceRequestId: docRef.id,
        message: 'Service request created successfully.',
      };
    } catch (error) {
      console.error('Error creating service request:', error);
      throw handleHttpsError(
        'internal',
        'An internal error occurred while creating the service request.'
      );
    }
  }
);
