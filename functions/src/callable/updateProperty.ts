import { onCall, HttpsError } from 'firebase-functions/v2/https'; // v2 import
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UpdatePropertyData {
  organizationId: string;
  propertyId: string;
  updatedData: {
    name?: string;
    address?: { // Address now only contains street
      street?: string;
    };
    type?: string;
    managedBy?: string;
    // Add other property fields as necessary
  };
}

export const updateProperty = onCall(async (request) => { // Use request parameter for v2
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { organizationId, propertyId, updatedData } = request.data as UpdatePropertyData; // Access data from request.data

  if (!organizationId || !propertyId || !updatedData) {
    throw new HttpsError('invalid-argument', 'Missing required parameters: organizationId, propertyId, or updatedData.');
  }

  // request.auth is now guaranteed to exist
  const callerRoles = request.auth.token.roles || [];
  
  let authorized = false;
  if (callerRoles.includes('property_manager')) {
    const callerOrgId = request.auth.token.organizationId;
    if (callerOrgId === organizationId) {
      authorized = true;
    }
  } else if (callerRoles.includes('organization_manager')) {
    const callerOrgIds = (request.auth.token.organizationIds as string[]) || [];
    if (callerOrgIds.includes(organizationId)) {
      authorized = true;
    }
  }

  if (!authorized) {
    throw new HttpsError('permission-denied', 'User does not have permission to update properties for this organization.');
  }

  // Use the imported db directly
  const propertyRef = db.doc(`organizations/${organizationId}/properties/${propertyId}`);

  try {
    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists) {
      throw new HttpsError('not-found', `Property with ID ${propertyId} not found in organization ${organizationId}.`);
    }

    // Ensure only allowed fields are updated and perform any necessary validation
    const cleanUpdateData: Partial<UpdatePropertyData['updatedData']> = {};
    if (updatedData.name !== undefined) cleanUpdateData.name = updatedData.name;
    if (updatedData.address !== undefined) cleanUpdateData.address = updatedData.address; // Consider deeper validation/cleaning for address object
    if (updatedData.type !== undefined) cleanUpdateData.type = updatedData.type;
    if (updatedData.managedBy !== undefined) cleanUpdateData.managedBy = updatedData.managedBy;
    // Add other fields as needed, ensuring they are valid property fields

    if (Object.keys(cleanUpdateData).length === 0) {
        throw new HttpsError('invalid-argument', 'No valid fields provided for update.');
    }

    await propertyRef.update(cleanUpdateData);
    console.log(`Property ${propertyId} in organization ${organizationId} updated successfully by user ${request.auth.uid}.`); // Use request.auth.uid
    return { success: true, message: `Property ${propertyId} updated successfully.` };
  } catch (error) {
    return handleHttpsError(error, `Failed to update property ${propertyId}.`);
  }
});
