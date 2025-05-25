import { https } from 'firebase-functions/v1';
import { CallableContext, HttpsError } from 'firebase-functions/v1/https'; // Types from v1/https
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UpdateResidentProfileData {
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  // Add other updatable fields here if needed in the future
}

export const updateResidentProfile = https.onCall(
  async (data: any, context: CallableContext) => {
    const validatedData = data as UpdateResidentProfileData;

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

      const updatePayload: Partial<UpdateResidentProfileData> = {};
      if (validatedData.vehicleMake !== undefined) updatePayload.vehicleMake = validatedData.vehicleMake;
      if (validatedData.vehicleModel !== undefined) updatePayload.vehicleModel = validatedData.vehicleModel;
      if (validatedData.vehicleColor !== undefined) updatePayload.vehicleColor = validatedData.vehicleColor;
      if (validatedData.licensePlate !== undefined) updatePayload.licensePlate = validatedData.licensePlate;
      
      if (Object.keys(updatePayload).length === 0) {
        return { success: true, message: 'No changes provided.' };
      }

      await residentDocRef.update(updatePayload);

      return { success: true, message: 'Profile updated successfully.' };
    } catch (error: any) {
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
