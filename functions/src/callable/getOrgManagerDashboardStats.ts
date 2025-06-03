import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
// import { Campaign } from '../types'; // Assuming Campaign type is defined

interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

interface CampaignPerformance {
  campaignName: string;
  accepted: number;
  potential?: number; // Max uses for CSV, or other metric for public link
  rate?: number;      // Calculated if potential is available
  status: string;
  type: string;
}

interface OrgManagerDashboardStats {
  organizationCounts: {
    properties: number;
    residents: number;
    propertyManagers: number;
  };
  campaignPerformance?: {
    activeCampaigns: number;
    conversionRates: CampaignPerformance[]; // More detailed campaign info
  };
  // Add other org-specific stats as needed
}

export const getOrgManagerDashboardStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgIds = (request.auth.token?.organizationIds as string[]) || [];

  if (!callerRoles.includes('organization_manager')) {
    throw new HttpsError('permission-denied', 'User does not have permission to access organization manager statistics.');
  }

  const data = request.data || {}; // Ensure request.data exists
  const { organizationId } = data as { organizationId: string, dateRange?: DateRange };

  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'Organization ID is required.');
  }

  if (!callerOrgIds.includes(organizationId)) {
    throw new HttpsError('permission-denied', 'User does not have permission for the target organization.');
  }

  try {
    const stats: OrgManagerDashboardStats = {
      organizationCounts: {
        properties: 0,
        residents: 0,
        propertyManagers: 0,
      },
      campaignPerformance: {
        activeCampaigns: 0,
        conversionRates: [],
      }
    };

    // 1. Organization Counts
    const propertiesSnapshot = await db.collection(`organizations/${organizationId}/properties`).count().get();
    stats.organizationCounts.properties = propertiesSnapshot.data().count;

    // Counting residents within the specific organization (collection group query scoped by path)
    // This can be less direct than a collection group query without a path, but ensures we only count residents for this org.
    // A more performant way for very large orgs would be denormalization.
    let residentCount = 0;
    if (stats.organizationCounts.properties > 0) {
        const propertiesInOrg = await db.collection(`organizations/${organizationId}/properties`).get();
        for (const propDoc of propertiesInOrg.docs) {
            const residentsSnapshot = await db.collection(`organizations/${organizationId}/properties/${propDoc.id}/residents`).count().get();
            residentCount += residentsSnapshot.data().count;
        }
    }
    stats.organizationCounts.residents = residentCount;
    
    const pmSnapshot = await db.collection(`organizations/${organizationId}/users`).where('organizationRoles', 'array-contains', 'property_manager').count().get();
    stats.organizationCounts.propertyManagers = pmSnapshot.data().count;

    // 2. Campaign Performance
    const campaignsQuery = db.collectionGroup('campaigns').where('organizationId', '==', organizationId);
    // TODO: Add dateRange filtering for campaigns if dateRange is provided
    const campaignsSnapshot = await campaignsQuery.get();

    campaignsSnapshot.forEach(doc => {
      const campaign = doc.data(); // as Campaign;
      if (campaign.status === 'active') {
        stats.campaignPerformance!.activeCampaigns++;
      }
      stats.campaignPerformance!.conversionRates.push({
        campaignName: campaign.campaignName,
        accepted: campaign.totalAccepted || 0,
        // potential: campaign.maxUses || campaign.totalInvitedFromCsv || undefined, // Define "potential" clearly
        status: campaign.status,
        type: campaign.campaignType,
      });
    });
    
    // TODO: Calculate conversion rates if 'potential' is well-defined

    return stats;

  } catch (error) {
    throw handleHttpsError(error, `Failed to retrieve dashboard statistics for organization ${organizationId}.`);
  }
});
