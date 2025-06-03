import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
// import { PropertyData, Campaign } from '../types'; // Assuming types are defined

interface DateRange {
  start: string; // ISO string
  end: string;   // ISO string
}

interface GrowthDataPoint {
  period: string; // e.g., "2023-Q1", "2023-01"
  count: number;
}

interface AdminDashboardStats {
  platformCounts: {
    organizations: number;
    properties: number;
    propertyManagers: number;
    organizationManagers: number;
    residents: number;
  };
  growthTrends?: {
    organizations?: GrowthDataPoint[];
    residents?: GrowthDataPoint[];
  };
  campaignOverview?: {
    totalCampaigns: number;
    totalAccepted: number;
    // conversionRate: number; // To be calculated based on a clear definition of "potential"
    typeBreakdown: { type: string; count: number }[];
  };
}

export const getAdminDashboardStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'User does not have permission to access admin statistics.');
  }

  // Ensure request.data exists before trying to destructure from it
  const data = request.data || {};
  const { dateRange } = data as { dateRange?: DateRange };

  try {
    const stats: AdminDashboardStats = {
      platformCounts: {
        organizations: 0,
        properties: 0,
        propertyManagers: 0,
        organizationManagers: 0,
        residents: 0,
      },
    };

    // 1. Platform Counts
    const orgsSnapshot = await db.collection('organizations').count().get();
    stats.platformCounts.organizations = orgsSnapshot.data().count;

    const propertiesSnapshot = await db.collectionGroup('properties').count().get();
    stats.platformCounts.properties = propertiesSnapshot.data().count;
    
    const residentsSnapshot = await db.collectionGroup('residents').count().get();
    stats.platformCounts.residents = residentsSnapshot.data().count;

    const adminsSnapshot = await db.collection('admins').get();
    adminsSnapshot.forEach(doc => {
      const adminData = doc.data();
      if (adminData.roles?.includes('organization_manager')) {
        stats.platformCounts.organizationManagers++;
      }
      // Note: Property Managers are in orgs/users, counting them here would be less efficient
      // than a dedicated collectionGroup query if needed, or denormalization.
      // For simplicity in Phase 1, we might defer precise PM count or use a different strategy.
    });
    
    // Count Property Managers (more complex as they are in subcollections)
    // This is an expensive query if done directly without denormalization.
    // For Phase 1, we can acknowledge this and plan for denormalization.
    // A placeholder or a simpler query might be used initially.
    // Example of a potentially expensive query (use with caution or denormalize):
    let pmCount = 0;
    if (stats.platformCounts.organizations > 0) { // Only run if there are orgs
        const organizations = await db.collection('organizations').get();
        for (const orgDoc of organizations.docs) {
            const usersSnapshot = await db.collection(`organizations/${orgDoc.id}/users`).where('organizationRoles', 'array-contains', 'property_manager').count().get();
            pmCount += usersSnapshot.data().count;
        }
    }
    stats.platformCounts.propertyManagers = pmCount;


    // 2. Growth Trends (Simplified for now, more complex grouping requires more logic)
    if (dateRange?.start && dateRange.end) {
      stats.growthTrends = { organizations: [], residents: [] };
      // TODO: Implement actual date range filtering and grouping by period (month/quarter)
      // This requires more complex query logic or iterating and processing.
      // For Phase 1, we might return total counts or a very simplified trend.
      // Example: just count orgs created in the last N days if dateRange is recent.
    }

    // 3. Campaign Overview
    const campaignsSnapshot = await db.collectionGroup('campaigns').get();
    stats.campaignOverview = {
      totalCampaigns: campaignsSnapshot.size,
      totalAccepted: 0,
      typeBreakdown: [],
    };
    const typeCounts: { [key: string]: number } = {};
    campaignsSnapshot.forEach(doc => {
      const campaign = doc.data(); // as Campaign; // Assuming Campaign type
      stats.campaignOverview!.totalAccepted += campaign.totalAccepted || 0;
      typeCounts[campaign.campaignType] = (typeCounts[campaign.campaignType] || 0) + 1;
    });
    stats.campaignOverview.typeBreakdown = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

    return stats;

  } catch (error) {
    throw handleHttpsError(error, 'Failed to retrieve admin dashboard statistics.');
  }
});
