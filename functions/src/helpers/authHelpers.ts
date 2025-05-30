// Placeholder for authentication helper functions
import { CallableContext } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js'; // Assuming firebaseAdmin.js is correctly set up

export function getRoleFromContext(context: CallableContext): string | null {
  return context.auth?.token?.role || context.auth?.token?.roles?.[0] || null;
}

export async function getUserOrganizations(userId: string): Promise<string[]> {
  // This is a simplified placeholder.
  // In a real scenario, you'd fetch the user's document (e.g., from 'admins' or 'users' collection)
  // that stores their assigned organization IDs.
  // For an Organization Manager, this might be from context.auth.token.organizationIds if populated by custom claims.
  // Or from a Firestore document:
  const adminUserDoc = await db.collection('admins').doc(userId).get();
  if (adminUserDoc.exists && adminUserDoc.data()?.assignedOrganizationIds) {
    return adminUserDoc.data()?.assignedOrganizationIds as string[];
  }
  // Fallback or more complex logic might be needed depending on where OM orgs are stored.
  return [];
}

export async function getPropertyManagerOrganizations(userId: string): Promise<string[]> {
  // This is a simplified placeholder.
  // Property Managers are typically associated with one organization via custom claims or their user profile.
  // Example: fetching from a user profile in an 'users' collection within an org,
  // but that requires knowing the orgId first.
  // A more common approach for PMs is that their organizationId is in their custom claims.
  // This function would likely need to access the user's custom claims or their specific user profile.
  // For now, returning an empty array as a placeholder.
  // A real implementation might involve querying all organizations and checking their 'users' subcollection,
  // or more efficiently, relying on custom claims like context.auth.token.organizationId.
  
  // Placeholder: In a real app, you'd look up the PM's org.
  // This could be from a root 'users' collection if PMs are stored there with an orgId,
  // or by iterating/querying. For simplicity, let's assume a PM might have an orgId in a root profile.
  const userDocRef = db.collection('users').doc(userId); // Hypothetical root users collection
  const doc = await userDocRef.get();
  if (doc.exists && doc.data()?.organizationId) {
    return [doc.data()?.organizationId as string];
  }
  // If PM's org is in custom claims, it would be accessed differently (directly from context.auth.token)
  return [];
}

export function isUserRole(context: CallableContext, role: string): boolean {
  return context.auth?.token?.roles?.includes(role) || context.auth?.token?.role === role;
}

// Helper to check if the authenticated user is the creator of a resource
export function isResourceCreator(context: CallableContext, resourceCreatedBy: string): boolean {
  if (!context.auth || !context.auth.uid) {
    return false;
  }
  return context.auth.uid === resourceCreatedBy;
}
