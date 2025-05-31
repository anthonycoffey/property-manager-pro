import functions from 'firebase-functions'; // Changed from * as functions
import { CallableContext } from 'firebase-functions/v1/https'; // Explicit v1 import
import fetch from 'node-fetch'; // Standard import for node-fetch v3+ with nodenext

// Define interfaces based on our plan and Phoenix API response
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
async function fetchServicesPricingFromPhoenix(debugMode = false): Promise<string> {
  try {
    const phoenixApiBaseUrl = functions.config().phoenix?.api_url;
    // const phoenixApiKey = functions.config().phoenix?.api_key; // If Phoenix API needs auth

    if (!phoenixApiBaseUrl) {
      console.error('Phoenix API base URL not configured in Firebase functions config.');
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
  // We still expect 'data' to conform to RequestData structure.
  const { messages, maxTokens = 300, useFineTuned = true, debugMode = false /*, captchaToken = null*/ } = data as RequestData;
  const isDebug = debugMode === true; // Ensure boolean

  if (isDebug) {
    console.log("getGptChatResponse called with data:", JSON.stringify(data));
    if (context.auth) { // context.auth is optional, so check if it exists
        console.log("Called by authenticated user:", context.auth.uid);
    } else {
        console.log("Called by unauthenticated user (or context.auth is undefined).");
    }
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("Validation Error: Messages array is required and must be non-empty.");
    throw new functions.https.HttpsError('invalid-argument', 'Messages array is required and must be non-empty.');
  }

  try {
    const openaiApiKey = functions.config().openai?.api_key || functions.config().rescue_link?.openai_api;
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured in Firebase functions config.');
      throw new functions.https.HttpsError('internal', 'Chat service not configured. Please contact support.');
    }
    if (isDebug) console.log('Successfully retrieved OpenAI API key.');

    const servicesPricing = await fetchServicesPricingFromPhoenix(isDebug);
    if (isDebug) console.log('Fetched services pricing for prompt:', servicesPricing);

    const systemPromptContent = `You are RescueBot, a friendly and helpful virtual assistant for Rescue Rob's Roadside Services.

Your primary job is to help stranded motorists get the roadside assistance they need by guiding them through a structured conversation:
1. Welcome the user and introduce yourself as an AI-powered assistant
2. Ask for their name
3. Ask for their phone number (important: format as (xxx) xxx-xxxx)
4. Ask for their exact location (address or landmarks). Get full address with city, state and zipcode when possible.
5. Ask about their vehicle details (make, model, year, color)
6. Ask if they have a preferred service time (default to immediate if they're stranded)
7. Identify the service needed (lockout, jump start, flat tire, towing, etc.)
8. Summarize the information and ask for confirmation
9. Submit the service request after confirmation (Note: You will not actually submit, just confirm you would)
10. Provide next steps and expected timeframe

PRICING INFORMATION:
When asked about pricing, be transparent and use ONLY the following official pricing information:
${servicesPricing}

IMPORTANT PRICING GUIDELINES:
- Always provide the full price range when discussing services
- Explain what factors affect the final price (vehicle type, key complexity, etc.)
- Never quote a single fixed price unless it's specifically a flat rate service
- If asked about services not listed above, say you need to check with a service coordinator
- Format all pricing information consistently as shown above

Important: When extracting information, be precise and consistent. Format phone numbers as (xxx) xxx-xxxx. 
Always get as complete address information as possible, including city, state and zip code. 
When identifying services, match them exactly to our service catalog including the service ID.

Make sure to clearly distinguish between different service types and match them to these exact options:
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

Keep responses brief but helpful. Stay focused on helping the user quickly get the service they need.`;

    const systemMessage: ChatMessage = { role: 'system', content: systemPromptContent };
    const completeMessages: ChatMessage[] = messages[0]?.role === 'system' ? messages : [systemMessage, ...messages];

    const modelId = useFineTuned ? 'ft:gpt-4o-mini-2024-07-18:rescue-robs-roadside::BU1LpSKu' : 'gpt-4o-mini';
    if (isDebug) console.log('Using OpenAI model:', modelId);

    if (isDebug) {
      console.log('DEBUG MODE - Full messages to OpenAI:', JSON.stringify(completeMessages, null, 2));
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

    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message || !responseData.choices[0].message.content) {
        console.error('Invalid response structure from OpenAI or empty message content:', responseData);
        throw new functions.https.HttpsError('internal', 'Received an invalid or empty response from the AI service.');
    }

    return {
      message: responseData.choices[0].message.content,
      model: modelId,
      request_id: responseData.id,
      finish_reason: responseData.choices[0].finish_reason,
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
