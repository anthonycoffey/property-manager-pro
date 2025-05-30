# System Patterns: Multi-Tenant ERP-Style Web Application

## 1. System Architecture Overview

The application employs a modern web architecture with a React-based frontend and a Firebase-powered backend. It utilizes a hybrid rendering model, combining Client-Side Rendering (CSR) with React Server Components for optimal performance and user experience.

*   **Frontend:**
    *   **React 19:** Core library for building the user interface.
        *   **Client Components:** Used for interactive elements, forms, and real-time UI updates.
        *   **Server Components:** Strategically used for initial data fetching, rendering static or data-heavy sections to improve load times and reduce client-side bundle size.
    *   **Material UI (MUI):** Provides a comprehensive suite of pre-built UI components, ensuring a consistent and professional look and feel.
    *   **State Management:**
        *   **React Context API:** For global state accessible by many components (e.g., user authentication status, current theme).
*   **Backend (Firebase):**
    *   **Firebase Authentication:** Manages user sign-up, login, and session management. Custom claims are used to implement Role-Based Access Control (RBAC).
    *   **Cloud Firestore:** NoSQL database for storing all application data. Real-time capabilities are leveraged for dynamic dashboards. Firestore Security Rules are critical for data integrity and access control.
    *   **Firebase Cloud Functions:** Provide server-side logic for:
        *   Backend API endpoints.
        *   Business rule enforcement.
        *   Integrations with third-party services (e.g., CRM).
        *   Scheduled tasks and background processing (e.g., CSV imports, monthly service count resets).
    *   **`firestore-send-email` Extension:** Leveraged for sending templated emails.
        *   Emails are triggered by writing documents to a specific Firestore collection (`mail`).
        *   Templates are stored in another Firestore collection (`templates`).
        *   This can be initiated by Cloud Functions or directly by client-side operations (with appropriate security rules) that need to send an email.
    *   **Firebase Hosting:** Hosts the static assets of the React application and provides CDN capabilities.

## 2. Key Technical Decisions & Design Patterns

*   **Role-Based Access Control (RBAC):**
    *   Implemented using Firebase Authentication custom claims. Roles are stored as an array in the `roles` claim. Additional claims like `organizationId` (for single-org users), `organizationIds` (for multi-org users like Organization Managers), and `propertyId` are used for granular access control.
    *   **Custom Claims Strategy:**
        *   **Super Admins (Global Access):** `claims: { roles: ["admin"] }` (Has implicit access to all organizations, does not need `organizationId` or `organizationIds` in claims for this purpose).
        *   **Organization Managers (Multi-Org Access):** `claims: { roles: ["organization_manager"], organizationIds: ["{organizationId1}", "{organizationId2}", ...] }`. If invited without an initial organization or with multiple, `organizationIds` will reflect this (can be empty or contain multiple IDs).
        *   **Organization Staff (Property Managers, other staff - Single-Org Access):** `claims: { roles: ["property_manager" | "property_staff"], organizationId: "{organizationId}" }` (Operates within one specific organization).
        *   **Residents (Single-Property Access within an Org):** `claims: { roles: ["resident"], organizationId: "{organizationId}", propertyId: "{propertyId}" }`
        *   Minimum defined roles: `admin`, `organization_manager`, `property_manager`, `property_staff`, `resident`.
    *   Enforced at multiple levels:
        *   **Frontend:** Conditionally rendering UI elements and routes based on user roles and associated IDs/ID arrays in claims.
        *   **Cloud Firestore:** Through meticulously defined Security Rules that restrict data access based on `request.auth.token.roles`, `request.auth.token.organizationId` (for single-org users), `request.auth.token.organizationIds` (using `in` operator for multi-org users), `request.auth.token.propertyId`, and data ownership.
        *   **Cloud Functions:** Validating user roles and associated IDs from the token before executing sensitive operations.
*   **Data Modeling (Firestore - Multi-Tenant Structure):**
    *   The Firestore database is designed with a multi-tenant architecture, primarily centered around a root `organizations` collection. This ensures clear data isolation and management for different tenants.
    *   The `mail` and `templates` collections (for the `firestore-send-email` extension) remain as top-level collections and are not part of the direct multi-tenant data hierarchy for organizations, users, or properties.
    *   A new root `globalInvitations` collection is introduced for Organization Manager invitations. These invitations can specify multiple organizations, a single organization, or no organizations for initial assignment.

    *   **1. `admins` (Root Collection)**
        *   Purpose: Stores primary profile data for Super Administrators (e.g., `roles: ["admin"]`) and Organization Managers (e.g., `roles: ["organization_manager"]`). These profiles are distinct from their Firebase Auth record and are used for system-level identification of these roles, for instance, when listing all Organization Managers for assignment.
        *   Document ID: `{userAuthUid}` (Firebase Auth UID of the admin or organization_manager)
        *   Fields:
            *   `displayName: string`
            *   `email: string` (matches auth email)
            *   `roles: string[]` (e.g., `["admin"]` or `["organization_manager"]`, mirrors claim for consistency)
            *   `createdAt: timestamp`
            *   `assignedOrganizationIds?: string[]` (For OMs, denormalized list of org IDs they manage, mirrors claims)
            *   *(Other role-specific profile data)*

    *   **2. `organizations` (Root Collection)**
        *   Purpose: Represents each tenant (e.g., a Property Management company). Can be created by `admin` or `organization_manager`.
        *   Document ID: `{organizationId}` (e.g., auto-generated unique ID)
        *   Fields:
            *   `name: string` (e.g., "Prime Properties LLC")
            *   `createdBy: string` (Firebase Auth UID of the user who created it - admin or org_manager)
            *   `createdAt: timestamp`
            *   `status: string` (e.g., "active", "trial", "suspended")
            *   *(Other organization-level settings, billing info, etc.)*
        *   **Subcollections within each `organization` document:**

            *   **`users`** (Subcollection: `organizations/{organizationId}/users`)
                *   Purpose: Stores profiles for users belonging to this organization (Organization Managers, Property Managers, staff).
                *   Document ID: `{orgUserAuthUid}` (Firebase Auth UID)
                *   Fields:
                    *   `displayName: string`
                    *   `email: string`
                    *   `organizationRoles: string[]` (e.g., `["organization_manager"]`, `["property_manager"]`, `["property_staff"]`)
                    *   `permissions?: string[]` (Optional: for more granular permissions within the org beyond base roles)
                    *   `invitedBy?: string` (Auth UID of user who invited them, if applicable)
                    *   `createdAt: timestamp`

            *   **`properties`** (Subcollection: `organizations/{organizationId}/properties`)
                *   Purpose: Stores details of properties managed by this organization.
                *   Document ID: `{propertyId}` (e.g., auto-generated unique ID)
                *   Fields:
                    *   `name: string` (e.g., "The Grand Plaza")
                    *   `address: object` (street: string, city: string, state: string, zip: string) <!-- Updated 2025-05-25: Full address object now stored -->
                    *   `type: string` (e.g., "residential", "commercial")
                    *   `managedBy: string` (Auth UID of an org user from `organizations/{organizationId}/users`)
                    *   `createdAt: timestamp`
                    *   *(Other property-specific details)*
                *   **Subcollections within each `property` document:**

                    *   **`residents`** (Subcollection: `organizations/{organizationId}/properties/{propertyId}/residents`)
                        *   Purpose: Stores profiles for residents of a specific property.
                        *   Document ID: `{residentAuthUid}` (Firebase Auth UID)
                        *   Fields:
                            *   `displayName: string`
                            *   `email: string`
                            *   `unitNumber: string`
                            *   `roles: ["resident"]` (string array, mirrors claim for consistency)
                            *   `leaseStartDate: timestamp`
                            *   `leaseEndDate: timestamp`
                            *   `invitedBy: string` (Auth UID of an org user)
                            *   `createdAt: timestamp`
                            *   *(Vehicle information, contact preferences, etc.)*

            *   **`invitations`** (Subcollection: `organizations/{organizationId}/invitations`)
                *   Purpose: Tracks invitations sent for this organization (for new org users like Property Managers or Residents). Excludes Organization Manager invites which are in `globalInvitations`.
                *   Document ID: `{invitationId}` (e.g., auto-generated unique ID)
                *   Fields:
                    *   `email: string`
                    *   `rolesToAssign: string[]` (e.g., `["property_staff"]`, `["resident"]`)
                    *   `organizationIds: string[]` (Array containing the single ID of this parent organization)
                    *   `targetPropertyId?: string` (if for a resident, links to `organizations/{organizationId}/properties/{propertyId}`)
                    *   `status: "pending" | "accepted" | "expired"`
                    *   `createdBy: string` (Auth UID of an org user)
                    *   `createdAt: timestamp`
                    *   `expiresAt: timestamp`
                    *   `campaignId?: string` (NEW: Links to a campaign if this invitation originated from one)
            
            *   **`campaigns`** (NEW Subcollection: `organizations/{organizationId}/properties/{propertyId}/campaigns`)
                *   Purpose: Manages resident invitation campaigns (CSV bulk import, Public Link/QR code).
                *   Document ID: `{campaignId}` (auto-generated)
                *   Fields:
                    *   `campaignName: string`
                    *   `campaignType: "csv_import" | "public_link"`
                    *   `status: "active" | "inactive" | "completed" | "expired" | "processing" | "error"`
                    *   `rolesToAssign: string[]` (e.g., `["resident"]`)
                    *   `createdBy: string` (UID of the user who created the campaign)
                    *   `createdAt: timestamp`
                    *   `organizationId: string` (Denormalized for rules/queries)
                    *   `propertyId: string` (Denormalized for rules/queries)
                    *   `maxUses?: number | null`
                    *   `totalAccepted: number` (default 0)
                    *   `expiresAt?: timestamp | null`
                    *   `// CSV Import Specific`
                    *   `storageFilePath?: string` (Path to CSV in Firebase Storage)
                    *   `sourceFileName?: string` (Original name of the uploaded CSV)
                    *   `totalInvitedFromCsv?: number`
                    *   `// Public Link Specific`
                    *   `accessUrl?: string` (Shareable URL for public link campaigns)
                    *   `// Common`
                    *   `errorDetails?: string`

            *   **`services`** (Subcollection: `organizations/{organizationId}/services`)
                *   Purpose: Tracks service requests for properties within this organization.
                *   Document ID: `{serviceId}` (e.g., auto-generated unique ID)
                *   Fields:
                    *   `propertyId: string` (links to `organizations/{organizationId}/properties/{propertyId}`)
                    *   `residentId: string` (Auth UID of the resident making the request)
                    *   `requestType: string` (e.g., "maintenance", "amenity_booking")
                    *   `description: string`
                    *   `status: "submitted" | "in_progress" | "completed" | "cancelled"`
                    *   `submittedAt: timestamp`
                    *   `assignedTo?: string` (Auth UID of an org user)
                    *   `completedAt?: timestamp`

    *   **3. `globalInvitations` (Root Collection - New/Updated)**
        *   Purpose: Tracks invitations for Organization Managers.
        *   Document ID: `{invitationId}` (e.g., auto-generated unique ID, same as token)
        *   Fields:
            *   `email: string`
            *   `name: string` (invitee name)
            *   `rolesToAssign: ["organization_manager"]`
            *   `organizationIds: string[] | null` (Array of organization IDs to assign, or null/empty if none initially)
            *   `status: "pending" | "accepted" | "expired"`
            *   `createdBy: string` (Auth UID of the inviting Super Admin)
            *   `invitedByRole: "admin"`
            *   `createdAt: timestamp`
            *   `expiresAt: timestamp`
            *   `invitationType: "organization_manager"`
        *   **Processing:**
            *   Organization Manager invitations stored here are primarily processed by `functions/src/callable/signUpWithOrgManagerInvitation.ts`. This function is crucial as it not only sets the necessary custom claims (`roles: ["organization_manager"]`, `organizationIds`) and creates profiles in `organizations/{orgId}/users/{uid}` (if applicable) but also **creates/updates the Organization Manager's profile in the root `admins/{uid}` collection**. This `admins` profile is essential for Super Admins to list and manage Organization Managers.
            *   The more general `functions/src/callable/signUpWithInvitation.ts` can also process these invitations if called (e.g., by a generic acceptance page), setting claims and org-specific profiles, but it **does not** create the profile in the `admins` collection. Thus, for full Organization Manager onboarding, `signUpWithOrgManagerInvitation.ts` (likely triggered by a specific page like `AcceptOrgManagerInvitationPage.tsx`) is the designated function.

*   **Hybrid Rendering Strategy (React 19):**
    *   **Client Components:** Default for most UI, especially interactive parts.
    *   **Server Components:**
        *   **Purpose:** Improve initial page load performance, reduce client-side JavaScript, and simplify server-side data fetching.
        *   **Use Cases:** Initial rendering of dashboards (Admin, Property Manager), data-heavy lists (properties, residents), reports. Server Components can directly interact with Firebase Admin SDK or call Cloud Functions.
*   **API Design (Cloud Functions):**
    *   Cloud Functions act as the primary backend API layer.
    *   Functions will be designed to be granular and secure, performing specific tasks.
    *   **Invitation Campaign Functions (New):**
        *   **`createCampaign` (v1 Callable):**
            *   Purpose: Allows authorized users (PM, OM, Admin) to create new resident invitation campaigns.
            *   Inputs: `organizationId`, `propertyId`, `campaignName`, `campaignType` (`csv_import` or `public_link`), `rolesToAssign`, `maxUses?`, `expiresAt?`. If `csv_import`, also `storageFilePath` (path to CSV in Firebase Storage) and `sourceFileName`.
            *   Logic: Creates a `campaigns` document.
                *   For `csv_import`: Downloads and parses CSV from `storageFilePath`, creates individual `invitations` (linked with `campaignId`), sends emails via `firestore-send-email` extension, updates campaign with `totalInvitedFromCsv`, moves processed CSV in Storage.
                *   For `public_link`: Generates and stores a unique `accessUrl` for the campaign, which is a frontend URL (e.g., `app.com/join-public-campaign?campaign={campaignId}`).
            *   Output: `{ campaignId, accessUrl? }`.
        *   **`processPublicCampaignLink` (v1 Callable - New):**
            *   Purpose: Handles the processing of a public campaign link initiated by the frontend.
            *   Trigger: Called by the `PublicCampaignHandlerPage.tsx` frontend page.
            *   Inputs: `{ campaignId: string }`.
            *   Logic: Validates the `campaignId` (active, not expired, within limits). If valid, dynamically creates an `invitations` document (linked to the `campaignId`) and returns details like `{ invitationId, campaignId, organizationId }` to the frontend.
        *   **`signUpWithInvitation` (v2 Callable - Updated):**
            *   Existing function updated to check if an accepted invitation has a `campaignId`.
            *   If so, it atomically increments `totalAccepted` on the linked campaign document and updates the campaign's `status` (e.g., to "completed" or "expired") if `maxUses` or `expiresAt` conditions are met.
        *   **`cleanupProcessedCampaignCSVs` (v2 Scheduled):**
            *   Purpose: Periodically cleans up old CSV files from Firebase Storage.
            *   Trigger: Runs on a schedule (e.g., daily).
            *   Logic: Deletes files from `campaign_csvs_processed` and `campaign_csvs_failed` folders in Storage that are older than a defined retention period (e.g., 30 days).
        *   **`activateCampaign` (v1 Callable - New):**
            *   Purpose: Allows authorized users (PM, OM, Admin) to reactivate an 'inactive' campaign.
            *   Inputs: `organizationId`, `propertyId`, `campaignId`.
            *   Logic: Sets the campaign `status` to 'active'. Does not re-process or re-send invitations.
            *   Output: `{ success: boolean, message?: string }`.
    *   `createOrganization` function now allows `organization_manager` role to create organizations and auto-assigns them.
    *   **Organization Manager Assignment (Admin Functions):**
        *   `assignOrganizationToManagerAdmin`: Callable function for Super Admins to assign an organization to an Organization Manager. Updates claims, denormalized `assignedOrganizationIds` in the OM's `admins` profile, and creates/updates the OM's profile in the target organization's `users` subcollection.
        *   `unassignOrganizationFromManagerAdmin`: Callable function for Super Admins to unassign an organization from an Organization Manager. Updates claims, denormalized `assignedOrganizationIds` in the OM's `admins` profile, and deletes the OM's profile from the unassigned organization's `users` subcollection.
*   **Firebase Storage Usage (New Section):**
    *   Firebase Storage is used for managing CSV files for bulk resident imports via campaigns.
    *   **Folders:**
        *   `campaign_csvs_pending/`: Frontend uploads new CSVs here.
        *   `campaign_csvs_processed/`: `createCampaign` function moves successfully processed CSVs here.
        *   `campaign_csvs_failed/`: `createCampaign` function may move CSVs here if processing fails irrecoverably.
    *   **Cleanup:** The `cleanupProcessedCampaignCSVs` scheduled function manages the deletion of old files from `_processed` and `_failed` folders.
*   **State Management Strategy:**
    *   **Global State (React Context):** For broadly shared, less frequently updated data (e.g., authenticated user object, theme settings).
        *   Theme settings (`mode`: 'light' or 'dark') are persisted to `localStorage` to remember user preference across sessions. The system preference (`prefers-color-scheme`) is used as a fallback if no `localStorage` value is set.
    *   **Local/Feature State (React Hooks):** For more complex, dynamic, or localized state within specific features or component trees.
*   **Data Fetching:**
    *   **Client-Side:** Primarily using the standard Fetch API
    *   **Server-Side (via Server Components):** Direct data fetching from Firestore using Firebase Admin SDK or by invoking Cloud Functions.
    *   The architecture is open to future integration of libraries like React Query if client-side caching and data synchronization needs become more complex.
*   **Analytics & Reporting:**
    *   Highcharts will be integrated for visualizing data, such as usage statistics and reports. This will involve preparing data (potentially via Cloud Functions or Server Components) and configuring Highcharts components within the React frontend.
*   **Address Autocompletion (Google Places API - New):**
    *   **Element:** Implemented using the `google.maps.places.PlaceAutocompleteElement` Web Component, as recommended by Google for new integrations.
    *   **Script Loading:** The Google Maps JavaScript API (with the `places` library) is loaded using the `LoadScript` component from `@react-google-maps/api`.
    *   **Functionality:** Integrated into property creation (`CreatePropertyForm.tsx`) and editing (`EditPropertyModal.tsx`) forms.
    *   **Process:**
        1.  A container `div` (using `useRef`) is designated in the React component.
        2.  In a `useEffect` hook (once the Google Maps API is loaded and the modal/form is open/active):
            a.  An instance of `new google.maps.places.PlaceAutocompleteElement()` is created.
            b.  Configuration options (e.g., `componentRestrictions: { country: "us" }`) are applied.
            c.  The element's internal input is styled to visually match MUI TextFields.
            d.  For edit forms, the initial street value is set on the element's input.
            e.  The `PlaceAutocompleteElement` is appended to the ref container.
            f.  An event listener is attached to the element for the `gmp-select` event.
        3.  When a user selects an address from the suggestions provided by `PlaceAutocompleteElement`:
            a.  The `gmp-select` event fires.
            b.  The event detail contains the selected `place` object.
            c.  `place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] })` is called to get necessary details.
            d.  `place.addressComponents` are parsed to extract street number, route, city, state (short code, e.g., "CA"), and zip code.
            e.  The React component's state for the address (street, city, state, zip) is updated, which in turn populates the corresponding MUI input fields in the form.
    *   **State Management for Dropdowns:** The MUI `Select` component for states uses a mapping of full state names to short codes (e.g., "California" to "CA") to ensure consistency between manual selection and the short codes provided by the Places API.
    *   **Cleanup:** The `useEffect` hook includes a cleanup function to remove the `PlaceAutocompleteElement` from the DOM when the component unmounts or is no longer active, preventing memory leaks.

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

*   **Service Request Flow:**
    1.  Resident submits a service request form (Client Component).
    2.  Data is sent to a Cloud Function (`requestService`).
    3.  The Cloud Function validates the request, creates a new document in the `services` collection in Firestore, and potentially triggers notifications.
    4.  The Resident's dashboard (Client Component with real-time listener to Firestore) updates to show the new request.

## 4. Scalability and Maintainability

*   **Firebase Services:** Chosen for their inherent scalability.
*   **Modular Design:** Separating concerns between frontend components, backend functions, and database rules promotes maintainability.
*   **Server Components:** Help manage complexity by co-locating data fetching with rendering logic for certain views.
*   **Clear Data Models:** A well-defined Firestore schema is crucial for long-term maintainability.

## 5. Error Handling Patterns

*   **Standardized Error Object:**
    *   The `AppError` interface, defined in `src/types/index.ts`, provides a standard structure for error objects within the application:
        ```typescript
        export interface AppError {
          message: string;
          code?: string; // Firebase errors often have a 'code' property
        }
        ```
    *   This promotes consistency in how errors are represented and handled. Firebase `HttpsError` instances generally conform to this by providing `message` and `code` properties.

*   **Type-Safe Error Catching:**
    *   To safely handle errors of `unknown` type in `catch` blocks and access their properties (like `message`), the `isAppError` type guard from `src/utils/errorUtils.ts` is used.
        ```typescript
        // src/utils/errorUtils.ts
        import type { AppError } from '../types';

        export function isAppError(error: unknown): error is AppError {
          return (
            typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof (error as AppError).message === 'string'
          );
        }
        ```
    *   **Usage Example:**
        ```typescript
        import { isAppError } from '../../utils/errorUtils'; // Adjust path as needed

        try {
          // Code that might throw an error
        } catch (err: unknown) {
          console.error("Operation failed:", err);
          let errorMessage = "An unexpected error occurred.";
          if (isAppError(err)) {
            errorMessage = err.message; 
            // Optionally use err.code if needed
          }
          // Display errorMessage to the user (e.g., via Snackbar)
          // setSnackbar({ message: errorMessage, severity: 'error' });
        }
        ```
    *   This pattern ensures that `err.message` is accessed only when `err` is confirmed to be an `AppError`, preventing runtime errors and satisfying TypeScript's type checking, particularly the `@typescript-eslint/no-explicit-any` rule.
