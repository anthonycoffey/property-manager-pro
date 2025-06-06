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

interface GetAdminPhoenixStatsData {
  dateRange?: DateRange; // Optional for now, might be required by specific metrics
  // Add other specific parameters if needed, e.g., for trend granularity
}

// Define a more specific type for Phoenix API responses if possible
interface PhoenixAnalytics {
  total_submissions?: string;
  dispatched_count?: string;
  serviceTypeDistribution?: Array<{ type: string; count: number }>;
  [key: string]: any; // Allow other properties
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
  // other job fields
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

// Helper to construct Phoenix API URL with query parameters
const buildPhoenixUrl = (
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>
): string => {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
};

// --- Individual Metric Fetchers ---

// Volume Trends removed as per user feedback (6/4/2025)
// async function fetchVolumeTrends(...) { ... }

// Type Distribution reinstated as Phoenix API now provides the data (6/4/2025)
async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  dateRange?: DateRange
): Promise<{
  typeDistribution: Array<{ name: string; y: number }>;
  dispatched_count?: string;
  total_submissions?: string;
}> {
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    limit: 1, // We only need the analytics block for serviceTypeDistribution
  };

  if (dateRange) {
    queryParams.fromDate = dateRange.startDate;
    queryParams.toDate = dateRange.endDate;
  }

  const apiUrl = buildPhoenixUrl(
    phoenixApiBaseUrl,
    'form-submissions/search/source-meta',
    queryParams
  );

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      logger.error(
        `Phoenix API error for type distribution: ${response.status} ${response.statusText}`,
        { apiUrl }
      );
      return { typeDistribution: [] };
    }
    const result = (await response.json()) as PhoenixFormSubmissionResponse;

    logger.info(
      'Raw serviceTypeDistribution from Phoenix:',
      result.analytics?.serviceTypeDistribution
    );

    const distributionData =
      result.analytics &&
      Array.isArray(result.analytics.serviceTypeDistribution)
        ? result.analytics.serviceTypeDistribution.map((item) => ({
            name: item.type,
            y: item.count,
          }))
        : [];
    logger.info('Processed typeDistribution for Highcharts:', distributionData);
    return {
      typeDistribution: distributionData,
      total_submissions: result.analytics?.total_submissions,
      dispatched_count: result.analytics?.dispatched_count,
    };
  } catch (error) {
    logger.error('Error fetching or processing type distribution:', {
      error,
      apiUrl,
    });
    return { typeDistribution: [] };
  }
}

async function fetchAverageCompletionTime(
  phoenixApiBaseUrl: string,
  dateRange?: DateRange
): Promise<any> {
  // Replace 'any'
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    status: 'completed,paid,invoiced', // Comma-separated for IN clause if API supports it, otherwise multiple queries or adjust API
    // Assuming API handles multiple statuses. If not, this needs adjustment.
    limit: 100, // Fetch a decent number of jobs, handle pagination if necessary
  };

  if (dateRange) {
    // Assuming we filter by when the job was COMPLETED
    queryParams.fromDate = dateRange.startDate; // This should ideally filter on job.completedAt
    queryParams.toDate = dateRange.endDate; // This should ideally filter on job.completedAt
    // The current Phoenix API doc for jobs search doesn't explicitly state date filtering on completedAt.
    // This might require fetching more jobs and filtering client-side or API enhancement.
    // For now, we'll assume fromDate/toDate on jobs endpoint filters by createdAt or a default.
  }

  const apiUrl = buildPhoenixUrl(
    phoenixApiBaseUrl,
    'jobs/search/source-meta',
    queryParams
  ); // Removed leading /api
  console.log({ apiUrl });
  let totalDurationMs = 0;
  let completedJobsCount = 0;

  try {
    // Simplified: no pagination handling for brevity in this initial draft
    const response = await fetch(apiUrl);
    if (!response.ok) {
      logger.error(
        `Phoenix API error for avg completion time: ${response.status} ${response.statusText}`,
        { apiUrl }
      );
      return { averageCompletionTime: null, error: 'API error' };
    }
    const result = (await response.json()) as PhoenixJobResponse;

    result.data.forEach((job) => {
      if (job.completedAt && job.createdAt) {
        // Filter again for dateRange on completedAt if API didn't do it precisely
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
    logger.error('Error fetching average completion time:', { error, apiUrl });
    return { averageCompletionTime: null, error: 'Processing error' };
  }
}

export const getAdminPhoenixStats = https.onCall(
  async (data: GetAdminPhoenixStatsData, context: CallableContext) => {
    if (!context.auth) {
      throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { roles } = context.auth.token;
    if (!roles?.includes('admin')) {
      throw handleHttpsError('permission-denied', 'User must be an admin.');
    }
    logger.info('getAdminPhoenixStats called with data:', data);

    if (!PHOENIX_API_URL_BASE) {
      logger.error(
        'PHOENIX_API_URL is not configured in function environment.'
      );
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }

    try {
      const { dateRange } = data;

      // Fetch all stats in parallel
      // Volume Trends removed. Type Distribution reinstated.
      const [typeDistributionResult, avgCompletionTimeResult] =
        await Promise.all([
          fetchTypeDistribution(PHOENIX_API_URL_BASE, dateRange),
          fetchAverageCompletionTime(PHOENIX_API_URL_BASE, dateRange),
        ]);

      const responseData = {
        success: true,
        data: {
          ...typeDistributionResult,
          ...avgCompletionTimeResult,
        },
      };
      logger.info(
        'getAdminPhoenixStats successfully returned data:',
        responseData.data
      );
      return responseData;
    } catch (error: any) {
      logger.error('Error in getAdminPhoenixStats:', {
        error,
        inputData: data,
      });
      if (error.code && error.message) {
        // Check if it's already an HttpsError
        throw error;
      }
      throw handleHttpsError(
        'internal',
        error.message ||
          'An internal error occurred while fetching admin Phoenix stats.'
      );
    }
  }
);
