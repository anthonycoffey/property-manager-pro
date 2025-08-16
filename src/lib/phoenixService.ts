// src/lib/phoenixService.ts

const PHOENIX_API_URL = import.meta.env.VITE_PHOENIX_API_URL;

export interface PhoenixService {
  id: number;
  name: string;
  description?: string;
  price?: number;
  isInternal?: boolean;
  // Add any other fields from the service object you might need later
  // createdAt?: string;
  // updatedAt?: string;
  // deletedAt?: string | null;
  // payoutRate?: number;
  // payoutMinimum?: number;
  // isDefault?: boolean | null;
}

interface PhoenixServicesApiResponse {
  data: PhoenixService[];
  meta: {
    total: number;
    currentPage: number;
    limit: number;
    lastPage: number;
  };
}

/**
 * Fetches the list of available services from the Phoenix API.
 * Filters out internal services by default.
 * @param includeInternal Whether to include services marked as internal. Defaults to false.
 * @returns A promise that resolves to an array of PhoenixService objects.
 * @throws Error if the API call fails or if the API URL is not configured.
 */
export async function getPhoenixServices(includeInternal: boolean = false): Promise<PhoenixService[]> {
  if (!PHOENIX_API_URL) {
    const errorMessage = 'VITE_PHOENIX_API_URL is not configured. Please check your .env file.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    // Using limit=100 as per your example to fetch all services in one go if possible
    const response = await fetch(`${PHOENIX_API_URL}/services?limit=50&isAmeniLink=true`); 

    if (!response.ok) {
      let errorDetails = response.statusText;
      try {
        const errorData = await response.json();
        errorDetails = errorData?.message || errorDetails;
      } catch (jsonParseError) {
        console.error('Failed to parse Phoenix API error response as JSON:', jsonParseError);
        // errorDetails will default to response.statusText if JSON parsing fails
      }
      const errorMessage = `Failed to fetch services data: ${response.status} ${errorDetails}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const result: PhoenixServicesApiResponse = await response.json();
    
    if (!result || !Array.isArray(result.data)) {
      const errorMessage = 'Invalid response structure from Services API.';
      console.error(errorMessage, result);
      throw new Error(errorMessage);
    }

    return includeInternal ? result.data : result.data.filter(service => !service.isInternal);
  } catch (error) {
    // Log the error if it's not one we've already constructed
    if (!(error instanceof Error && error.message.startsWith('Failed to fetch services')) &&
        !(error instanceof Error && error.message.startsWith('VITE_PHOENIX_API_URL is not configured'))) {
      console.error('An unexpected error occurred while fetching services:', error);
    }
    // Re-throw the original or a generic error
    throw error instanceof Error ? error : new Error('An unexpected error occurred while fetching services.');
  }
}
