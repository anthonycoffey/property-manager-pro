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
  - **Charting/Visualization:** **Highcharts** is used for analytics and reporting features.
  - **Data Fetching:** Primarily uses the standard Fetch API for client-side data fetching, encapsulated in service modules (e.g., `src/lib/phoenixService.ts`). The architecture is open to integrating React Query in the future.
  - **Schema Validation:** Uses `zod` for validating form inputs.

- **Backend (Firebase):**
  - **Firebase Authentication:** Manages user sign-up, login, and session management. Custom claims are used to implement Role-Based Access Control (RBAC).
  - **Cloud Firestore:** NoSQL database for storing all application data. Real-time capabilities are leveraged for dynamic dashboards. Firestore Security Rules are critical for data integrity and access control.
  - **Firebase Cloud Functions:** Provide server-side logic for:
    - Backend API endpoints.
    - Business rule enforcement.
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
  - Other functions include Invitation Campaign functions, Organization Management functions, etc.

- **Client-Side API Service Modules (New Pattern):**
    - For client-side interactions with external APIs (e.g., fetching data for UI population), encapsulate API call logic within dedicated service modules.
    - **Example:** `src/lib/phoenixService.ts` contains `getPhoenixServices()` to fetch service types from the Phoenix API (`GET /services`) for use in forms.

- **Address Autocompletion (Google Places API):**
  - Implemented in forms like `CreateServiceRequestForm.tsx` and `EditPropertyModal.tsx`.
    - Uses `@react-google-maps/api`'s `useJsApiLoader` to load the Google Maps API with the `places` library.
    - Instantiates `google.maps.places.AutocompleteService` (for fetching predictions) and `google.maps.Geocoder` (for getting detailed place information from a `place_id`).
    - An MUI `Autocomplete` component is used for the UI to display predictions.
    - On selection, the `Geocoder` fetches address components, which are then parsed to form a structured address object (e.g., `{ address_1, city, state, zipcode, country, fullAddress }`). This object is stored in component state and used for data submission.

- **Advanced UI Components (New Pattern):**
    - **`react-select`:** Utilized for dropdowns requiring advanced features like multi-select, enhanced search, and custom styling (e.g., service type selection in `CreateServiceRequestForm.tsx`).
    - Styled to integrate with MUI theme, including z-index management for dropdown menus.

- **Other Patterns:** Hybrid Rendering, Firebase Storage Usage, State Management Strategy, Data Fetching, Analytics, TypeScript Best Practices, Error Handling Patterns remain largely as previously documented.

## 3. Component Relationships & Data Flow (Illustrative)

- **Authentication Flow:** (As previously documented)
- **Invitation Campaign Flows:** (As previously documented)
- **Data Display (e.g., Property List):** (As previously documented)

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
