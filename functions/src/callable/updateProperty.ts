import { onCall, HttpsError } from 'firebase-functions/v2/https'; // v2 import
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface FullPropertyAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface UpdatePropertyData {
  organizationId: string;
  propertyId: string;
  updatedData: {
    name?: string;
    address?: FullPropertyAddress;
    addresses?: FullPropertyAddress[];
    type?: string;
    managedBy?: string;
    totalUnits?: number;
  };
}

export const updateProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId, propertyId, updatedData } =
    request.data as UpdatePropertyData; // Access data from request.data

  if (!organizationId || !propertyId || !updatedData) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required parameters: organizationId, propertyId, or updatedData.'
    );
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
  } else if (callerRoles.includes('admin')) {
    authorized = true; // Admins are authorized for any organization
  }

  if (!authorized) {
    throw new HttpsError(
      'permission-denied',
      'User does not have permission to update properties for this organization.'
    );
  }

  // Use the imported db directly
  const propertyRef = db.doc(
    `organizations/${organizationId}/properties/${propertyId}`
  );

  try {
    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists) {
      throw new HttpsError(
        'not-found',
        `Property with ID ${propertyId} not found in organization ${organizationId}.`
      );
    }

    // Ensure only allowed fields are updated and perform any necessary validation

    // eslint-disable-next-line
    const cleanUpdateData: { [key: string]: any } = {}; // More flexible for dot notation updates
    if (updatedData.name !== undefined) cleanUpdateData.name = updatedData.name;
    if (updatedData.type !== undefined) cleanUpdateData.type = updatedData.type;
    if (updatedData.managedBy !== undefined) cleanUpdateData.managedBy = updatedData.managedBy;
    if (updatedData.totalUnits !== undefined) {
      if (typeof updatedData.totalUnits === 'number' && updatedData.totalUnits > 0) {
        cleanUpdateData.totalUnits = updatedData.totalUnits;
      } else {
        // Optionally throw an error if totalUnits is provided but invalid
        // For now, we'll just ignore invalid totalUnits in an update
        console.warn(`Invalid totalUnits value received for property ${propertyId}: ${updatedData.totalUnits}. Skipping update for this field.`);
      }
    }

    // Handle address updates. Prioritize the `addresses` array if it exists.
    if (updatedData.addresses) {
      if (Array.isArray(updatedData.addresses) && updatedData.addresses.length > 0) {
        cleanUpdateData.addresses = updatedData.addresses;
        cleanUpdateData.address = updatedData.addresses[0]; // Update primary address from the array
      } else {
        console.warn(`Invalid addresses array received for property ${propertyId}. Skipping update for this field.`);
      }
    } else if (updatedData.address) {
      // Fallback for old clients or if only the primary address object is sent
      if (Object.keys(updatedData.address).length > 0) {
        // Aggressively migrate to the new structure
        cleanUpdateData.address = updatedData.address;
        cleanUpdateData.addresses = [updatedData.address];
      }
    }

    if (Object.keys(cleanUpdateData).length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'No valid fields provided for update.'
      );
    }

    await propertyRef.update(cleanUpdateData);
    console.log(
      `Property ${propertyId} in organization ${organizationId} updated successfully by user ${request.auth.uid}.`
    ); // Use request.auth.uid
    return {
      success: true,
      message: `Property ${propertyId} updated successfully.`,
    };
  } catch (error) {
    return handleHttpsError(error, `Failed to update property ${propertyId}.`);
  }
});
