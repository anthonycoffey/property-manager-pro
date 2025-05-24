import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UpdateOrganizationData {
  organizationId: string;
  name?: string;
  status?: string;
}

export const updateOrganization = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can update organizations.');
  }

  // 2. Input Validation
  const { organizationId, name, status } = request.data as UpdateOrganizationData;
  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Organization ID is required.');
  }
  if (!name && !status) {
    throw new HttpsError('invalid-argument', 'At least one field (name or status) must be provided for update.');
  }
  if (name && (typeof name !== 'string' || name.trim() === '')) {
    throw new HttpsError('invalid-argument', 'Organization name must be a non-empty string if provided.');
  }
  // Add more status validation if needed, e.g., ensure it's one of allowed values
  const allowedStatuses = ['active', 'inactive', 'suspended', 'trial'];
  if (status && !allowedStatuses.includes(status)) {
      throw new HttpsError('invalid-argument', `Invalid status value. Allowed statuses are: ${allowedStatuses.join(', ')}.`);
  }


  try {
    const orgRef = db.collection('organizations').doc(organizationId);
    const orgDoc = await orgRef.get();

    if (!orgDoc.exists) {
      throw new HttpsError('not-found', `Organization with ID ${organizationId} not found.`);
    }

    // 3. Prepare updates
    const updates: { name?: string; status?: string; updatedAt?: FirebaseFirestore.FieldValue } = {};
    if (name) {
      updates.name = name.trim();
    }
    if (status) {
      updates.status = status;
    }
    updates.updatedAt = FieldValue.serverTimestamp(); // Keep track of last update

    await orgRef.update(updates);
    console.log(`Organization ${organizationId} updated by admin ${request.auth.uid}. New data: ${JSON.stringify(updates)}`);

    // 4. Return success
    return {
      success: true,
      message: `Organization '${updates.name || orgDoc.data()?.name}' updated successfully.`,
      organizationId: organizationId,
    };

  } catch (error: unknown) {
    console.error(`Error updating organization ${organizationId}:`, error);
    throw handleHttpsError(error, 'Failed to update organization.');
  }
});
