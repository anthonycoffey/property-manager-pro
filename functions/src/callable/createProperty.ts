import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js'; // adminAuth not directly used, request.auth is
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgId = request.auth.token?.organizationId as string | undefined;

  if (!callerRoles.includes('property_manager') || !callerOrgId) {
    throw new HttpsError('permission-denied', 'Only property managers can create properties within their organization.');
  }

  const { propertyName, address, propertyType } = request.data;

  if (!propertyName || !address || !propertyType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: propertyName, address, propertyType.');
  }
  // Add more specific validation for address object if needed:
  // e.g., if (!address.street || !address.city || !address.state || !address.zip) { ... }


  try {
    const propertyCollectionRef = db.collection(`organizations/${callerOrgId}/properties`);
    const newPropertyRef = propertyCollectionRef.doc(); 

    const propertyData = {
      id: newPropertyRef.id,
      name: propertyName,
      address: address, // e.g., { street, city, state, zip }
      type: propertyType,
      organizationId: callerOrgId,
      managedBy: callerUid, 
      createdAt: FieldValue.serverTimestamp(),
      status: 'active', 
    };

    await newPropertyRef.set(propertyData);
    console.log(`Property created with ID ${newPropertyRef.id} in organization ${callerOrgId}`);

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
