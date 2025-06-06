# Tech Context: Multi-Tenant ERP-Style Web Application

## 1. Core Technologies

### Frontend
*   **React 19:**
    *   **Client Components:** For interactivity.
    *   **Server Components:** For performance and server-side data fetching.
*   **Material UI (MUI):** UI component library for Material Design.
*   **Material Icons:** Vector icons.
*   **State Management:**
    *   **React Context API:** Global state (user auth, theme).
    *   **React Hooks:** Local component state.
*   **Data Fetching (Client-Side):** Standard Fetch API. Client-side service modules (e.g., `src/lib/phoenixService.ts`) are used to encapsulate API calls. Server-side data fetching via Server Components is preferred where applicable.
*   **Charting/Visualization:** Highcharts for displaying analytics and reports.
*   **Advanced Select/Dropdowns:** `react-select` for features like multi-select, search, and custom styling.
*   **Address Autocompletion:** Google Places API. Uses `@react-google-maps/api`'s `useJsApiLoader` for script loading, then directly utilizes `google.maps.places.AutocompleteService` and `google.maps.Geocoder` with MUI `Autocomplete` component for UI.
*   **Schema Validation (Frontend):** `zod` for validating form inputs (e.g., phone numbers in the Twilio call request dialog).
*   **Build Tool:** (Implicit) Vite. Standard Node.js/npm ecosystem.

### Backend
*   **Firebase:**
    *   **Firebase Authentication:** User management, RBAC via custom claims.
    *   **Cloud Firestore:** NoSQL database (data: users, properties, residents, services, invitations, campaigns). Real-time updates. Firestore Security Rules for access control.
    *   **Firebase Cloud Functions:** Server-side logic, API (Node.js runtime for v1 and v2 functions). Includes callable, HTTP-triggered, and scheduled functions.
        *   **Third-Party Integrations:** Used for connecting to external services like Phoenix API (for service dispatch) and Twilio API (for click-to-call functionality via `requestTwilioCall` function).
    *   **Firebase Storage:** Used for file uploads, such as CSV files for bulk resident imports.
    *   **Firebase Hosting:** Static asset hosting, CDN.
    *   **`firestore-send-email` Extension:** For sending templated emails. This involves:
        *   `mail` collection: Documents written to this collection trigger email sending.
        *   `templates` collection: Stores email templates (e.g., for invitations, notifications).

## 2. Development Setup & Environment

*   **Node.js & npm/yarn:** Required for React development and Firebase CLI.
*   **Firebase CLI:** Essential for deploying functions, hosting, Firestore rules, and local emulation.
    *   The `seedTemplates.js` script (located in `scripts/`) can be used to seed email templates to Firestore. It accepts an `--env` flag (`emulator` or `production`) and defaults to the emulator with a confirmation step for production.
*   **IDE:** Visual Studio Code recommended, or any editor with good JavaScript/TypeScript support.
*   **Version Control:** Git (repository to be set up on a platform like GitHub, GitLab, or Bitbucket).
*   **Local Emulation:** Firebase Local Emulator Suite will be crucial for testing Authentication, Firestore, and Cloud Functions locally before deployment.
*   **API Keys & Firebase Function Configuration:**
    *   `VITE_GOOGLE_MAPS_API_KEY`: Client-side environment variable for Google Maps API key, used for Places Autocomplete. Stored in `.env` (gitignored).
    *   `VITE_PHOENIX_API_URL`: Client-side environment variable for the Phoenix API base URL. Stored in `.env` (gitignored).
    *   **Firebase Function Environment Variables (accessed via `process.env`):**
        *   `app.domain`: Used by Cloud Functions (e.g., `createCampaign`) to construct frontend URLs.
        *   `PHOENIX_API_URL`: Server-side environment variable for the Phoenix API base URL.
        *   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WEBHOOK_URL`: For Twilio integration used by `requestTwilioCall` function.
        *   These are typically configured via `dotenv` (e.g., in `functions/.env`) for local development/emulation and set as runtime environment variables for deployed functions.
*   **TypeScript Configuration & Best Practices:**
    *   The project utilizes TypeScript to enhance code quality and maintainability.
    *   **Strict Typing:** Adherence to strong typing is a core principle. The use of the `any` type is strongly discouraged and should be avoided unless absolutely necessary and well-justified. Prefer specific types, `unknown` coupled with type guards (as demonstrated in the error handling patterns in `systemPatterns.md`), or generics to ensure type safety.
    *   ESLint is configured with rules like `@typescript-eslint/no-explicit-any` to help enforce this standard.

## 3. Technical Constraints & Considerations

*   **Firebase Quotas and Limits:** Development must be mindful of Firebase usage quotas (e.g., Firestore reads/writes, Cloud Function invocations, storage, third-party API call limits via functions).
*   **Firestore Security Rules Complexity:** Writing and maintaining comprehensive and secure Firestore rules can be complex and requires careful planning and testing.
*   **Cold Starts (Cloud Functions):** Be aware of potential cold start latencies for infrequently used Cloud Functions and optimize where necessary.
*   **Data Modeling for NoSQL:** Careful consideration of data duplication vs. complex queries is needed for Firestore to ensure performance and scalability. Denormalization might be used strategically.
*   **React Server Components (RSC):**
    *   Relatively new technology; best practices are still evolving.
    *   Will be hosted on Firebase App Hosting, which may have specific requirements or limitations.
*   **Vendor Lock-in:** Heavy reliance on Firebase means a degree of vendor lock-in. This is a trade-off for the integrated services and development speed.
*   **Mixed v1/v2 Firebase Functions Typing:** Observed challenges with TypeScript type resolution in the local development environment when v1 and v2 Firebase Function types are used side-by-side. Explicit type imports (e.g., for `CallableContext`, `EventContext` from v1 paths) and careful attention to function signatures are necessary. Sometimes, `write_to_file` was used as a fallback if `replace_in_file` repeatedly failed due to these subtle type issues that might not affect deployment.

## 4. Key Dependencies (Conceptual)

*   **Frontend:**
    *   `react`, `react-dom`
    *   `@mui/material`, `@emotion/react`, `@emotion/styled` (for MUI)
    *   `@mui/icons-material`
    *   `@react-google-maps/api` (used for `useJsApiLoader` to load Google Maps API)
    *   `react-select` (for advanced dropdown/select components)
    *   `qrcode.react` (for generating QR codes for public campaign links)
    *   `zod` (for schema validation, e.g., phone numbers)
    *   `highcharts` (for charting)
    *   `highcharts-react-official` (React wrapper for Highcharts)
    *   Routing library (e.g., `react-router-dom`) - *Not explicitly mentioned but essential for a multi-page app.*
*   **Backend (Cloud Functions - Node.js example):**
    *   `firebase-admin` (for server-side Firebase access)
    *   `firebase-functions` (for writing Cloud Functions - v1 and v2)
    *   `node-fetch` (for making HTTP requests from Cloud Functions, e.g., to Phoenix API, Twilio API)
    *   `csv-parse` (for parsing CSV files in Cloud Functions)
    *   `dotenv` (for managing environment variables in Cloud Functions development/emulation)
    *   Potentially other NPM packages for specific integrations (e.g., CRM SDK, email libraries like Nodemailer).
*   **Development:**
    *   `firebase-tools` (Firebase CLI)
    *   `@types/express` (for v1 HTTP Cloud Function request/response types)
    *   `@types/qrcode.react` (type definitions for qrcode.react)
    *   Linters (ESLint), Prettier, TypeScript (optional but recommended for larger projects).
    *   `@types/react-select` (for `react-select` type definitions).

## 5. Tool Usage Patterns

*   **Firebase Console:** For managing Firebase services, viewing analytics, configuring authentication, and managing Firestore data manually if needed.
*   **Firebase CLI:** For deployment, local emulation, and managing Firebase project settings programmatically (including environment configuration for functions).
*   **React DevTools:** Browser extension for debugging React components and state.
*   **IDE Debugger:** For stepping through both frontend and backend (Cloud Functions, if using Node.js and configured for local debugging) code.
*   **Postman / Insomnia (or similar):** For testing Cloud Function HTTP endpoints directly.
*   **MUI Layout Components:** Prefer `Box` (with flexbox `sx` props) and `Stack` for creating layouts over `Grid` where `Grid` has shown to cause TypeScript typing issues or if simpler 1D/flex layouts are sufficient. While `Grid` is a powerful 2D layout tool and not deprecated, `Box` and `Stack` can offer more straightforward type safety and simpler API for many common layout scenarios. This preference helps avoid potential `Grid`-related type errors.
