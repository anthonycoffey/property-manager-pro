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
    *   Implemented using Firebase Authentication custom claims. Roles are stored as an array in the `roles` claim. Additional claims like `organizationId` and `propertyId` are used for granular access control.
    *   **Custom Claims Strategy:**
        *   **Super Admins:** `claims: { roles: ["admin"] }`
        *   **Organization Users (Property Managers, Property Staff):** `claims: { roles: ["property_manager" | "property_staff"], organizationId: "{organizationId}" }`
        *   **Residents:** `claims: { roles: ["resident"], organizationId: "{organizationId}", propertyId: "{propertyId}" }`
        *   Minimum defined roles: `admin`, `property_manager`, `property_staff`, `resident`.
    *   Enforced at multiple levels:
        *   **Frontend:** Conditionally rendering UI elements and routes based on user roles and associated IDs in claims.
        *   **Cloud Firestore:** Through meticulously defined Security Rules that restrict data access based on `request.auth.token.roles` (checking for presence of a role using `hasAny()`, `hasAll()`, or `hasOnly()`), `request.auth.token.organizationId`, `request.auth.token.propertyId`, and data ownership.
        *   **Cloud Functions:** Validating user roles and associated IDs from the token before executing sensitive operations.
*   **Data Modeling (Firestore - Multi-Tenant Structure):**
    *   The Firestore database is designed with a multi-tenant architecture, primarily centered around a root `organizations` collection. This ensures clear data isolation and management for different tenants.
    *   The `mail` and `templates` collections (for the `firestore-send-email` extension) remain as top-level collections and are not part of the direct multi-tenant data hierarchy for organizations, users, or properties.

    *   **1. `admins` (Root Collection)**
        *   Purpose: Stores profile data for Super Administrators (distinct from their Firebase Auth record).
        *   Document ID: `{adminAuthUid}` (Firebase Auth UID)
        *   Fields:
            *   `displayName: string`
            *   `email: string` (matches auth email)
            *   `roles: ["admin"]` (string array, mirrors claim for consistency)
            *   `createdAt: timestamp`
            *   *(Other super_admin specific profile data)*

    *   **2. `organizations` (Root Collection)**
        *   Purpose: Represents each tenant (e.g., a Property Management company).
        *   Document ID: `{organizationId}` (e.g., auto-generated unique ID)
        *   Fields:
            *   `name: string` (e.g., "Prime Properties LLC")
            *   `ownerId: string` (Firebase Auth UID of the primary Property Manager for this org)
            *   `createdAt: timestamp`
            *   `status: string` (e.g., "active", "trial", "suspended")
            *   *(Other organization-level settings, billing info, etc.)*
        *   **Subcollections within each `organization` document:**

            *   **`users`** (Subcollection: `organizations/{organizationId}/users`)
                *   Purpose: Stores profiles for users belonging to this organization (Property Managers, staff).
                *   Document ID: `{orgUserAuthUid}` (Firebase Auth UID)
                *   Fields:
                    *   `displayName: string`
                    *   `email: string`
                    *   `organizationRoles: string[]` (e.g., `["property_manager"]`, `["property_staff"]`, `["property_manager", "property_staff"]`)
                    *   `permissions?: string[]` (Optional: for more granular permissions within the org beyond base roles)
                    *   `invitedBy: string` (Auth UID of user who invited them)
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
                *   Purpose: Tracks invitations sent for this organization (for new org users or residents).
                *   Document ID: `{invitationId}` (e.g., auto-generated unique ID)
                *   Fields:
                    *   `email: string`
                    *   `rolesToAssign: string[]` (e.g., `["property_staff"]`, `["resident"]`)
                    *   `targetPropertyId?: string` (if for a resident, links to `organizations/{organizationId}/properties/{propertyId}`)
                    *   `status: "pending" | "accepted" | "expired"`
                    *   `createdBy: string` (Auth UID of an org user)
                    *   `createdAt: timestamp`
                    *   `expiresAt: timestamp`

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
*   **Hybrid Rendering Strategy (React 19):**
    *   **Client Components:** Default for most UI, especially interactive parts.
    *   **Server Components:**
        *   **Purpose:** Improve initial page load performance, reduce client-side JavaScript, and simplify server-side data fetching.
        *   **Use Cases:** Initial rendering of dashboards (Admin, Property Manager), data-heavy lists (properties, residents), reports. Server Components can directly interact with Firebase Admin SDK or call Cloud Functions.
*   **API Design (Cloud Functions):**
    *   Cloud Functions act as the primary backend API layer.
    *   Functions will be designed to be granular and secure, performing specific tasks (e.g., `createInvitation`, `processServiceRequest`, `importResidentsFromCSV`).
*   **State Management Strategy:**
    *   **Global State (React Context):** For broadly shared, less frequently updated data (e.g., authenticated user object, theme settings).
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
    2.  Credentials sent to Firebase Authentication.
    3.  On successful authentication, a Cloud Function (triggered on user creation/login) sets a custom role claim.
    4.  Firebase Auth ID token (with role claim) is available to the client.
    5.  Client-side routing and UI adapt based on the role.
    6.  Firestore Security Rules validate the role claim for data operations.

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
