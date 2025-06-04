import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import fetch from 'node-fetch';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

const PHOENIX_API_URL_BASE = process.env.PHOENIX_API_URL;

interface DateRange {
  startDate: string; // ISO string
  endDate: string; // ISO string
}

interface GetPropertyManagerPhoenixStatsData {
  organizationId: string;
  propertyId: string;
  dateRange?: DateRange;
}

interface PhoenixAnalytics {
  total_submissions?: string;
  dispatched_count?: string;
  [key: string]: any;
}

interface PhoenixFormSubmissionResponse {
  data: any[];
  meta: {
    total: number;
    currentPage: number;
    limit: number;
    lastPage: number;
  };
  analytics?: PhoenixAnalytics;
}

// Note: PhoenixJobResponse is not strictly needed here if not fetching jobs for avg completion time
// interface PhoenixJob {
//   id: number | string;
//   createdAt: string; // ISO string
//   completedAt?: string | null; // ISO string
//   status: string;
// }

interface PhoenixJobResponseMinimal { // For meta.total from jobs endpoint
  meta: {
    total: number;
  };
  data: any[]; // data might not be needed if only meta.total is used
}


const buildPhoenixUrl = (baseUrl: string, path: string, params: Record<string, string | number | undefined>): string => {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
};

// --- Individual Metric Fetchers (scoped by organizationId and propertyId) ---

async function fetchVolumeTrends(
  phoenixApiBaseUrl: string,
  organizationId: string,
  propertyId: string
): Promise<any> {
  const trendsData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);
    const dateStr = targetDate.toISOString().split('T')[0];

    const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/form-submissions/search/source-meta', {
      applicationName: 'PropertyManagerPro',
      organizationId: organizationId,
      propertyId: propertyId,
      fromDate: `${dateStr}T00:00:00.000Z`,
      toDate: `${dateStr}T23:59:59.999Z`,
      limit: 1,
    });

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Phoenix API error for prop volume trends on ${dateStr} (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`);
        trendsData.push({ date: dateStr, count: 0 });
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      trendsData.push({ 
        date: dateStr, 
        count: parseInt(result.analytics?.dispatched_count || '0', 10) 
      });
    } catch (error) {
      console.error(`Error fetching prop volume trends for ${dateStr} (Org: ${organizationId}, Prop: ${propertyId}):`, error);
      trendsData.push({ date: dateStr, count: 0 });
    }
  }
  return { volumeTrends: trendsData };
}

async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  organizationId: string,
  propertyId: string,
  dateRange?: DateRange
): Promise<any> {
  const serviceTypesToQuery = ["Automotive Unlocking", "Dead Battery Jump-Start", "Tire Change"];
  const distributionData: Array<{ name: string; y: number }> = [];

  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    propertyId: propertyId,
    limit: 1,
  };

  if (dateRange) {
    queryParams.fromDate = dateRange.startDate;
    queryParams.toDate = dateRange.endDate;
  }

  for (const type of serviceTypesToQuery) {
    const specificParams = { ...queryParams, serviceType: type };
    const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/form-submissions/search/source-meta', specificParams);
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Phoenix API error for prop type distribution (${type}, Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`);
        distributionData.push({ name: type, y: 0 });
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      distributionData.push({ name: type, y: result.meta.total });
    } catch (error) {
      console.error(`Error fetching prop type distribution for ${type} (Org: ${organizationId}, Prop: ${propertyId}):`, error);
      distributionData.push({ name: type, y: 0 });
    }
  }
  return { typeDistribution: distributionData };
}

async function fetchOpenVsClosedRequests(
  phoenixApiBaseUrl: string,
  organizationId: string,
  propertyId: string,
  // dateRange?: DateRange // For "recently closed" if needed
): Promise<any> {
  let openCount = 0;
  let closedCount = 0;

  const baseParams = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    propertyId: propertyId,
    limit: 1, // We only need meta.total
  };

  // Fetch Open Requests
  const openStatuses = 'pending,assigned,en-route,in-progress';
  const openApiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/jobs/search/source-meta', { ...baseParams, status: openStatuses });
  try {
    const response = await fetch(openApiUrl);
    if (response.ok) {
      const result = await response.json() as PhoenixJobResponseMinimal;
      openCount = result.meta.total;
    } else {
      console.error(`Phoenix API error for open requests (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching open requests (Org: ${organizationId}, Prop: ${propertyId}):`, error);
  }

  // Fetch Closed Requests
  const closedStatuses = 'completed,paid,invoiced';
  // Add dateRange here if "recently closed" is desired
  // const closedParams = dateRange ? { ...baseParams, status: closedStatuses, fromDate: dateRange.startDate, toDate: dateRange.endDate } : { ...baseParams, status: closedStatuses };
  const closedApiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/jobs/search/source-meta', { ...baseParams, status: closedStatuses });
  try {
    const response = await fetch(closedApiUrl);
    if (response.ok) {
      const result = await response.json() as PhoenixJobResponseMinimal;
      closedCount = result.meta.total;
    } else {
      console.error(`Phoenix API error for closed requests (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching closed requests (Org: ${organizationId}, Prop: ${propertyId}):`, error);
  }

  return { openRequests: openCount, closedRequests: closedCount };
}


export const getPropertyManagerPhoenixStats = https.onCall(
  async (data: GetPropertyManagerPhoenixStatsData, context: CallableContext) => {
    // Temporarily disabled auth check
    // if (!context.auth) {
    //   throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    // }
    // const { roles, organizationId: tokenOrgId, propertyId: tokenPropId } = context.auth.token;
    // if (!roles?.includes('property_manager')) {
    //   throw handleHttpsError('permission-denied', 'User must be a property manager.');
    // }
    // if (!data.organizationId || data.organizationId !== tokenOrgId || !data.propertyId || data.propertyId !== tokenPropId) {
    //  throw handleHttpsError('permission-denied', 'Access denied to this organization or property.');
    // }


    if (!PHOENIX_API_URL_BASE) {
      console.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }
    
    if (!data.organizationId || !data.propertyId) {
        throw handleHttpsError('invalid-argument', 'Organization ID and Property ID are required.');
    }

    try {
      const { organizationId, propertyId, dateRange } = data;

      const [
        volumeTrendsResult,
        typeDistributionResult,
        openVsClosedResult,
      ] = await Promise.all([
        fetchVolumeTrends(PHOENIX_API_URL_BASE, organizationId, propertyId),
        fetchTypeDistribution(PHOENIX_API_URL_BASE, organizationId, propertyId, dateRange),
        fetchOpenVsClosedRequests(PHOENIX_API_URL_BASE, organizationId, propertyId /*, dateRange for closed */),
      ]);

      return {
        success: true,
        data: {
          ...volumeTrendsResult,
          ...typeDistributionResult,
          ...openVsClosedResult,
        },
      };
    } catch (error: any) {
      console.error('Error in getPropertyManagerPhoenixStats:', error);
      if (error.code && error.message) {
        throw error;
      }
      throw handleHttpsError(
        'internal',
        error.message || 'An internal error occurred while fetching property manager Phoenix stats.'
      );
    }
  }
);
