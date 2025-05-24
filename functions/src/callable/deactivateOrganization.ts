import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js'; // FieldValue is not needed for delete
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface DeleteOrganizationData { // Renamed interface
  organizationId: string;
}

export const deleteOrganization = onCall(async (request) => { // Renamed function
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can delete organizations.'); // Updated permission message
  }

  // 2. Input Validation
  const { organizationId } = request.data as DeleteOrganizationData; // Use renamed interface
  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Organization ID is required.');
  }

  try {
    const orgRef = db.collection('organizations').doc(organizationId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) {
      throw new HttpsError('not-found', `Organization with ID ${organizationId} not found.`);
    }
    
    // Store name for response message before deleting
    const organizationName = orgDoc.data()?.name || 'Unknown Organization';

    // 3. Perform deletion
    await orgRef.delete();
    console.log(`Organization ${organizationId} (${organizationName}) deleted by admin ${request.auth.uid}.`);

    // 4. Return success
    return {
      success: true,
      message: `Organization '${organizationName}' deleted successfully.`,
      organizationId: organizationId,
    };

  } catch (error: unknown) {
    console.error(`Error deleting organization ${organizationId}:`, error); // Updated error message
    throw handleHttpsError(error, 'Failed to delete organization.'); // Updated error message
  }
});
