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

interface GetOrgManagerPhoenixStatsData {
  organizationId: string;
  dateRange?: DateRange;
}

// Define a more specific type for Phoenix API responses if possible
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

// --- Individual Metric Fetchers (scoped by organizationId) ---

// Volume Trends removed as per user feedback (6/4/2025)
// async function fetchVolumeTrends(...) { ... }

// Type Distribution reinstated as Phoenix API now provides the data (6/4/2025)
async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  organizationId: string,
  dateRange?: DateRange
): Promise<{ typeDistribution: Array<{ name: string; y: number }> }> {
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    limit: 1, // We only need the analytics block
  };

  if (dateRange) {
    queryParams.fromDate = dateRange.startDate;
    queryParams.toDate = dateRange.endDate;
  }

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'form-submissions/search/source-meta', queryParams); 
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      logger.error(`Phoenix API error for org type distribution (Org: ${organizationId}): ${response.status} ${response.statusText}`, { apiUrl });
      return { typeDistribution: [] };
    }
    const result = await response.json() as PhoenixFormSubmissionResponse;

    logger.info(`Raw serviceTypeDistribution from Phoenix for Org: ${organizationId}:`, result.analytics?.serviceTypeDistribution);
    
    if (result.analytics?.serviceTypeDistribution) {
      const distributionData = result.analytics.serviceTypeDistribution.map(item => ({
        name: item.type,
        y: item.count,
      }));
      logger.info(`Processed typeDistribution for Org: ${organizationId}:`, distributionData);
      return { typeDistribution: distributionData };
    } else {
      logger.warn(`serviceTypeDistribution not found in Phoenix API response analytics for Org: ${organizationId}.`, { apiUrl, analytics: result.analytics });
      return { typeDistribution: [] };
    }
  } catch (error) {
    logger.error(`Error fetching or processing org type distribution (Org: ${organizationId}):`, { error, apiUrl });
    return { typeDistribution: [] };
  }
}

async function fetchAverageCompletionTime(
  phoenixApiBaseUrl: string,
  organizationId: string,
  dateRange?: DateRange
): Promise<any> {
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
    status: 'completed,paid,invoiced',
    limit: 100, 
  };

  if (dateRange) {
    queryParams.fromDate = dateRange.startDate; 
    queryParams.toDate = dateRange.endDate;   
  }

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, 'jobs/search/source-meta', queryParams); // Removed leading /api
  let totalDurationMs = 0;
  let completedJobsCount = 0;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      logger.error(`Phoenix API error for org avg completion time (Org: ${organizationId}): ${response.status} ${response.statusText}`, { apiUrl });
      return { averageCompletionTime: null, error: 'API error' };
    }
    const result = await response.json() as PhoenixJobResponse;
    
    result.data.forEach(job => {
      if (job.completedAt && job.createdAt) {
        if (dateRange) {
          const completedTimestamp = new Date(job.completedAt).getTime();
          if (completedTimestamp < new Date(dateRange.startDate).getTime() || completedTimestamp > new Date(dateRange.endDate).getTime()) {
            return; 
          }
        }
        const durationMs = new Date(job.completedAt).getTime() - new Date(job.createdAt).getTime();
        if (durationMs > 0) {
          totalDurationMs += durationMs;
          completedJobsCount++;
        }
      }
    });

    if (completedJobsCount === 0) {
      return { averageCompletionTime: 0 };
    }
    const averageMs = totalDurationMs / completedJobsCount;
    return { averageCompletionTime: averageMs };

  } catch (error) {
    logger.error(`Error fetching org average completion time (Org: ${organizationId}):`, { error, apiUrl });
    return { averageCompletionTime: null, error: 'Processing error' };
  }
}

export const getOrgManagerPhoenixStats = https.onCall(
  async (data: GetOrgManagerPhoenixStatsData, context: CallableContext) => {
    // Temporarily disabled auth check
    // if (!context.auth) {
    //   throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    // }
    // const { roles, organizationIds } = context.auth.token;
    // if (!roles?.includes('organization_manager')) {
    //   throw handleHttpsError('permission-denied', 'User must be an organization manager.');
    // }
    // if (!data.organizationId || !organizationIds?.includes(data.organizationId)) {
    //  throw handleHttpsError('permission-denied', 'Access denied to this organization.');
    // }
    logger.info("getOrgManagerPhoenixStats called with data:", data);

    if (!PHOENIX_API_URL_BASE) {
      logger.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }
    
    if (!data.organizationId) {
        throw handleHttpsError('invalid-argument', 'Organization ID is required.');
    }

    try {
      const { organizationId, dateRange } = data;

      // Volume Trends removed. Type Distribution reinstated.
      const [
        typeDistributionResult,
        avgCompletionTimeResult,
      ] = await Promise.all([
        fetchTypeDistribution(PHOENIX_API_URL_BASE, organizationId, dateRange),
        fetchAverageCompletionTime(PHOENIX_API_URL_BASE, organizationId, dateRange),
      ]);

      const responseData = {
        success: true,
        data: {
          ...typeDistributionResult,
          ...avgCompletionTimeResult,
        },
      };
      logger.info(`getOrgManagerPhoenixStats successfully returned data for Org: ${organizationId}:`, responseData.data);
      return responseData;
    } catch (error: any) {
      logger.error('Error in getOrgManagerPhoenixStats:', { error, inputData: data });
      if (error.code && error.message) {
        throw error;
      }
      throw handleHttpsError(
        'internal',
        error.message || 'An internal error occurred while fetching organization manager Phoenix stats.'
      );
    }
  }
);
