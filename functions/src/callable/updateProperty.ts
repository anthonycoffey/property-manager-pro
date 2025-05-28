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
    address?: FullPropertyAddress; // Updated to full address
    type?: string;
    managedBy?: string;
    // Add other property fields as necessary
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
    if (updatedData.managedBy !== undefined)
      cleanUpdateData.managedBy = updatedData.managedBy;

    // Handle address updates carefully to update individual fields or the whole object
    if (updatedData.address) {
      if (updatedData.address.street !== undefined)
        cleanUpdateData['address.street'] = updatedData.address.street;
      if (updatedData.address.city !== undefined)
        cleanUpdateData['address.city'] = updatedData.address.city;
      if (updatedData.address.state !== undefined)
        cleanUpdateData['address.state'] = updatedData.address.state;
      if (updatedData.address.zip !== undefined)
        cleanUpdateData['address.zip'] = updatedData.address.zip;
      // If you intend to replace the whole address object, use:
      // cleanUpdateData.address = updatedData.address;
      // However, updating specific fields with dot notation is often safer
      // to avoid accidentally removing fields not included in the update.
      // For this to work, ensure `updatedData.address` only contains fields to be changed.
      // If the frontend always sends the full address object when any part of it changes,
      // then `cleanUpdateData.address = updatedData.address;` is fine.
      // Given EditPropertyModal sends the full address if changed, this should be okay:
      // cleanUpdateData.address = updatedData.address;
      // Let's stick to dot notation for explicit field updates if they are partial.
      // If the frontend guarantees a full address object on any address change, then:
      if (Object.keys(updatedData.address).length > 0) {
        cleanUpdateData.address = updatedData.address; // Replace the whole address map
      }
    }
    // Add other fields as needed, ensuring they are valid property fields

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
