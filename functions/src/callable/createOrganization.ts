import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createOrganization = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can create organizations.');
  }
  const adminUid = request.auth.uid;

  // 2. Input Validation
  const { organizationName } = request.data;
  if (!organizationName || typeof organizationName !== 'string' || organizationName.trim() === '') {
    throw new HttpsError('invalid-argument', 'Organization name is required and must be a non-empty string.');
  }

  try {
    // 3. Create Firestore document for the organization
    const newOrgRef = db.collection('organizations').doc(); // Auto-generate ID
    const newOrgId = newOrgRef.id;

    const orgData = {
      name: organizationName.trim(),
      createdBy: adminUid,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
    };
    
    await newOrgRef.set(orgData);
    console.log(`Organization document created with ID: ${newOrgId} by admin ${adminUid}, Name: ${orgData.name}`);

    // 4. Return success
    return {
      success: true,
      message: `Organization '${orgData.name}' created successfully.`,
      organizationId: newOrgId,
    };

  } catch (error: unknown) {
    console.error(`Error creating organization ${organizationName}:`, error);
    throw handleHttpsError(error, 'Failed to create organization.');
  }
});
