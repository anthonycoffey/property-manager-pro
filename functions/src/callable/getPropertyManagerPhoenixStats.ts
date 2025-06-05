import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import fetch from 'node-fetch';
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import * as logger from 'firebase-functions/logger';

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
  serviceTypeDistribution?: Array<{ type: string; count: number }>;
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

// Volume Trends removed as per user feedback (6/4/2025)
// async function fetchVolumeTrends(...) { ... }

// Type Distribution reinstated as Phoenix API now provides the data (6/4/2025)
async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  organizationId: string,
  propertyId: string,
  dateRange?: DateRange
): Promise<{ typeDistribution: Array<{ name: string; y: number }> }> {
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    propertyId: propertyId,
    limit: 1, // We only need the analytics block
  };

  if (dateRange) {
    queryParams.fromDate = dateRange.startDate;
    queryParams.toDate = dateRange.endDate;
  }

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'form-submissions/search/source-meta', queryParams); 
  
  try {
    const response = await fetch(apiUrl);
    logger.info({apiUrl});
    if (!response.ok) {
      logger.error(`Phoenix API error for prop type distribution (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`, { apiUrl });
      return { typeDistribution: [] };
    }
    const result = await response.json() as PhoenixFormSubmissionResponse;

    logger.info(`Raw serviceTypeDistribution from Phoenix for Org: ${organizationId}, Prop: ${propertyId}:`, result.analytics?.serviceTypeDistribution);
    
    if (result.analytics?.serviceTypeDistribution) {
      const distributionData = result.analytics.serviceTypeDistribution.map(item => ({
        name: item.type,
        y: item.count,
      }));
      logger.info(`Processed typeDistribution for Org: ${organizationId}, Prop: ${propertyId}:`, distributionData);
      return { typeDistribution: distributionData };
    } else {
      logger.warn(`serviceTypeDistribution not found in Phoenix API response analytics for Org: ${organizationId}, Prop: ${propertyId}.`, { apiUrl, analytics: result.analytics });
      return { typeDistribution: [] };
    }
  } catch (error) {
    logger.error(`Error fetching or processing prop type distribution (Org: ${organizationId}, Prop: ${propertyId}):`, { error, apiUrl });
    return { typeDistribution: [] };
  }
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
  };

  // Fetch Open Requests
  const openStatuses = 'pending,assigned,en-route,in-progress';
  const openApiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'jobs/search/source-meta', { ...baseParams, status: openStatuses }); // Removed leading /api
  try {
    const response = await fetch(openApiUrl);
    if (response.ok) {
      const result = await response.json() as PhoenixJobResponseMinimal;
      openCount = result.meta.total;
    } else {
      logger.error(`Phoenix API error for open requests (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`, { apiUrl: openApiUrl });
    }
  } catch (error) {
    logger.error(`Error fetching open requests (Org: ${organizationId}, Prop: ${propertyId}):`, { error, apiUrl: openApiUrl });
  }

  // Fetch Closed Requests
  const closedStatuses = 'completed,paid,invoiced';
  // Add dateRange here if "recently closed" is desired
  // const closedParams = dateRange ? { ...baseParams, status: closedStatuses, fromDate: dateRange.startDate, toDate: dateRange.endDate } : { ...baseParams, status: closedStatuses };
  const closedApiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'jobs/search/source-meta', { ...baseParams, status: closedStatuses }); // Removed leading /api
  try {
    const response = await fetch(closedApiUrl);
    if (response.ok) {
      const result = await response.json() as PhoenixJobResponseMinimal;
      closedCount = result.meta.total;
    } else {
      logger.error(`Phoenix API error for closed requests (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`, { apiUrl: closedApiUrl });
    }
  } catch (error) {
    logger.error(`Error fetching closed requests (Org: ${organizationId}, Prop: ${propertyId}):`, { error, apiUrl: closedApiUrl });
  }

  return { openRequests: openCount, closedRequests: closedCount };
}


export const getPropertyManagerPhoenixStats = https.onCall(
  async (data: GetPropertyManagerPhoenixStatsData, context: CallableContext) => {
    //  auth check
    if (!context.auth) {
      throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { roles, organizationId: tokenOrgId } = context.auth.token;
    if (!roles?.includes('property_manager')) {
      throw handleHttpsError('permission-denied', 'User must be a property manager.');
    }
    if (!data.organizationId || data.organizationId !== tokenOrgId || !data.propertyId ) {
     throw handleHttpsError('permission-denied', 'Access denied to this organization or property.');
    }
    logger.info("getPropertyManagerPhoenixStats called with data:", data);

    if (!PHOENIX_API_URL_BASE) {
      logger.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }
    
    if (!data.organizationId || !data.propertyId) {
        throw handleHttpsError('invalid-argument', 'Organization ID and Property ID are required.');
    }

    try {
      const { organizationId, propertyId, dateRange } = data;

      // Volume Trends removed. Type Distribution reinstated.
      const [
        typeDistributionResult,
        openVsClosedResult,
      ] = await Promise.all([
        fetchTypeDistribution(PHOENIX_API_URL_BASE, organizationId, propertyId, dateRange),
        fetchOpenVsClosedRequests(PHOENIX_API_URL_BASE, organizationId, propertyId /*, dateRange for closed */),
      ]);

      const responseData = {
        success: true,
        data: {
          ...typeDistributionResult,
          ...openVsClosedResult,
        },
      };
      logger.info(`getPropertyManagerPhoenixStats successfully returned data for Org: ${organizationId}, Prop: ${propertyId}:`, responseData.data);
      return responseData;
    } catch (error: any) {
      logger.error('Error in getPropertyManagerPhoenixStats:', { error, inputData: data });
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
