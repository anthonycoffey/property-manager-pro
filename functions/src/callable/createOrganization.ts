import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js'; // Imported adminAuth
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createOrganization = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerUid = request.auth.uid; // Renamed from adminUid

  if (!callerRoles.includes('admin') && !callerRoles.includes('organization_manager')) {
    throw new HttpsError('permission-denied', 'Only administrators or organization managers can create organizations.');
  }
  
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
      createdBy: callerUid, // Use callerUid
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
    };
    
    await newOrgRef.set(orgData);
    console.log(`Organization document created with ID: ${newOrgId} by user ${callerUid}, Name: ${orgData.name}`);

    // 4. If an Organization Manager created it, auto-assign them
    if (callerRoles.includes('organization_manager')) {
      const userRecord = await adminAuth.getUser(callerUid);
      const existingClaims = userRecord.customClaims || {};
      const existingOrgIds = (existingClaims.organizationIds as string[] | undefined) || [];
      
      if (!existingOrgIds.includes(newOrgId)) {
        const updatedOrgIds = [...existingOrgIds, newOrgId];
        await adminAuth.setCustomUserClaims(callerUid, { 
          ...existingClaims, 
          organizationIds: updatedOrgIds 
        });
        console.log(`Updated custom claims for Organization Manager ${callerUid} to include new organization ${newOrgId}.`);

        // Also update their profile in the 'admins' collection
        const adminProfileRef = db.collection('admins').doc(callerUid);
        // Ensure the document exists or create it if it doesn't (though it should for an OM)
        // We use update here assuming the OM profile in 'admins' was created during their initial setup.
        // If there's a chance it might not exist, a .set({ assignedOrganizationIds: updatedOrgIds }, { merge: true }) might be safer.
        // However, an OM should always have an /admins profile.
        await adminProfileRef.update({
          assignedOrganizationIds: updatedOrgIds,
        });
        console.log(`Updated 'admins' profile for Organization Manager ${callerUid} with new organization ${newOrgId}.`);
      }

      // Create user profile in the new organization
      const userProfilePath = `organizations/${newOrgId}/users/${callerUid}`;
      const userProfileData = {
        uid: callerUid,
        email: userRecord.email, // Assumes email is available
        displayName: userRecord.displayName || organizationName + ' Manager', // Fallback display name
        organizationId: newOrgId,
        organizationRoles: ['organization_manager'],
        createdAt: FieldValue.serverTimestamp(),
        status: 'active',
        // invitedBy: null, // Not an invitation in this flow
      };
      await db.doc(userProfilePath).set(userProfileData, { merge: true }); // Merge true in case a base profile exists (unlikely here)
      console.log(`Created profile for Organization Manager ${callerUid} in new organization ${newOrgId} at ${userProfilePath}.`);
    }

    // 5. Return success
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
