import * as functions from 'firebase-functions'; // Standard import
import { db } from '../firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import { Resident, AppError } from '../types.js';

interface UpdateResidentDetailsByPmData {
  organizationId: string;
  propertyId: string;
  residentId: string;
  updatedData: Partial<Omit<Resident, 'id' | 'email' | 'organizationId' | 'propertyId' | 'roles' | 'createdAt' | 'invitedBy'>>;
}

export const updateResidentDetailsByPm = functions.https.onCall(
  async (request: functions.https.CallableRequest<UpdateResidentDetailsByPmData>) => { // Use CallableRequest
    if (!request.auth) { // Auth is on request
      throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    }

    const callerUid = request.auth.uid; 
    const { organizationId, propertyId, residentId, updatedData } = request.data; // Data is in request.data

    if (!organizationId || !propertyId || !residentId || !updatedData) {
      throw handleHttpsError(
        'invalid-argument',
        'Missing required data: organizationId, propertyId, residentId, or updatedData.'
      );
    }

    try {
      // Validate caller's role and organization
      const callerDocRef = db.doc(`organizations/${organizationId}/users/${callerUid}`);
      const callerDocSnap = await callerDocRef.get();

      if (!callerDocSnap.exists) {
        throw handleHttpsError('permission-denied', 'Caller is not a registered user in the organization.');
      }

      const callerData = callerDocSnap.data();
      if (!callerData?.organizationRoles?.includes('property_manager')) {
        throw handleHttpsError(
          'permission-denied',
          'Caller does not have permission to update resident details (not a property manager).'
        );
      }
      
      if (request.auth.token.organizationId !== organizationId) { // Use request.auth
        throw handleHttpsError(
            'permission-denied',
            'Caller organization ID does not match target organization ID.'
          );
      }

      const residentDocRef = db
        .doc(`organizations/${organizationId}/properties/${propertyId}/residents/${residentId}`);

      const residentDocSnap = await residentDocRef.get();
      if (!residentDocSnap.exists) {
        throw handleHttpsError('not-found', 'Resident document not found.');
      }

      // Sanitize updatedData to only allow specific fields
      const allowedFields: Array<keyof typeof updatedData> = [
        'displayName',
        'unitNumber',
        'leaseStartDate',
        'leaseEndDate',
        'vehicleMake',
        'vehicleModel',
        'vehicleColor',
        'licensePlate',
      ];

      const sanitizedUpdateData: Partial<Resident> = {};
      let hasValidUpdate = false;

      for (const key of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(updatedData, key)) {
          const value = updatedData[key];
          if ((key === 'leaseStartDate' || key === 'leaseEndDate') && value) {
            sanitizedUpdateData[key] = Timestamp.fromDate(new Date(value as string | Date)); // Use imported Timestamp
          } else if (value !== undefined) {
            // Ensure the key is a valid key of sanitizedUpdateData and value is assignable
            if (key in sanitizedUpdateData) {
              (sanitizedUpdateData as Record<string, unknown>)[key] = value;
            } else {
              // This case should ideally not be hit if allowedFields are correctly defined
              // and are all part of Resident type.
              // For safety, we can cast to a broader type if absolutely necessary,
              // but it's better to ensure type alignment.
              // Let's assume keys in allowedFields are valid for Partial<Resident>.
              (sanitizedUpdateData as Partial<Record<keyof Resident, unknown>>)[key as keyof Resident] = value;
            }
          }
          hasValidUpdate = true;
        }
      }
      
      if (!hasValidUpdate) {
        throw handleHttpsError('invalid-argument', 'No valid fields provided for update or no actual changes made.');
      }

      await residentDocRef.update(sanitizedUpdateData);

      return { success: true, message: 'Resident details updated successfully.' };
    } catch (error) { 
      if (error instanceof functions.https.HttpsError) { // Check against functions.https.HttpsError
        throw error;
      }
      const e = error as AppError; 
      console.error('Error updating resident details by PM:', e.message, e.code ? `(${e.code})` : '', e);
      throw handleHttpsError('internal', e.message || 'An internal error occurred while updating resident details.');
    }
  }
);
