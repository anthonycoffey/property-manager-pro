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

interface PhoenixJob {
  id: number | string;
  createdAt: string; // ISO string
  completedAt?: string | null; // ISO string
  status: string;
  // other job fields if needed by logic
}

interface PhoenixJobResponse {
  data: PhoenixJob[];
  meta: {
    total: number;
    currentPage: number;
    limit: number;
    lastPage: number;
  };
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
): Promise<{
  typeDistribution: Array<{ name: string; y: number }>;
  total_submissions?: string;
  dispatched_count?: string;
}> {
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
      return { typeDistribution: [], total_submissions: undefined, dispatched_count: undefined };
    }
    const result = await response.json() as PhoenixFormSubmissionResponse;

    logger.info(`Raw serviceTypeDistribution from Phoenix for Org: ${organizationId}, Prop: ${propertyId}:`, result.analytics?.serviceTypeDistribution);

    const distributionData =
      result.analytics &&
      Array.isArray(result.analytics.serviceTypeDistribution)
        ? result.analytics.serviceTypeDistribution.map((item) => ({
            name: item.type,
            y: item.count,
          }))
        : [];
    
    logger.info(`Processed typeDistribution for Org: ${organizationId}, Prop: ${propertyId}:`, distributionData);

    return {
      typeDistribution: distributionData,
      total_submissions: result.analytics?.total_submissions,
      dispatched_count: result.analytics?.dispatched_count,
    };

  } catch (error) {
    logger.error(`Error fetching or processing prop type distribution (Org: ${organizationId}, Prop: ${propertyId}):`, { error, apiUrl });
    return { typeDistribution: [], total_submissions: undefined, dispatched_count: undefined };
  }
}

async function fetchAverageCompletionTime(
  phoenixApiBaseUrl: string,
  organizationId: string,
  propertyId: string,
  dateRange?: DateRange
): Promise<{ averageCompletionTime: number | null; error?: string }> {
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    propertyId: propertyId,
    status: 'completed,paid,invoiced', // Assuming API handles comma-separated list for IN clause
    limit: 100, // Fetch a decent number of jobs, handle pagination if necessary for full accuracy
  };

  if (dateRange) {
    // Assuming API filters by completedAt within this range.
    // If not, client-side filtering post-fetch would be needed or API enhancement.
    queryParams.fromDate = dateRange.startDate;
    queryParams.toDate = dateRange.endDate;
  }

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'jobs/search/source-meta', queryParams);
  let totalDurationMs = 0;
  let completedJobsCount = 0;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      logger.error(
        `Phoenix API error for property avg completion time (Org: ${organizationId}, Prop: ${propertyId}): ${response.status} ${response.statusText}`,
        { apiUrl }
      );
      return { averageCompletionTime: null, error: 'API error' };
    }
    const result = (await response.json()) as PhoenixJobResponse;

    result.data.forEach((job) => {
      if (job.completedAt && job.createdAt) {
        // Additional client-side filtering for dateRange if API's fromDate/toDate is on createdAt
        if (dateRange) {
          const completedTimestamp = new Date(job.completedAt).getTime();
          if (
            completedTimestamp < new Date(dateRange.startDate).getTime() ||
            completedTimestamp > new Date(dateRange.endDate).getTime()
          ) {
            return; // Skip job if its completion is outside the dateRange
          }
        }
        const durationMs =
          new Date(job.completedAt).getTime() -
          new Date(job.createdAt).getTime();
        if (durationMs > 0) {
          // Ensure positive duration
          totalDurationMs += durationMs;
          completedJobsCount++;
        }
      }
    });

    if (completedJobsCount === 0) {
      return { averageCompletionTime: 0 }; // Or null if preferred for no data
    }
    const averageMs = totalDurationMs / completedJobsCount;
    return { averageCompletionTime: averageMs }; // in milliseconds
  } catch (error) {
    logger.error(
      `Error fetching property average completion time (Org: ${organizationId}, Prop: ${propertyId}):`,
      { error, apiUrl }
    );
    return { averageCompletionTime: null, error: 'Processing error' };
  }
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
      // OpenVsClosedRequests removed as per user feedback (6/5/2025)
      
      // Fetch all stats in parallel
      const [typeDistributionResult, avgCompletionTimeResult] =
        await Promise.all([
          fetchTypeDistribution(
            PHOENIX_API_URL_BASE,
            organizationId,
            propertyId,
            dateRange
          ),
          fetchAverageCompletionTime(
            PHOENIX_API_URL_BASE,
            organizationId,
            propertyId,
            dateRange
          ),
        ]);

      const responseData = {
        success: true,
        data: {
          ...typeDistributionResult,
          ...avgCompletionTimeResult, // Merge average completion time result
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
