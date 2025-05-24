import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface DeactivateOrganizationData {
  organizationId: string;
}

export const deactivateOrganization = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can deactivate organizations.');
  }

  // 2. Input Validation
  const { organizationId } = request.data as DeactivateOrganizationData;
  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Organization ID is required.');
  }

  try {
    const orgRef = db.collection('organizations').doc(organizationId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) {
      throw new HttpsError('not-found', `Organization with ID ${organizationId} not found.`);
    }
    
    // Check if already inactive to prevent redundant operations
    if (orgDoc.data()?.status === 'inactive') {
        return {
            success: true,
            message: `Organization '${orgDoc.data()?.name}' is already inactive.`,
            organizationId: organizationId,
        };
    }

    // 3. Prepare updates for deactivation
    const updates = {
      status: 'inactive', // Set status to inactive
      updatedAt: FieldValue.serverTimestamp(),
      deactivatedAt: FieldValue.serverTimestamp(), // Specific timestamp for deactivation
      deactivatedBy: request.auth.uid, // Log who deactivated it
    };

    await orgRef.update(updates);
    console.log(`Organization ${organizationId} deactivated by admin ${request.auth.uid}.`);

    // 4. Return success
    return {
      success: true,
      message: `Organization '${orgDoc.data()?.name}' deactivated successfully.`,
      organizationId: organizationId,
    };

  } catch (error: unknown) {
    console.error(`Error deactivating organization ${organizationId}:`, error);
    throw handleHttpsError(error, 'Failed to deactivate organization.');
  }
});
