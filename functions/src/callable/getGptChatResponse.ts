import 'dotenv/config'; // Load environment variables from .env files
import functions from 'firebase-functions'; // Changed from * as functions
import { CallableContext } from 'firebase-functions/v1/https'; // Explicit v1 import
import fetch from 'node-fetch'; // Standard import for node-fetch v3+ with nodenext
import { _createServiceRequestLogic } from './createServiceRequest.js';
import { inspect } from 'util';

// Define interfaces based on our plan and Phoenix API response
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

interface RequestData {
  messages: ChatMessage[];
  maxTokens?: number;
  useFineTuned?: boolean;
  debugMode?: boolean;
  // captchaToken?: string | null; // Deferred for MVP
}

interface OpenAIChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChatCompletionChoice[];
  usage?: { // Optional usage field
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PhoenixService {
  id: number;
  name: string;
  description: string;
  price: number; // Assuming this is in cents
  isInternal: boolean;
  // Add any other relevant fields from Phoenix if needed for future logic
}

interface PhoenixPaginatedResponse {
  data: PhoenixService[];
  meta: {
    total: number;
    currentPage: number;
    limit: number;
    lastPage: number;
  };
}

// Helper function to fetch services pricing from Phoenix API
async function fetchServicesPricingFromPhoenix(debugMode = false, envPhoenixApiUrl?: string): Promise<string> {
  try {
    const phoenixApiBaseUrl = envPhoenixApiUrl; // Should now come from process.env
    // const phoenixApiKey = process.env.PHOENIX_API_KEY; // If Phoenix API needs auth

    if (!phoenixApiBaseUrl) {
      console.error('Phoenix API base URL not found in process.env or functions.config().');
      return 'Pricing information is currently unavailable (config error).';
    }

    let fetchLimit = 50; // Default high limit
    try {
        // Attempt to get the actual total to use as the limit
        const initialUrl = `${phoenixApiBaseUrl}/services?limit=1`;
        if (debugMode) console.log(`Fetching initial count from: ${initialUrl}`);
        const initialResponse = await fetch(initialUrl);
        if (initialResponse.ok) {
            const initialData = await initialResponse.json() as PhoenixPaginatedResponse;
            if (initialData.meta && initialData.meta.total > 0) {
                fetchLimit = initialData.meta.total;
                if (debugMode) console.log(`Phoenix API reports total services: ${fetchLimit}. Will use this as limit.`);
            } else {
                 if (debugMode) console.warn("Phoenix API meta.total was not positive, using default limit.", initialData.meta);
            }
        } else {
            if (debugMode) console.warn(`Initial count fetch failed with status ${initialResponse.status}, using default limit.`);
        }
    } catch (e: unknown) {
        if (debugMode) {
            if (e instanceof Error) {
                console.warn("Could not fetch initial count for services, using default limit.", e.message);
            } else {
                console.warn("Could not fetch initial count for services, using default limit. Unknown error:", e);
            }
        }
    }

    const fullPricingUrl = `${phoenixApiBaseUrl}/services?limit=${fetchLimit}`;
    console.log(`Full pricing URL constructed: ${fullPricingUrl}`);
    if (debugMode) console.log(`Fetching all pricing data from: ${fullPricingUrl}`);

    const response = await fetch(fullPricingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if phoenixApiKey is configured and needed
        // 'Authorization': `Bearer ${phoenixApiKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to fetch services from Phoenix: ${response.status} ${response.statusText}`, errorBody);
      return 'Pricing information is currently unavailable (API error).';
    }

    const responseData = await response.json() as PhoenixPaginatedResponse;
    const servicesFromPhoenix: PhoenixService[] = responseData.data || [];

    if (debugMode) console.log(`Fetched ${servicesFromPhoenix.length} services from Phoenix.`);

    if (servicesFromPhoenix.length === 0) {
      console.warn('No services returned from Phoenix API.');
      return 'No specific pricing information found. Please ask about available services.';
    }

    const targetServiceIds = [1, 3, 4, 5, 6, 11, 12, 14, 16, 19, 24, 25, 27, 32]; // From Deno prompt
    const finalFormattedPrices: string[] = [];

    for (const service of servicesFromPhoenix) {
      if (service.isInternal === false || targetServiceIds.includes(service.id)) {
        const name = service.name.trim();
        const priceInCents = service.price;
        let priceString: string | null = null;

        // MVP: Hardcoded overrides for specific services to match Deno prompt's desired output
        if (service.id === 1) { // Automotive Unlocking
          priceString = `${name}: $65-$125 depending on vehicle type and key complexity`;
        } else if (service.id === 3) { // Dead Battery Jump Start
          priceString = `${name}: $75 flat rate`;
        } else if (service.id === 4) { // Flat Tire Changing
          priceString = `${name}: $85-$125 depending on vehicle type and location`;
        } else if (service.id === 11 && name.toLowerCase().includes('towing')) { // Towing
          priceString = `${name}: $125 hookup fee plus $2.25 per mile`;
        }
        // End of Hardcoded Overrides
        else {
          // General logic for other services
          if (priceInCents > 0) {
            const priceInDollars = (priceInCents / 100).toFixed(2);
            if (service.id === 12 && service.description && service.description.toLowerCase().includes("can range from $50-$150")) {
                 priceString = `${name}: $50-$150 depending on the difficulty of the installation`;
            } else if (service.id === 14) { // Fuel Delivery
                 priceString = `${name}: $${priceInDollars} plus cost of fuel`;
            } else {
                 priceString = `${name}: $${priceInDollars} flat rate`;
            }
          } else { // price is 0 or null
            if (service.description && service.description.trim() !== "" && service.description.toLowerCase().includes("fees can range")) {
              priceString = `${name}: Price varies. ${service.description}`;
            } else if (service.description && service.description.trim() !== "") {
              priceString = `${name}: ${service.description}`;
            } else {
              priceString = `${name}: Price varies. Please inquire for a quote.`;
            }
          }
        }
        
        // Only add if it's a targeted service ID (or not internal) and we have a string for it
        if (priceString && (targetServiceIds.includes(service.id) || service.isInternal === false) ) {
            finalFormattedPrices.push(priceString);
        }
      }
    }
    if (debugMode) console.log("Final formatted prices for prompt:", finalFormattedPrices);
    return finalFormattedPrices.join('\n');
  } catch (error: unknown) {
    let errorMessage = 'Error retrieving pricing information. Please ask an agent for current rates.';
    if (error instanceof Error) {
        console.error('Error in fetchServicesPricingFromPhoenix:', error.message);
        errorMessage = `Error retrieving pricing: ${error.message.substring(0, 100)}`;
    } else {
        console.error('Unknown error in fetchServicesPricingFromPhoenix:', error);
    }
    return errorMessage;
  }
}

// Using 'any' for data initially, as Firebase will pass the object.
// For context, functions.https.CallableContext should be correct for v1 onCall.
// If v2 is intended, the function definition style would change.
// @ts-expect-error TODO: Resolve CallableContext type mismatch if it causes runtime issues. Linter seems to misinterpret v1 CallableContext with current setup.
export const getGptChatResponse = functions.https.onCall(async (data: any, context: CallableContext) => {
  // Log available configurations
  console.log("CF: Full data object received:", inspect(data, { depth: 2 }));
  const auth = data.auth || context.auth;
  console.log("CF: Attempting to log process.env relevant keys.");
  console.log("CF: process.env.OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
  console.log("CF: process.env.PHOENIX_API_URL exists:", !!process.env.PHOENIX_API_URL);
  // Note: When deploying to Firebase Functions, .env files in the functions directory
  // are automatically loaded and their variables are available via process.env.
  // When running locally with the emulator, 'dotenv/config' handles loading.

  // data object from v1 onCall can have circular structures if stringified directly.
  // Log the keys of the received data object to see if 'messages' is present at the top level.
  if (data && typeof data === 'object') {
    console.log("CF: Keys in received 'data' object:", Object.keys(data));
  } else {
    console.log("CF: Received 'data' is not an object or is null/undefined:", data);
  }

  // We still expect 'data.data' (the client's payload) to conform to RequestData structure.
  const clientPayload = data.data || {}; // Access the nested 'data' property sent by the client SDK
  const { messages, maxTokens = 300, useFineTuned = true, debugMode = false /*, captchaToken = null*/ } = clientPayload as RequestData;
  const isDebug = debugMode === true; // Ensure boolean

  // Log the destructured properties we care about
  console.log("CF: Received client payload properties - messages:", messages ? `Array with ${messages.length} item(s)` : messages, `| maxTokens: ${maxTokens} | useFineTuned: ${useFineTuned} | debugMode: ${isDebug}`);
  
  if (isDebug) {
    // More detailed log if client explicitly requests debugMode
    console.log("CF_DEBUG: Full client payload received:", JSON.stringify(clientPayload, null, 2));
    if (context.auth) { 
        console.log("CF_DEBUG: Called by authenticated user:", context.auth.uid);
    } else {
        console.log("Called by unauthenticated user (or context.auth is undefined).");
    }
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("Validation Error: Messages array is required and must be non-empty.");
    throw new functions.https.HttpsError('invalid-argument', 'Messages array is required and must be non-empty.');
  }

  try {
    // Use process.env for environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.RESCUE_LINK_OPENAI_API;
    const phoenixApiUrlFromEnv = process.env.PHOENIX_API_URL;

    if (!openaiApiKey) {
      console.error('OpenAI API key not found in process.env or functions.config().');
      throw new functions.https.HttpsError('internal', 'Chat service not configured (OpenAI API key missing). Please contact support.');
    }
    if (isDebug) console.log('CF_DEBUG: Successfully retrieved OpenAI API key (length):', openaiApiKey.length);

    // Pass phoenixApiUrl to fetchServicesPricingFromPhoenix, prioritizing env var
    const servicesPricing = await fetchServicesPricingFromPhoenix(isDebug, phoenixApiUrlFromEnv);
    console.log("CF: Fetched services pricing string length:", servicesPricing.length);
    if (isDebug) console.log('CF_DEBUG: Fetched services pricing for prompt content:', servicesPricing);

    const systemPromptContent = `You are RescueBot, a friendly and efficient virtual assistant for Rescue Rob's Roadside Services. Your primary goal is to collect all necessary information from the user to create a service request.

Your process is as follows:
1. Greet the user and ask how you can help.
2. Identify the service(s) the user needs from the list below.
3. Collect the user's full name, contact phone number, and full service location address.
4. Ask for the user's vehicle information (year, make, model, color).
5. Ask for a preferred service date and time.
6. Ask for consent to receive SMS messages regarding the service request.
7. Once you have gathered ALL of the required information, you MUST call the 'create_service_request' function to submit the request.
8. Do not ask for information you have already received in the conversation. Review the conversation history to see what has already been provided.
9. Be conversational and helpful, but stay focused on the goal of creating the service request.

AVAILABLE SERVICES & PRICING:
${servicesPricing}

SERVICE LIST FOR FUNCTION CALLING (use the ID and the full service name):
- Automotive Unlocking (ID: 1)
- Dead Battery Jump Start (ID: 3)
- Flat Tire Changing (ID: 4)
- Battery, Starter & Alt Test (ID: 5)
- Vehicle Battery Replacement (ID: 6)
- Towing (ID: 11)
- Car Battery Installation (ID: 12)
- Fuel Delivery (ID: 14)
- New Key (ID: 16)
- Tire Inflation (ID: 19)
- Key Fob Replacement (ID: 24)
- Key Fob Programming (ID: 25)
- Tire Repair (ID: 27)
- Tire Replacement (ID: 32)
- Other (ID: 35)
`;

    const systemMessage: ChatMessage = { role: 'system', content: systemPromptContent };
    const completeMessages: ChatMessage[] = messages[0]?.role === 'system' ? messages : [systemMessage, ...messages];

    const modelId = useFineTuned ? 'ft:gpt-4o-mini-2024-07-18:rescue-robs-roadside::BU1LpSKu' : 'gpt-4o-mini';
    console.log('CF: Using OpenAI model:', modelId);
    if (isDebug) console.log('CF_DEBUG: System prompt content length:', systemPromptContent.length);

    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_service_request',
          description: 'Creates a service request in the system once all information has been collected.',
          parameters: {
            type: 'object',
            properties: {
              residentNotes: { type: 'string', description: 'Any additional notes or details from the resident.' },
              serviceDateTime: { type: 'string', description: 'The requested date and time for the service in ISO 8601 format.' },
              phone: { type: 'string', description: 'The resident\'s contact phone number.' },
              smsConsent: { type: 'boolean', description: 'Whether the resident consents to receive SMS messages.' },
              serviceLocationAddress: {
                type: 'object',
                description: 'The full address for the service location.',
                properties: {
                  address_1: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  country: { type: 'string' },
                  zipcode: { type: 'string' },
                  fullAddress: { type: 'string' },
                },
                required: ['fullAddress'],
              },
              serviceTypes: {
                type: 'array',
                description: 'An array of services requested.',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', description: 'The ID of the service.' },
                    value: { type: 'string', description: 'The name of the service.' },
                  },
                  required: ['id', 'value'],
                },
              },
              isOffPremiseRequest: { type: 'boolean', description: 'Whether the service is at the resident\'s property or another location.' },
              car_year: { type: 'number', description: 'The year of the vehicle.' },
              car_make: { type: 'string', description: 'The make of the vehicle.' },
              car_model: { type: 'string', description: 'The model of the vehicle.' },
              car_color: { type: 'string', description: 'The color of the vehicle.' },
            },
            required: ['serviceDateTime', 'phone', 'smsConsent', 'serviceLocationAddress', 'serviceTypes'],
          },
        },
      },
    ];

    console.log("CF: 'completeMessages' to be sent to OpenAI (summary):", JSON.stringify(completeMessages.map(m => ({role: m.role, content: (m.content || "").substring(0,70) + "..."})), null, 2)); // Log snippet
    if (isDebug) {
      console.log('CF_DEBUG: Full "completeMessages" to OpenAI:', JSON.stringify(completeMessages, null, 2)); // Corrected string concatenation
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: completeMessages,
        max_tokens: maxTokens,
        temperature: 0.7,
        tools: tools,
        tool_choice: 'auto',
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error Status:', openaiResponse.status, openaiResponse.statusText);
      console.error('OpenAI API Error Response:', errorText);
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { error: { message: `Failed to parse error response: ${errorText.substring(0, 200)}...` } }; } // Removed _ignoredError
      throw new functions.https.HttpsError('internal', `OpenAI API error: ${openaiResponse.status} - ${errorData?.error?.message || 'Unknown error'}`);
    }

    const responseData = await openaiResponse.json() as OpenAIChatCompletionResponse;
    if (isDebug) console.log('DEBUG MODE - Full OpenAI response:', JSON.stringify(responseData, null, 2));

    const responseChoice = responseData.choices?.[0];

    if (!responseChoice) {
        console.error('Invalid response structure from OpenAI: No choices returned.', responseData);
        throw new functions.https.HttpsError('internal', 'Received an invalid response from the AI service.');
    }

    const { message } = responseChoice;

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === 'create_service_request') {
        const serviceRequestArgs = JSON.parse(toolCall.function.arguments);
        
        console.log('CF: AI is attempting to call create_service_request with args:', serviceRequestArgs);

        if (!auth) {
          throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to create a service request.');
        }

        const { organizationId, propertyId } = auth.token;

        if (!organizationId || !propertyId) {
          throw new functions.https.HttpsError('failed-precondition', 'User is not associated with an organization or property.');
        }

        const createServiceRequestData = {
          ...serviceRequestArgs,
          organizationId,
          propertyId,
        };

        const result = await _createServiceRequestLogic(createServiceRequestData, { ...context, auth });

        return {
          tool_call: {
            name: 'create_service_request',
            arguments: serviceRequestArgs,
          },
          message: `Service request created successfully! Your request ID is ${result.serviceRequestId}.`,
          model: modelId,
          request_id: responseData.id,
          finish_reason: responseChoice.finish_reason,
          serviceRequestResult: result,
        };
      }
    }

    if (!message.content) {
        console.error('Invalid response from OpenAI: Message content is empty.', responseData);
        throw new functions.https.HttpsError('internal', 'Received an empty message from the AI service.');
    }

    return {
      message: message.content,
      model: modelId,
      request_id: responseData.id,
      finish_reason: responseChoice.finish_reason,
    };

  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred in the chat function.';
    let errorName = 'UnknownError';
    let errorStack = undefined;

    if (error instanceof Error) {
        errorMessage = error.message;
        errorName = error.name;
        errorStack = error.stack;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
        if ('name' in error && typeof error.name === 'string') {
            errorName = error.name;
        }
    }

    console.error('Error in getGptChatResponse Firebase function:', errorMessage, errorStack || '(no stack available)');
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError instances directly
    }
    
    // For other errors, wrap them in a new HttpsError
    throw new functions.https.HttpsError('internal', errorMessage, {
        error_details: { name: errorName, original_stack: errorStack }
    });
  }
});
