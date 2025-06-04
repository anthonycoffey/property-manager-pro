import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import fetch from 'node-fetch';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

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

async function fetchVolumeTrends(
  phoenixApiBaseUrl: string,
  organizationId: string
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
      fromDate: `${dateStr}T00:00:00.000Z`,
      toDate: `${dateStr}T23:59:59.999Z`,
      limit: 1,
    });

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Phoenix API error for org volume trends on ${dateStr} (Org: ${organizationId}): ${response.status} ${response.statusText}`);
        trendsData.push({ date: dateStr, count: 0 });
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      trendsData.push({ 
        date: dateStr, 
        count: parseInt(result.analytics?.dispatched_count || '0', 10) 
      });
    } catch (error) {
      console.error(`Error fetching org volume trends for ${dateStr} (Org: ${organizationId}):`, error);
      trendsData.push({ date: dateStr, count: 0 });
    }
  }
  return { volumeTrends: trendsData };
}

async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  organizationId: string,
  dateRange?: DateRange
): Promise<any> {
  const serviceTypesToQuery = ["Automotive Unlocking", "Dead Battery Jump-Start", "Tire Change"];
  const distributionData: Array<{ name: string; y: number }> = [];

  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    organizationId: organizationId,
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
        console.error(`Phoenix API error for org type distribution (${type}, Org: ${organizationId}): ${response.status} ${response.statusText}`);
        distributionData.push({ name: type, y: 0 });
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      distributionData.push({ name: type, y: result.meta.total });
    } catch (error) {
      console.error(`Error fetching org type distribution for ${type} (Org: ${organizationId}):`, error);
      distributionData.push({ name: type, y: 0 });
    }
  }
  return { typeDistribution: distributionData };
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

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/jobs/search/source-meta', queryParams);
  let totalDurationMs = 0;
  let completedJobsCount = 0;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`Phoenix API error for org avg completion time (Org: ${organizationId}): ${response.status} ${response.statusText}`);
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
    console.error(`Error fetching org average completion time (Org: ${organizationId}):`, error);
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

    if (!PHOENIX_API_URL_BASE) {
      console.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }
    
    if (!data.organizationId) {
        throw handleHttpsError('invalid-argument', 'Organization ID is required.');
    }

    try {
      const { organizationId, dateRange } = data;

      const [
        volumeTrendsResult,
        typeDistributionResult,
        avgCompletionTimeResult,
      ] = await Promise.all([
        fetchVolumeTrends(PHOENIX_API_URL_BASE, organizationId),
        fetchTypeDistribution(PHOENIX_API_URL_BASE, organizationId, dateRange),
        fetchAverageCompletionTime(PHOENIX_API_URL_BASE, organizationId, dateRange),
      ]);

      return {
        success: true,
        data: {
          ...volumeTrendsResult,
          ...typeDistributionResult,
          ...avgCompletionTimeResult,
        },
      };
    } catch (error: any) {
      console.error('Error in getOrgManagerPhoenixStats:', error);
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
