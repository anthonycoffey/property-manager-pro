import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface DeletePropertyData {
  organizationId: string;
  propertyId: string;
}

async function deleteCollection(collectionPath: string, batchSize: number) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(
  query: FirebaseFirestore.Query,
  resolve: () => void,
  reject: (_error: Error) => void
) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(query, resolve, reject);
  });
}

export const deleteProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { organizationId, propertyId } = request.data as DeletePropertyData;

  if (!organizationId || !propertyId) {
    throw new HttpsError('invalid-argument', 'Missing required parameters: organizationId or propertyId.');
  }

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
    throw new HttpsError('permission-denied', 'User does not have permission to delete properties for this organization.');
  }

  const propertyRef = db.doc(`organizations/${organizationId}/properties/${propertyId}`);
  const residentsCollectionPath = `organizations/${organizationId}/properties/${propertyId}/residents`;

  try {
    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists) {
      throw new HttpsError('not-found', `Property with ID ${propertyId} not found in organization ${organizationId}.`);
    }

    // Delete all residents in the subcollection
    console.log(`Attempting to delete residents for property ${propertyId} in organization ${organizationId}...`);
    await deleteCollection(residentsCollectionPath, 50); // Batch delete 50 residents at a time
    console.log(`Successfully deleted residents for property ${propertyId}.`);

    // Delete the property document itself
    await propertyRef.delete();
    console.log(`Property ${propertyId} in organization ${organizationId} deleted successfully by user ${request.auth.uid}.`);
    
    return { success: true, message: `Property ${propertyId} and its residents deleted successfully.` };
  } catch (error) {
    return handleHttpsError(error, `Failed to delete property ${propertyId}.`);
  }
});
