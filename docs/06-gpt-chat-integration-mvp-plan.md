# Plan: GPT Chat Integration (MVP)

**Date:** 2025-05-31

## 1. Goal

To integrate a GPT-based chat assistant into the Property Manager Pro application. For the Minimum Viable Product (MVP), the chat assistant will use a single system prompt primarily aimed at assisting **Residents** with roadside assistance inquiries. However, the chat interface will be accessible to **all user roles** (Admin, Organization Manager, Property Manager, Resident) for testing and validation purposes.

## 2. Backend Implementation (Firebase Callable Function)

A new Firebase Callable Function, `getGptChatResponse`, will be created.

*   **Location:** `functions/src/callable/getGptChatResponse.ts`
*   **Trigger:** HTTPS Callable.
*   **Authentication:** Standard Firebase Callable Function authentication (client sends Firebase Auth ID token).
*   **Inputs from Client (`data` object):**
    *   `messages: ChatMessage[]` (Required: Array of chat messages with `role` and `content`)
    *   `maxTokens?: number` (Optional, defaults to ~300)
    *   `useFineTuned?: boolean` (Optional, defaults to `true`)
    *   `debugMode?: boolean` (Optional, defaults to `false` for verbose server-side logging)
*   **Firebase Function Configuration (to be set via `firebase functions:config:set`):**
    *   `openai.api_key`: The API key for OpenAI.
    *   `phoenix.api_url`: The base URL for the Phoenix API (e.g., `http://localhost:5000` for local, actual URL for production).
    *   `phoenix.api_key` (Optional): If the Phoenix pricing API requires server-side authentication.
*   **Core Logic:**
    1.  **Retrieve Configuration:** Load `OPENAI_API_KEY`, `PHOENIX_API_URL` (and `PHOENIX_API_KEY` if needed) from `functions.config()`.
    2.  **Fetch Service Pricing from Phoenix:**
        *   Implement an internal async function `fetchServicesPricingFromPhoenix()`.
        *   This function will call the Phoenix API endpoint: `GET {PHOENIX_API_URL}/services?limit=TOTAL_SERVICES` (e.g., `limit=50` or dynamically set based on an initial call to get `meta.total`). This endpoint is expected to be publicly accessible without authentication.
        *   **Filter Services:**
            *   Exclude services where `isInternal: true` from the Phoenix response, UNLESS the `service.id` is in the `targetServiceIds` list (derived from the Deno reference system prompt: `[1, 3, 4, 5, 6, 11, 12, 14, 16, 19, 24, 25, 27, 32]`).
        *   **Format Pricing String (MVP Approach):**
            *   For specific services where the Deno prompt implies detailed pricing not available directly from Phoenix API fields (e.g., Towing ID 11: "$125 hookup fee plus $2.25 per mile"; Automotive Unlocking ID 1: "$65-$125 depending on..."), these specific strings will be **hardcoded** in the mapping logic within `fetchServicesPricingFromPhoenix()`.
            *   For other services, pricing will be derived from available Phoenix data:
                *   If `service.price > 0` (assume cents): Format as `$X.XX flat rate`. (Special handling for Fuel Delivery ID 14 to add "plus cost of fuel", and Car Battery Installation ID 12 to use its description if it provides a range).
                *   If `service.price === 0`: Use `service.description` if informative, otherwise a generic "Price varies. Please inquire for a quote."
            *   Join formatted strings with `\n`.
    3.  **Construct System Prompt:**
        *   Use a single, static system prompt template (the "RescueBot" persona focused on resident roadside assistance).
        *   Inject the dynamically fetched and formatted `servicesPricing` string into this prompt.
    4.  **Prepare Messages for OpenAI:** Prepend the generated system prompt to the `messages` array received from the client (if a system prompt isn't already the first message).
    5.  **Determine OpenAI Model ID:**
        *   If `useFineTuned` is `true` (default): Use the specified fine-tuned model ID (`ft:gpt-4o-mini-2024-07-18:rescue-robs-roadside::BU1LpSKu`).
        *   Else: Use a default model (e.g., `gpt-4o-mini`).
    6.  **Call OpenAI Chat Completions API:**
        *   Use `fetch` to send the request to `https://api.openai.com/v1/chat/completions`.
        *   Include the model ID, prepared messages, `max_tokens`, and a suitable `temperature` (e.g., 0.7).
    7.  **Handle OpenAI Response:**
        *   Check for API errors from OpenAI.
        *   Extract the assistant's message content, model used, request ID, and finish reason.
    8.  **Return Response to Client:** Send a JSON object containing the assistant's reply and relevant metadata.
    9.  **Error Handling:** Implement robust error handling for API calls, configuration issues, etc., returning appropriate `HttpsError` to the client.
    10. **reCAPTCHA:** Deferred for MVP. No reCAPTCHA verification will be implemented in this version.

## 3. Frontend Implementation (React)

*   **Shared Chat UI Component:**
    *   A new set of shared components will be created, likely under `src/components/Shared/ChatFeature/` (e.g., `ChatView.tsx`, `ChatInput.tsx`, `ChatMessageItem.tsx`).
    *   These components will be responsible for rendering the chat interface, managing message history (local state), and handling user input.
    *   The implementation will draw structural and UX inspiration from the reference components located in `D:\repos\property-manager-pro\rescuelink\src\components`.
    *   Styling will be done using Material UI to align with the existing application theme.
*   **Calling the Backend:**
    *   The `ChatView.tsx` (or a custom hook it uses) will call the `getGptChatResponse` Firebase Callable Function using the Firebase SDK.
    *   It will pass the current conversation history and the new user message.
*   **Dashboard Integration:**
    *   The main shared chat UI component (`ChatView.tsx`) will be integrated as a new tab (e.g., labeled "AI Assistant" or "Chat") within the following existing dashboard panels:
        *   `src/components/Dashboard/AdminDashboardPanel.tsx`
        *   `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx`
        *   `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`
        *   `src/components/Resident/ResidentDashboard.tsx` (or its panel equivalent if refactored)
    *   All user roles will interact with the same "RescueBot" instance for MVP.

## 4. Future Considerations (Post-MVP)

*   **Role-Specific System Prompts:** Introduce different system prompts and conversational goals for Admin, OM, and PM roles.
*   **Advanced RAG:** Implement a full Retrieval Augmented Generation (RAG) system with a vector database for a broader knowledge base (FAQs, application help, policy documents) tailored to different user roles.
*   **reCAPTCHA Integration:** Add reCAPTCHA verification to the backend function for enhanced security.
*   **Phoenix API Enhancement:** Work towards having the Phoenix API provide more structured pricing data to reduce hardcoding and improve accuracy.
*   **Conversation History Persistence:** Optionally persist chat history in Firestore.

## 5. Key Assumptions for MVP

*   The Phoenix API `GET /services` endpoint can return all service data (approx. 32 items) in a single call by using a `limit` query parameter.
*   The `OPENAI_API_KEY` and `PHOENIX_API_URL` (and `PHOENIX_API_KEY` if needed by Phoenix for pricing) will be correctly set in Firebase Function Configuration before deployment.
*   The fine-tuned OpenAI model (`ft:gpt-4o-mini-2024-07-18:rescue-robs-roadside::BU1LpSKu`) is accessible and performs as expected.
*   For MVP, the "one-size-fits-all" (resident-focused) chatbot experience is acceptable for all roles for testing purposes.

This document outlines the plan for the MVP of the GPT Chat integration.
