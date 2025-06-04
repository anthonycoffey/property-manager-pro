import { https } from 'firebase-functions/v1';
import { CallableContext, HttpsError } from 'firebase-functions/v1/https'; // Types from v1/https
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import { Vehicle } from '../types.js'; // Import Vehicle type
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue

interface UpdateResidentProfileData {
  vehicles?: Vehicle[];
  // Add other updatable fields here if needed in the future
}

export const updateResidentProfile = https.onCall(
  async (data: UpdateResidentProfileData, context: CallableContext) => {
    if (!context.auth) {
      throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { uid } = context.auth;
    const { organizationId, propertyId } = context.auth.token;

    if (!organizationId || !propertyId) {
      throw handleHttpsError(
        'failed-precondition',
        'User is not associated with an organization or property.'
      );
    }

    if (!context.auth.token.roles?.includes('resident')) {
        throw handleHttpsError(
            'permission-denied',
            'User does not have permission to update this profile.'
        );
    }

    const residentDocPath = `organizations/${organizationId}/properties/${propertyId}/residents/${uid}`;

    try {
      const residentDocRef = db.doc(residentDocPath);
      const residentDocSnap = await residentDocRef.get();

      if (!residentDocSnap.exists) {
        throw handleHttpsError('not-found', 'Resident profile not found.');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: { [key: string]: any } = {};
      let changesMade = false;

      // Handle vehicles update
      if (data.vehicles !== undefined) {
        changesMade = true;
        if (!Array.isArray(data.vehicles)) {
          throw handleHttpsError('invalid-argument', 'Vehicles must be an array.');
        }
        if (data.vehicles.length > 2) {
          throw handleHttpsError('invalid-argument', 'A maximum of 2 vehicles are allowed.');
        }

        for (const vehicle of data.vehicles) {
          if (
            !vehicle ||
            typeof vehicle !== 'object' ||
            typeof vehicle.make !== 'string' || vehicle.make.trim() === '' ||
            typeof vehicle.model !== 'string' || vehicle.model.trim() === '' ||
            typeof vehicle.year !== 'number' || !Number.isInteger(vehicle.year) || vehicle.year < 1900 || vehicle.year > new Date().getFullYear() + 2 ||
            typeof vehicle.color !== 'string' || vehicle.color.trim() === '' ||
            typeof vehicle.plate !== 'string' || vehicle.plate.trim() === ''
          ) {
            throw handleHttpsError('invalid-argument', 'Invalid vehicle data. All fields are required and must be valid.');
          }
        }
        updatePayload.vehicles = data.vehicles;

        // Clean up old flat vehicle fields
        updatePayload.vehicleMake = FieldValue.delete();
        updatePayload.vehicleModel = FieldValue.delete();
        updatePayload.vehicleColor = FieldValue.delete();
        updatePayload.licensePlate = FieldValue.delete();
      }
      
      // Example for other potential fields (if any are added to UpdateResidentProfileData in the future)
      // if (data.someOtherField !== undefined) {
      //   updatePayload.someOtherField = data.someOtherField;
      //   changesMade = true;
      // }

      if (!changesMade && Object.keys(updatePayload).length === 0) {
         // This case handles if vehicles was undefined, and no old fields to delete.
         // If vehicles was defined (even as empty array), changesMade would be true.
        return { success: true, message: 'No changes provided to update.' };
      }
      
      // If only cleanup of old fields is happening because vehicles was explicitly set (e.g. to empty array)
      // but no other fields were changed, we still proceed with the update.
      if (Object.keys(updatePayload).length === 0 && !changesMade) {
         return { success: true, message: 'No valid changes to apply.' };
      }


      await residentDocRef.update(updatePayload);

      return { success: true, message: 'Profile updated successfully.' };
    } catch (error: unknown) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error updating resident profile:', error);
      throw handleHttpsError(
        'internal',
        'An internal error occurred while updating the profile.'
      );
    }
  }
);
