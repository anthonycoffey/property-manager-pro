import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
// import { PropertyData, Campaign } from '../types';

interface PropertyManagerDashboardStats {
  propertyCounts: {
    totalResidents: number;
    totalUnits: number; // From propertyData.totalUnits
    occupancyRate: number; // Calculated
  };
  campaignPerformance?: {
    campaignName: string;
    accepted: number;
    status: string;
    type: string;
  }[];
  // Add other property-specific stats as needed
}

export const getPropertyManagerDashboardStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgId = request.auth.token?.organizationId as string | undefined;

  // Typically, a PM is scoped to one organization.
  // Additional checks for property assignment might be needed if PMs manage specific properties only.
  if (!callerRoles.includes('property_manager') || !callerOrgId) {
    throw new HttpsError('permission-denied', 'User does not have permission to access property manager statistics or is not associated with an organization.');
  }

  const data = request.data || {}; // Ensure request.data exists
  const { organizationId, propertyId } = data as { organizationId: string, propertyId: string };

  if (!organizationId || !propertyId) {
    throw new HttpsError('invalid-argument', 'Organization ID and Property ID are required.');
  }

  // Ensure the PM is requesting stats for their own organization.
  if (callerOrgId !== organizationId) {
    throw new HttpsError('permission-denied', 'Property manager cannot access stats for this organization.');
  }
  
  // TODO: Add a check to ensure the PM is authorized for this specific propertyId if needed.
  // This might involve checking a 'managedProperties' array on the PM's user profile in Firestore.
  // For now, we assume if they are in the org, they can see stats for any property in it,
  // but this should be refined based on actual access control rules.

  try {
    const stats: PropertyManagerDashboardStats = {
      propertyCounts: {
        totalResidents: 0,
        totalUnits: 0,
        occupancyRate: 0,
      },
      campaignPerformance: [],
    };

    // 1. Property Counts
    const propertyRef = db.doc(`organizations/${organizationId}/properties/${propertyId}`);
    const propertyDoc = await propertyRef.get();

    if (!propertyDoc.exists) {
      throw new HttpsError('not-found', `Property ${propertyId} not found in organization ${organizationId}.`);
    }
    const propertyData = propertyDoc.data(); // as PropertyData;
    stats.propertyCounts.totalUnits = propertyData?.totalUnits || 0;

    const residentsSnapshot = await db.collection(`organizations/${organizationId}/properties/${propertyId}/residents`).count().get();
    stats.propertyCounts.totalResidents = residentsSnapshot.data().count;

    if (stats.propertyCounts.totalUnits > 0) {
      stats.propertyCounts.occupancyRate = parseFloat((stats.propertyCounts.totalResidents / stats.propertyCounts.totalUnits).toFixed(2));
    }

    // 2. Campaign Performance for this property
    const campaignsSnapshot = await db.collection(`organizations/${organizationId}/properties/${propertyId}/campaigns`).get();
    
    campaignsSnapshot.forEach(doc => {
      const campaign = doc.data(); // as Campaign;
      stats.campaignPerformance!.push({
        campaignName: campaign.campaignName,
        accepted: campaign.totalAccepted || 0,
        status: campaign.status,
        type: campaign.campaignType,
      });
    });

    return stats;

  } catch (error) {
    throw handleHttpsError(error, `Failed to retrieve dashboard statistics for property ${propertyId}.`);
  }
});
