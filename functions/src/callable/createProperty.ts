import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js'; // adminAuth not directly used, request.auth is
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  // Destructure totalUnits from request.data
  const { propertyName, address, propertyType, organizationId: targetOrganizationId, totalUnits } = request.data as {
    propertyName: string;
    address: { street: string; city: string; state: string; zip: string };
    propertyType: string;
    organizationId?: string;
    totalUnits: number; // Added totalUnits
  };

  let operationOrgId: string | undefined;

  if (callerRoles.includes('property_manager')) {
    operationOrgId = request.auth.token?.organizationId as string | undefined;
    if (!operationOrgId) {
      throw new HttpsError('failed-precondition', 'Property manager is not associated with an organization.');
    }
  } else if (callerRoles.includes('organization_manager')) {
    const callerOrgIds = (request.auth.token?.organizationIds as string[]) || [];
    if (!targetOrganizationId) {
      throw new HttpsError('invalid-argument', 'Organization ID is required for organization managers to create properties.');
    }
    if (!callerOrgIds.includes(targetOrganizationId)) {
      throw new HttpsError('permission-denied', 'Organization manager does not have permission for the target organization.');
    }
    operationOrgId = targetOrganizationId;
  } else if (callerRoles.includes('admin')) {
    if (!targetOrganizationId) {
      throw new HttpsError('invalid-argument', 'Organization ID is required for admins to create properties.');
    }
    // Admins can operate on any organization, so no specific check against their own org list is needed.
    operationOrgId = targetOrganizationId;
  } else {
    throw new HttpsError('permission-denied', 'User does not have permission to create properties.');
  }

  // Address is expected to be an object like { street: "123 Main St", city: "Anytown", state: "CA", zip: "90210" }
  if (
    !propertyName ||
    !propertyType ||
    !address ||
    typeof address.street !== 'string' || !address.street ||
    typeof address.city !== 'string' || !address.city ||
    typeof address.state !== 'string' || !address.state ||
    typeof address.zip !== 'string' || !address.zip ||
    typeof totalUnits !== 'number' || totalUnits <= 0 // Validate totalUnits
  ) {
    throw new HttpsError('invalid-argument', 'Missing required fields: propertyName, propertyType, totalUnits (must be a positive number), and a valid address object with street, city, state, and zip.');
  }

  try {
    const propertyCollectionRef = db.collection(`organizations/${operationOrgId}/properties`);
    const newPropertyRef = propertyCollectionRef.doc();

    const propertyData = {
      id: newPropertyRef.id,
      name: propertyName,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
      },
      type: propertyType,
      organizationId: operationOrgId,
      managedBy: callerUid, // Consider if 'managedBy' should always be the creator or explicitly passed
      totalUnits: totalUnits, // Add totalUnits to the property data
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
    };

    await newPropertyRef.set(propertyData);
    console.log(`Property created with ID ${newPropertyRef.id} in organization ${operationOrgId}`);

    return {
      success: true,
      message: 'Property created successfully.',
      propertyId: newPropertyRef.id,
      propertyData: propertyData
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create property.');
  }
});
