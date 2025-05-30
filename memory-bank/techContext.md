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
*   **Data Fetching (Client-Side):** Standard Fetch API, but server-side data fetching will be done via Server Components and is always preferred over client-side fetching.
*   **Charting/Visualization:** Highcharts for displaying analytics and reports.
*   **Address Autocompletion:** Google Places API using the `google.maps.places.PlaceAutocompleteElement` (Web Component). Script loading managed by `@react-google-maps/api`'s `LoadScript`.
*   **Build Tool:** (Implicit) Likely Vite or Create React App, to be confirmed. Standard Node.js/npm/yarn ecosystem.

### Backend
*   **Firebase:**
    *   **Firebase Authentication:** User management, RBAC via custom claims.
    *   **Cloud Firestore:** NoSQL database (data: users, properties, residents, services, invitations, campaigns). Real-time updates. Firestore Security Rules for access control.
    *   **Firebase Cloud Functions:** Server-side logic, API (Node.js runtime for v1 and v2 functions). Includes callable, HTTP-triggered, and scheduled functions.
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
    *   **Firebase Function Environment Variables (set via Firebase CLI `functions:config:set`):**
        *   `app.domain`: This configuration is used by the `handleCampaignSignUpLink` HTTP function to determine the base URL for redirecting users to the frontend application (e.g., `http://localhost:5173` for emulator, `https://phoenix-property-manager-pro.web.app` for production). It's crucial for production that this is set to your actual frontend application domain.
        *   The `createCampaign` callable function constructs `accessUrl`s for public campaigns to directly invoke the `handleCampaignSignUpLink` HTTP function. The base URL for this HTTP function is determined by the environment:
            *   **Emulator:** `http://localhost:{emulators.functions.port}/{GCLOUD_PROJECT}/{region}/handleCampaignSignUpLink` (e.g., `http://localhost:5001/phoenix-property-manager-pro/us-central1/handleCampaignSignUpLink`)
            *   **Production:** `https://{region}-{GCLOUD_PROJECT}.cloudfunctions.net/handleCampaignSignUpLink` (e.g., `https://us-central1-phoenix-property-manager-pro.cloudfunctions.net/handleCampaignSignUpLink`)
            *   The `GCLOUD_PROJECT` environment variable is typically available in deployed functions; `phoenix-property-manager-pro` is used as a fallback in the code. The `region` (`us-central1`) is taken from `firebase.json`.

## 3. Technical Constraints & Considerations

*   **Firebase Quotas and Limits:** Development must be mindful of Firebase usage quotas (e.g., Firestore reads/writes, Cloud Function invocations, storage).
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
    *   `@react-google-maps/api` (used for `LoadScript` to load Google Maps API)
    *   `qrcode.react` (for generating QR codes for public campaign links)
    *   Routing library (e.g., `react-router-dom`) - *Not explicitly mentioned but essential for a multi-page app.*
*   **Backend (Cloud Functions - Node.js example):**
    *   `firebase-admin` (for server-side Firebase access)
    *   `firebase-functions` (for writing Cloud Functions - v1 and v2)
    *   `csv-parse` (for parsing CSV files in Cloud Functions)
    *   Potentially other NPM packages for specific integrations (e.g., CRM SDK, email libraries like Nodemailer).
*   **Development:**
    *   `firebase-tools` (Firebase CLI)
    *   `@types/express` (for v1 HTTP Cloud Function request/response types)
    *   `@types/qrcode.react` (type definitions for qrcode.react)
    *   Linters (ESLint), Prettier, TypeScript (optional but recommended for larger projects).

## 5. Tool Usage Patterns

*   **Firebase Console:** For managing Firebase services, viewing analytics, configuring authentication, and managing Firestore data manually if needed.
*   **Firebase CLI:** For deployment, local emulation, and managing Firebase project settings programmatically.
*   **React DevTools:** Browser extension for debugging React components and state.
*   **IDE Debugger:** For stepping through both frontend and backend (Cloud Functions, if using Node.js and configured for local debugging) code.
*   **Postman / Insomnia (or similar):** For testing Cloud Function HTTP endpoints directly.
*   **MUI Layout Components:** Prefer `Box` (with flexbox `sx` props) and `Stack` for creating layouts over `Grid` where `Grid` has shown to cause TypeScript typing issues or if simpler 1D/flex layouts are sufficient. While `Grid` is a powerful 2D layout tool and not deprecated, `Box` and `Stack` can offer more straightforward type safety and simpler API for many common layout scenarios. This preference helps avoid potential `Grid`-related type errors.
