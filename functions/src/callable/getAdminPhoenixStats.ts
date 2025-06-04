import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import fetch from 'node-fetch';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

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
  // Add other known analytics fields
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
const buildPhoenixUrl = (baseUrl: string, path: string, params: Record<string, string | number | undefined>): string => {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
};

// --- Individual Metric Fetchers ---

async function fetchVolumeTrends(
  // For simplicity, let's assume a fixed period for now, e.g., daily for last 7 days
  // In a real scenario, dateRange and granularity would be inputs
  phoenixApiBaseUrl: string
): Promise<any> { // Replace 'any' with a proper return type
  const trendsData = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);
    const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/form-submissions/search/source-meta', {
      applicationName: 'PropertyManagerPro',
      fromDate: `${dateStr}T00:00:00.000Z`,
      toDate: `${dateStr}T23:59:59.999Z`,
      limit: 1, // We only need the analytics block
    });

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Phoenix API error for volume trends on ${dateStr}: ${response.status} ${response.statusText}`);
        trendsData.push({ date: dateStr, count: 0 }); // Or handle error appropriately
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      trendsData.push({ 
        date: dateStr, 
        count: parseInt(result.analytics?.dispatched_count || '0', 10) 
      });
    } catch (error) {
      console.error(`Error fetching volume trends for ${dateStr}:`, error);
      trendsData.push({ date: dateStr, count: 0 }); // Or handle error appropriately
    }
  }
  return { volumeTrends: trendsData };
}

async function fetchTypeDistribution(
  phoenixApiBaseUrl: string,
  dateRange?: DateRange
): Promise<any> { // Replace 'any'
  // Example: predefined list of service types relevant to PMP
  const serviceTypesToQuery = ["Automotive Unlocking", "Dead Battery Jump-Start", "Tire Change"]; // Add more as needed
  const distributionData: Array<{ name: string; y: number }> = [];

  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    limit: 1, // We only need meta.total
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
        console.error(`Phoenix API error for type distribution (${type}): ${response.status} ${response.statusText}`);
        distributionData.push({ name: type, y: 0 });
        continue;
      }
      const result = await response.json() as PhoenixFormSubmissionResponse;
      distributionData.push({ name: type, y: result.meta.total });
    } catch (error) {
      console.error(`Error fetching type distribution for ${type}:`, error);
      distributionData.push({ name: type, y: 0 });
    }
  }
  return { typeDistribution: distributionData };
}

async function fetchAverageCompletionTime(
  phoenixApiBaseUrl: string,
  dateRange?: DateRange
): Promise<any> { // Replace 'any'
  const queryParams: Record<string, string | number | undefined> = {
    applicationName: 'PropertyManagerPro',
    status: 'completed,paid,invoiced', // Comma-separated for IN clause if API supports it, otherwise multiple queries or adjust API
    // Assuming API handles multiple statuses. If not, this needs adjustment.
    limit: 100, // Fetch a decent number of jobs, handle pagination if necessary
  };

  if (dateRange) {
    // Assuming we filter by when the job was COMPLETED
    queryParams.fromDate = dateRange.startDate; // This should ideally filter on job.completedAt
    queryParams.toDate = dateRange.endDate;   // This should ideally filter on job.completedAt
    // The current Phoenix API doc for jobs search doesn't explicitly state date filtering on completedAt.
    // This might require fetching more jobs and filtering client-side or API enhancement.
    // For now, we'll assume fromDate/toDate on jobs endpoint filters by createdAt or a default.
  }

  const apiUrl = buildPhoenixUrl(phoenixApiBaseUrl, '/jobs/search/source-meta', queryParams);
  let totalDurationMs = 0;
  let completedJobsCount = 0;

  try {
    // Simplified: no pagination handling for brevity in this initial draft
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`Phoenix API error for avg completion time: ${response.status} ${response.statusText}`);
      return { averageCompletionTime: null, error: 'API error' };
    }
    const result = await response.json() as PhoenixJobResponse;
    
    result.data.forEach(job => {
      if (job.completedAt && job.createdAt) {
        // Filter again for dateRange on completedAt if API didn't do it precisely
        if (dateRange) {
          const completedTimestamp = new Date(job.completedAt).getTime();
          if (completedTimestamp < new Date(dateRange.startDate).getTime() || completedTimestamp > new Date(dateRange.endDate).getTime()) {
            return; // Skip job if its completion is outside the dateRange
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
      return { averageCompletionTime: 0 }; // Or null if preferred for no data
    }
    const averageMs = totalDurationMs / completedJobsCount;
    return { averageCompletionTime: averageMs }; // in milliseconds

  } catch (error) {
    console.error('Error fetching average completion time:', error);
    return { averageCompletionTime: null, error: 'Processing error' };
  }
}


export const getAdminPhoenixStats = https.onCall(
  async (data: GetAdminPhoenixStatsData, context: CallableContext) => {
    // Temporarily disabled auth check for development as per plan
    // if (!context.auth) {
    //   throw handleHttpsError('unauthenticated', 'User must be authenticated.');
    // }
    // const { roles } = context.auth.token;
    // if (!roles?.includes('admin')) {
    //   throw handleHttpsError('permission-denied', 'User must be an admin.');
    // }

    if (!PHOENIX_API_URL_BASE) {
      console.error('PHOENIX_API_URL is not configured in function environment.');
      throw handleHttpsError('internal', 'Phoenix API configuration error.');
    }

    try {
      // For now, dateRange is optional and might not be used by all sub-fetchers in this simple version
      const { dateRange } = data; 

      // Fetch all stats in parallel
      const [
        volumeTrendsResult,
        typeDistributionResult,
        avgCompletionTimeResult,
      ] = await Promise.all([
        fetchVolumeTrends(PHOENIX_API_URL_BASE),
        fetchTypeDistribution(PHOENIX_API_URL_BASE, dateRange),
        fetchAverageCompletionTime(PHOENIX_API_URL_BASE, dateRange),
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
      console.error('Error in getAdminPhoenixStats:', error);
      if (error.code && error.message) { // Check if it's already an HttpsError
        throw error;
      }
      throw handleHttpsError(
        'internal',
        error.message || 'An internal error occurred while fetching admin Phoenix stats.'
      );
    }
  }
);
