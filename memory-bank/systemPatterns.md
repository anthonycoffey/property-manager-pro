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
        *   Integrations with third-party services (e.g., CRM, email).
        *   Scheduled tasks and background processing (e.g., CSV imports, monthly service count resets).
    *   **Firebase Hosting:** Hosts the static assets of the React application and provides CDN capabilities.

## 2. Key Technical Decisions & Design Patterns

*   **Role-Based Access Control (RBAC):**
    *   Implemented using Firebase Authentication custom claims (`role: 'admin'`, `role: 'property_manager'`, `role: 'resident'`).
    *   Enforced at multiple levels:
        *   **Frontend:** Conditionally rendering UI elements and routes based on user role.
        *   **Cloud Firestore:** Through meticulously defined Security Rules that restrict data access based on `request.auth.token.role` and data ownership (e.g., `resource.data.propertyManagerId == request.auth.uid`).
        *   **Cloud Functions:** Validating user roles before executing sensitive operations.
*   **Data Modeling (Firestore):**
    *   Utilizes a collection-based NoSQL structure. Key collections include `users`, `properties`, `residents`, `services`, and `invitations`.
    *   Relationships are managed primarily through IDs linking documents across collections (e.g., `propertyManagerId` in `properties` links to a document in the `users` collection).
    *   Consideration for sub-collections vs. top-level collections (e.g., `residents` could be a sub-collection of `properties`). The current roadmap suggests top-level collections with linking IDs.
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
