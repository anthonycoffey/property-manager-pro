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
          let fieldProcessed = false;

          if (key === 'leaseStartDate' || key === 'leaseEndDate') {
            if (value === null) { // Explicitly set to null
              sanitizedUpdateData[key] = undefined;
              fieldProcessed = true;
            } else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value &&
                       typeof (value as {seconds: unknown}).seconds === 'number' && typeof (value as {nanoseconds: unknown}).nanoseconds === 'number') {
              // Value is a serialized Timestamp object from the client
              sanitizedUpdateData[key] = new Timestamp((value as {seconds: number}).seconds, (value as {nanoseconds: number}).nanoseconds);
              fieldProcessed = true;
            } else if (value && (typeof value === 'string' || value instanceof Date)) {
              // Value is a date string or a JS Date object
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) { // Check if date is valid
                sanitizedUpdateData[key] = Timestamp.fromDate(dateObj);
              } else {
                console.warn(`Invalid date value received for ${key}:`, value);
                // Optionally throw, or skip by not setting fieldProcessed to true
              }
              fieldProcessed = true; // Mark as processed even if invalid, to avoid falling into generic handler
            }
            // If value is undefined for a date field, it's skipped by hasOwnProperty or handled by !fieldProcessed below
          }
          
          if (!fieldProcessed && value !== undefined) {
            // Generic handler for non-date fields or date fields not matching above conditions (though they should)
            // Ensure the key is a valid key of sanitizedUpdateData and value is assignable
            if (key in sanitizedUpdateData) { // This check might be redundant if sanitizedUpdateData is initially empty
              (sanitizedUpdateData as Record<string, unknown>)[key] = value;
            } else {
              (sanitizedUpdateData as Partial<Record<keyof Resident, unknown>>)[key as keyof Resident] = value;
            }
          }
          // Note: hasValidUpdate logic might need adjustment if we skip invalid dates silently
          // For now, assume any processed field (even if set to null) or any defined non-date value means an update.
          if (value !== undefined || fieldProcessed) { // If value was undefined, it wouldn't be in updatedData due to JSON stringify
            hasValidUpdate = true;
          }
        }
      }
      
      if (!hasValidUpdate) {
        // This error might be hit if only invalid date strings were provided and skipped.
        throw handleHttpsError('invalid-argument', 'No valid fields or actual changes provided for update.');
      }

      await residentDocRef.update(sanitizedUpdateData);

      return { success: true, message: 'Resident details updated successfully.' };
    } catch (error) { 
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      const e = error as AppError; 
      console.error('Error updating resident details by PM:', e.message, e.code ? `(${e.code})` : '', e);
      throw handleHttpsError('internal', e.message || 'An internal error occurred while updating resident details.');
    }
  }
);
