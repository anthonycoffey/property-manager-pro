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

  // Address is now expected to be an object like { street: "123 Main St", city: "Anytown", state: "CA", zip: "90210" }
  if (
    !propertyName || 
    !propertyType || 
    !address || 
    typeof address.street !== 'string' || !address.street ||
    typeof address.city !== 'string' || !address.city ||
    typeof address.state !== 'string' || !address.state ||
    typeof address.zip !== 'string' || !address.zip
  ) {
    throw new HttpsError('invalid-argument', 'Missing required fields: propertyName, propertyType, and a valid address object with street, city, state, and zip.');
  }


  try {
    const propertyCollectionRef = db.collection(`organizations/${callerOrgId}/properties`);
    const newPropertyRef = propertyCollectionRef.doc(); 

    const propertyData = {
      id: newPropertyRef.id,
      name: propertyName,
      address: { // Storing the full address
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
      },
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
