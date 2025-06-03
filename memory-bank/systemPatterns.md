# System Patterns: Multi-Tenant ERP-Style Web Application

## 1. System Architecture Overview

The application employs a modern web architecture with a React-based frontend and a Firebase-powered backend. It utilizes a hybrid rendering model, combining Client-Side Rendering (CSR) with React Server Components for optimal performance and user experience.

- **Frontend:**
  - **React 19:** Core library for building the user interface.
    - **Client Components:** Used for interactive elements, forms, and real-time UI updates.
    - **Server Components:** Strategically used for initial data fetching, rendering static or data-heavy sections to improve load times and reduce client-side bundle size.
  - **Material UI (MUI):** Provides a comprehensive suite of pre-built UI components, ensuring a consistent and professional look and feel.
  - **Material Icons:** Used for a wide range of vector-based icons that integrate seamlessly with Material UI.
  - **`react-select`:** Used for advanced select/dropdown functionality, such as multi-select and enhanced searchability.
  - **State Management:**
    - **React Context API:** For global state accessible by many components (e.g., user authentication status, current theme).
  - **Charting/Visualization:** **Highcharts** (with `highcharts-react-official`) is used for analytics and reporting features in dashboards.
  - **Data Fetching:** Primarily uses the standard Fetch API for client-side data fetching, encapsulated in service modules (e.g., `src/lib/phoenixService.ts`). The architecture is open to integrating React Query in the future.
  - **Schema Validation:** Uses `zod` for validating form inputs.

- **Backend (Firebase):**
  - **Firebase Authentication:** Manages user sign-up, login, and session management. Custom claims are used to implement Role-Based Access Control (RBAC).
  - **Cloud Firestore:** NoSQL database for storing all application data. Real-time capabilities are leveraged for dynamic dashboards. Firestore Security Rules are critical for data integrity and access control. Firestore Indexes are defined in `firestore.indexes.json` to support complex queries (including collection group queries for dashboards).
  - **Firebase Cloud Functions:** Provide server-side logic for:
    - Backend API endpoints (callable functions).
    - Business rule enforcement.
    - Data aggregation for dashboards (e.g., `getAdminDashboardStats`).
    - Integrations with third-party services (e.g., Phoenix API, Twilio API, CRM).
    - Scheduled tasks and background processing (e.g., CSV imports, monthly service count resets).
  - **`firestore-send-email` Extension:** Leveraged for sending templated emails.
    - Emails are triggered by writing documents to a specific Firestore collection (`mail`).
    - Templates are stored in another Firestore collection (`templates`).
    - This can be initiated by Cloud Functions or directly by client-side operations (with appropriate security rules) that need to send an email.
  - **Firebase Hosting:** Hosts the static assets of the React application and provides CDN capabilities.

---

## 2. Key Technical Decisions & Design Patterns

- **Role-Based Access Control (RBAC):**
  - Implemented using Firebase Authentication custom claims. Roles are stored as an array in the `roles` claim. Additional claims like `organizationId` (for single-org users), `organizationIds` (for multi-org users like Organization Managers), and `propertyId` are used for granular access control.
  - **Custom Claims Strategy:**
    - **Super Admins (Global Access):** `claims: { roles: ["admin"] }`
    - **Organization Managers (Multi-Org Access):** `claims: { roles: ["organization_manager"], organizationIds: ["{orgId1}", ...] }`
    - **Organization Staff (Single-Org Access):** `claims: { roles: ["property_manager" | "property_staff"], organizationId: "{organizationId}" }`
    - **Residents (Single-Property Access within an Org):** `claims: { roles: ["resident"], organizationId: "{organizationId}", propertyId: "{propertyId}" }`
  - Enforced at multiple levels: Frontend UI, Firestore Security Rules, Cloud Functions.

- **Data Modeling (Firestore - Multi-Tenant Structure):**
  - Centered around a root `organizations` collection.
  - `mail` and `templates` are top-level for email extension.
  - `globalInvitations` for Organization Manager invites.

  - **1. `admins` (Root Collection)**
    - Document ID: `{userAuthUid}`
    - Fields: `displayName`, `email`, `roles`, `createdAt`, `assignedOrganizationIds?`

  - **2. `organizations` (Root Collection)**
    - Document ID: `{organizationId}`
    - Fields: `name`, `createdBy`, `createdAt`, `status`
    - **Subcollections:**
      - **`users`**: Profiles for org staff. Fields: `displayName`, `email`, `organizationRoles`, `permissions?`, `invitedBy?`, `createdAt`.
      - **`properties`**: Property details. Fields: `name`, `address` (object: `street`, `city`, `state`, `zip`), `type`, `managedBy`, `createdAt`.
        - **Subcollection `residents`**: Resident profiles. Fields: `displayName`, `email`, `unitNumber`, `roles`, `leaseStartDate?`, `leaseEndDate?`, `invitedBy?`, `createdAt`, vehicle info, etc.
      - **`invitations`**: Org-specific user/resident invites. Fields: `email`, `rolesToAssign`, `organizationIds`, `targetPropertyId?`, `status`, `createdBy`, `createdAt`, `expiresAt`, `campaignId?`.
      - **`campaigns`**: Resident invitation campaigns. Fields: `campaignName`, `campaignType`, `status`, `rolesToAssign`, `createdBy`, `createdAt`, `organizationId`, `propertyId`, `id` (self-ID), `maxUses?`, `totalAccepted`, `expiresAt?`, CSV/public link specific fields.
      - **`services`** (Subcollection: `organizations/{organizationId}/services`)
        - Purpose: Tracks service requests for properties within this organization.
        - Document ID: `{serviceId}` (e.g., auto-generated unique ID)
        - Fields:
            - `propertyId: string` (links to `organizations/{organizationId}/properties/{propertyId}`)
            - `residentId: string` (Auth UID of the resident making the request)
            - `residentName?: string`
            - `unitNumber?: string`
            - `requestType: string` (Comma-separated string of service names if multiple selected, e.g., "Automotive Unlocking, New Key")
            - `description: string` (General description, potentially merged with residentNotes)
            - `residentNotes?: string` (Specific notes from the resident)
            - `status: "submitted" | "in_progress" | "completed" | "cancelled" | "on_hold"`
            - `submittedAt: timestamp`
            - `serviceDateTime?: timestamp`
            - `phone?: string`
            - `serviceLocation?: string`
            - `serviceLocationData?: object`
            - `smsConsent?: boolean`
            - `phoenixSubmissionId?: string | null`
            - `assignedTo?: string`
            - `assignedToName?: string`
            - `completedAt?: timestamp`
            - `notes?: Array<{ userId: string; userName: string; note: string; timestamp: timestamp }>`
  - **3. `globalInvitations` (Root Collection - New/Updated)**
    - Fields: `email`, `name`, `rolesToAssign: ["organization_manager"]`, `organizationIds?`, `status`, `createdBy`, `invitedByRole`, `createdAt`, `expiresAt`, `invitationType`.

- **API Design (Cloud Functions):**
  - Granular and secure functions.
  - **`createProperty` / `updateProperty` (Callable Functions - Updated):**
    - Modified to accept and store/update a `totalUnits: number` field for properties, representing the total number of rentable units.
- **`createServiceRequest` (Callable Function - Updated):**
    - **Purpose:** Handles creation of new service requests from residents.
    - **Inputs (from client `CreateServiceRequestForm.tsx`):**
        - `organizationId: string`
        - `propertyId: string`
        - `residentNotes?: string`
        - `serviceDateTime: string` (ISO format)
        - `phone?: string`
        - `description: string` (can be an empty string if notes are primary)
        - `smsConsent: boolean`
        - `serviceLocationAddress: object` (Structured address from Google Places: `{ address_1, city, state, country, zipcode, fullAddress }`)
        - `serviceTypes: Array<{ id: number | string; value: string }>` (Array of selected service types)
    - **Workflow:**
        1.  Validates user authentication and input data.
        2.  Constructs a payload for the external Phoenix API (`/form-submission` endpoint). This payload includes resident details, formatted location, selected service types (as an array of objects), SMS consent, and other relevant fields.
        3.  Makes a `POST` request to the Phoenix API using `process.env.PHOENIX_API_URL`.
        4.  **If Phoenix API call is successful (201 Created):**
            - Retrieves the submission ID from the Phoenix API response.
            - Creates a new service request document in the Firestore `organizations/{organizationId}/services` collection.
            - The Firestore document includes all relevant data, plus `phoenixSubmissionId`, `serviceLocationData` (the structured address), and `smsConsent`. `requestType` field stores a comma-separated string of selected service names.
            - Returns success and the new Firestore `serviceRequestId` to the client.
        5.  **If Phoenix API call fails:**
            - Does NOT write to Firestore.
            - Logs the error and returns an appropriate error message to the client.
    - **Output:** `{ success: boolean, serviceRequestId?: string, message?: string }`.
  - **Dashboard Statistics Functions (New):**
    - **`getAdminDashboardStats` (Callable Function):**
        - **Purpose:** Aggregates platform-wide statistics (e.g., total organizations, properties, users by role; user/org growth trends; overall campaign performance).
        - **Inputs:** Optional `dateRange`.
        - **Output:** Structured JSON data for admin dashboard charts.
    - **`getOrgManagerDashboardStats` (Callable Function):**
        - **Purpose:** Aggregates statistics for a specific organization (e.g., total properties, residents, PMs within the org; campaign performance for the org).
        - **Inputs:** `organizationId`, optional `dateRange`.
        - **Output:** Structured JSON data for organization manager dashboard charts.
    - **`getPropertyManagerDashboardStats` (Callable Function):**
        - **Purpose:** Aggregates statistics for a specific property (e.g., total residents, occupancy rate, campaign performance for the property).
        - **Inputs:** `organizationId`, `propertyId`, optional `dateRange`.
        - **Output:** Structured JSON data for property manager dashboard charts.
    - **Aggregation Strategy:** These functions initially perform direct aggregation. A hybrid approach is planned, where denormalized counters (updated by Firestore triggers) will be iteratively introduced for frequently accessed or computationally expensive statistics to improve scalability. Functions will preferentially read counters if available, falling back to direct queries.
  - Other functions include Invitation Campaign functions, Organization Management functions, etc.

- **Client-Side API Service Modules (New Pattern):**
    - For client-side interactions with external APIs (e.g., fetching data for UI population), encapsulate API call logic within dedicated service modules.
    - **Example:** `src/lib/phoenixService.ts` contains `getPhoenixServices()` to fetch service types from the Phoenix API (`GET /services`) for use in forms.
    - **Generic Chart Wrapper Components (New Pattern):**
        - Reusable React components created in `src/components/Dashboard/Charts/` (e.g., `KpiCard.tsx`, `LineChart.tsx`, `BarChart.tsx`, `PieChart.tsx`, `GaugeChart.tsx`) to encapsulate Highcharts logic and ensure consistent chart presentation across dashboards.

- **Address Autocompletion (Google Places API):**
  - Implemented in forms like `CreateServiceRequestForm.tsx` and `EditPropertyModal.tsx`.
    - Uses `@react-google-maps/api`'s `useJsApiLoader` to load the Google Maps API with the `places` library.
    - Instantiates `google.maps.places.AutocompleteService` (for fetching predictions) and `google.maps.Geocoder` (for getting detailed place information from a `place_id`).
    - An MUI `Autocomplete` component is used for the UI to display predictions.
    - On selection, the `Geocoder` fetches address components, which are then parsed to form a structured address object (e.g., `{ address_1, city, state, zipcode, country, fullAddress }`). This object is stored in component state and used for data submission.

- **Advanced UI Components (New Pattern):**
    - **`react-select`:** Utilized for dropdowns requiring advanced features like multi-select, enhanced search, and custom styling (e.g., service type selection in `CreateServiceRequestForm.tsx`).
    - Styled to integrate with MUI theme, including z-index management for dropdown menus.
    - needs dark/light mode support

- **Other Patterns:** Hybrid Rendering, Firebase Storage Usage, State Management Strategy, Data Fetching, Analytics, TypeScript Best Practices, Production-ready solutions with a focus on long-term usage and maintainability.

## 3. Component Relationships & Data Flow (Illustrative)

*   **Authentication Flow:**
    1.  User interacts with Login/Signup Form (Client Component).
    2.  Credentials sent to Firebase Authentication. User record is created.
    3.  The `functions/src/auth/processSignUp.ts` Cloud Function (an `onCreate` auth trigger) executes:
        *   If the user is a Super Admin (based on email), it sets `roles: ['admin']` custom claim and creates a profile in `admins/{uid}`.
        *   For **all other users**, it does nothing further, intentionally deferring claim and profile setup to specific invitation-handling callable functions to avoid race conditions.
    4.  If the sign-up is via an invitation, a callable function like `signUpWithInvitation.ts` or `signUpWithOrgManagerInvitation.ts` is then invoked by the frontend. This function:
        *   Validates the invitation.
        *   Sets the appropriate custom claims (e.g., `organization_manager`, `property_manager`, `resident` and associated `organizationId(s)`, `propertyId`). These claims will overwrite any (though none are set by `processSignUp` for non-admins) or establish the primary claims for the user.
        *   Creates the necessary user profile(s) in Firestore (e.g., in `organizations/{orgId}/users/{uid}`, `organizations/{orgId}/properties/{propId}/residents/{uid}`, and for `signUpWithOrgManagerInvitation.ts`, also in `admins/{uid}`).
    5.  Firebase Auth ID token (with the final, correct role claims) is available to the client.
    6.  Client-side routing and UI adapt based on the role.
    7.  Firestore Security Rules validate the role claim for data operations.

*   **Invitation Campaign Flow (CSV Import - New):**
    1.  PM/OM/Admin uses frontend UI (`CreateCampaignModal`) to define a "csv_import" campaign (name, limits, expiry) and uploads a CSV file.
    2.  Frontend uploads CSV to Firebase Storage (`campaign_csvs_pending/`).
    3.  Frontend calls `createCampaign` Cloud Function with campaign details and `storageFilePath`.
    4.  `createCampaign` function:
        a.  Creates `campaigns/{campaignId}` document in Firestore.
        b.  Downloads and parses CSV from Storage.
        c.  For each valid row, creates an `invitations/{invitationId}` document (linked to `campaignId`). This triggers an email via `firestore-send-email`.
        d.  Updates campaign with `totalInvitedFromCsv` and status.
        e.  Moves processed CSV to `campaign_csvs_processed/` in Storage.
    5.  Resident receives email, clicks link to `AcceptInvitationPage`.
    6.  Resident signs up. `signUpWithInvitation` function is called.
    7.  `signUpWithInvitation` processes user creation, updates invitation status, and updates the linked campaign's `totalAccepted` and `status`.
    8.  PM/OM/Admin can view campaign status and list in `CampaignsTable`.

*   **Invitation Campaign Flow (Public Link/QR Code - New):**
    1.  PM/OM/Admin uses frontend UI (`CreateCampaignModal`) to define a "public_link" campaign (name, limits, expiry).
    2.  Frontend calls `createCampaign` Cloud Function.
    3.  `createCampaign` function:
        a.  Creates `campaigns/{campaignId}` document.
        b.  Generates and stores an `accessUrl` which is a frontend URL (e.g., `https://your-app-domain.web.app/join-public-campaign?campaign={campaignId}`).
        c.  Returns `campaignId` and `accessUrl` to frontend.
    4.  Frontend displays `accessUrl` and generates/displays a QR code from it.
    5.  User clicks the public link or scans QR code, hitting the frontend `accessUrl`.
    6.  The `PublicCampaignHandlerPage.tsx` (at `/join-public-campaign`) loads:
        a.  It extracts the `campaignId` from the URL.
        b.  It calls the `processPublicCampaignLink` callable Cloud Function with the `campaignId`.
        c.  The `processPublicCampaignLink` function validates the campaign, creates an `invitations/{invitationId}` document (linked to `campaignId`), and returns the new `invitationId`, `campaignId`, and `organizationId`.
        d.  `PublicCampaignHandlerPage.tsx` receives these details and programmatically navigates the user to `JoinCampaignPage` (e.g., `/join-campaign?invitationId=...&campaignId=...&organizationId=...`).
    7.  Resident signs up via `JoinCampaignPage.tsx`. `signUpWithInvitation` function is called.
    8.  `signUpWithInvitation` processes user creation, updates invitation status, and updates the linked campaign's `totalAccepted` and `status`.
    9.  PM/OM/Admin can view campaign status and list in `CampaignsTable`.

*   **Data Display (e.g., Property List for Property Manager):**
    1.  Property Manager navigates to the "My Properties" page.
    2.  This page might utilize a React Server Component.
    3.  The Server Component fetches properties from Firestore where `propertyManagerId` matches the logged-in user's UID.
    4.  The initial HTML is rendered on the server and sent to the client.
    5.  Client Components hydrate and handle any subsequent interactions (e.g., opening a property detail view, which might then fetch more data client-side).

- **Service Request Flow (Updated):**
    1.  **Frontend (`CreateServiceRequestForm.tsx`):**
        a.  Resident fills out the form.
        b.  Service types are populated by calling `getPhoenixServices()` from `src/lib/phoenixService.ts` which makes a `GET` request to the Phoenix API. User selects one or more services using `react-select`.
        c.  Service location is entered using Google Places Autocomplete, resulting in a structured address object.
        d.  SMS consent is captured via a checkbox.
        e.  Phone number is auto-formatted.
        f.  On submit, a comprehensive data payload (including structured address, SMS consent, array of selected service types) is sent to the `createServiceRequest` Cloud Function.
    2.  **Backend (`createServiceRequest` Cloud Function):**
        a.  Receives data, validates user and inputs.
        b.  Constructs payload for Phoenix API's `/form-submission` endpoint.
        c.  Calls Phoenix API.
        d.  If Phoenix API call succeeds (201 Created):
            i.  Retrieves Phoenix submission ID.
            ii. Creates a new document in Firestore (`organizations/{orgId}/services/{serviceId}`), storing all relevant details including `phoenixSubmissionId`, structured `serviceLocationData`, `smsConsent`, and a comma-separated `requestType`.
            iii.Returns success to the client.
        e.  If Phoenix API call fails: Returns error to the client; no Firestore document is created.
    3.  **Frontend:**
        a.  Displays success or error message.
        b.  If successful, clears the form and triggers a callback.
    4.  The Resident's dashboard can listen to Firestore for real-time updates.

- **Request Twilio Call Flow (New):**
    1.  **Frontend (`ChatView.tsx` & `RequestTwilioCallDialog.tsx`):**
        a.  User clicks "Call Agent".
        b.  Dialog opens, user enters phone number (validated with `zod`).
        c.  Phone number is formatted to E.164.
        d.  Calls the `requestTwilioCall` Cloud Function.
    2.  **Backend:** Validates, retrieves Twilio credentials, makes API call, returns result.
    3.  **Frontend:** Displays result via Snackbar, closes dialog on success.
    4.  **Twilio & Webhook:** Twilio places the call and requests TwiML instructions from the webhook.

- **Dashboard Statistics Flow (New):**
    1.  **Frontend (e.g., `AdminDashboardPanel.tsx`):**
        a.  On component mount or tab activation, a `useEffect` hook triggers a data fetching function.
        b.  The function calls the relevant Firebase Callable Function (e.g., `getAdminDashboardStats`, passing necessary parameters like `organizationId` or `dateRange` if applicable).
        c.  Loading state is set to true.
    2.  **Backend (e.g., `getAdminDashboardStats` Cloud Function):**
        a.  Receives request, authenticates user, validates inputs.
        b.  Performs Firestore queries (direct aggregation or reads denormalized counters).
        c.  Processes and structures data into JSON format suitable for Highcharts.
        d.  Returns data or an error.
    3.  **Frontend:**
        a.  Receives data or error from the Cloud Function.
        b.  Updates state with the fetched statistics or error message.
        c.  Sets loading state to false.
        d.  Passes the statistics and chart configurations (derived using `useMemo`) to generic chart wrapper components (`KpiCard`, `LineChart`, etc.) for rendering.
        e.  Displays loading skeletons or error messages as appropriate.
---

## 4. Scalability and Maintainability

- **Firebase Services:** Chosen for scalability.
- **Modular Design:** Separation of frontend, backend, and database rules.
- **Server Components:** Co-locate data fetching with rendering logic.
- **Clear Data Models:** Well-defined Firestore schema.

---

## 5. Error Handling Patterns

- **Standardized Error Object:**
    ```typescript
    export interface AppError {
      message: string;
      code?: string;
    }
    ```
- **Type-Safe Error Catching:**
    ```typescript
    import { isAppError } from '../../utils/errorUtils';

    try {
      // ...
    } catch (err: unknown) {
      let errorMessage = "An unexpected error occurred.";
      if (isAppError(err)) {
        errorMessage = err.message;
      }
      // Display errorMessage to the user
    }
    ```
    The `isAppError` type guard ensures safe access to error properties.

---
