# React ERP Application Plan with Firebase

This document outlines a strategic plan for developing your multi-tenant ERP-style web application using React 19 for the frontend and Firebase for the backend infrastructure.

---

## 1. Core Technologies & Stack

### Frontend
* **React 19:** We'll leverage the latest features, including:
    * **Client Components:** For interactive UI elements, forms, and real-time updates.
    * **Server Components:** Ideal for fetching data on the server, rendering static or data-heavy parts of the UI, improving initial load performance, and reducing client-side JavaScript bundle size. We'll apply this strategically where data fetching is primary and interactivity is secondary.
* **Material UI (MUI):** This comprehensive React UI library, implementing Google's Material Design, will provide a robust and aesthetically pleasing set of components.
* **Material Icons:** We'll use Material Icons for a wide range of vector-based icons that integrate seamlessly with Material UI.
* **State Management:**
    * **React Context API:** For global state that needs to be accessed by many components (e.g., current user, authentication status).
* **Charting/Visualization:** **Highcharts** will be used for creating interactive charts and graphs for analytics and reporting features.
* **Data Fetching:** We'll primarily use the standard Fetch API for client-side data fetching. The architecture will remain open to integrating a more advanced data fetching and caching library like **React Query** in the future if it proves beneficial.

### Backend
* **Firebase:** This comprehensive platform will serve as the backbone:
    * **Firebase Authentication:** For user registration, login, and robust **role-based access control**.
    * **Cloud Firestore:** A flexible, scalable NoSQL cloud database for storing all application data (users, properties, residents, services, invitations, mail, templates). Its real-time capabilities are excellent for dashboards.
    * **Firebase Cloud Functions:** For server-side logic, API integrations (CRM), scheduled tasks, and enforcing business rules. This is where the "server-side" aspect of your application will largely reside, handling tasks that cannot or should not be done directly on the client.
    * **`firestore-send-email` Extension:** Will be used for sending templated emails (e.g., invitations, notifications). This involves a `mail` collection to trigger emails and a `templates` collection to store email content.
    * **Firebase Hosting:** For fast and secure hosting of your React application.

---

## 2. High-Level Application Architecture

The application will follow a hybrid rendering approach, combining Client-Side Rendering (CSR) for dynamic interactions with Server-Side Rendering (SSR) or Server Components for initial page loads and data-heavy views.

* **Client-Side Rendering (CSR):** Most interactive dashboards, forms, and real-time updates will be handled client-side. This ensures a fluid user experience.

* **Server Components (React 19):**
    * **Initial Page Loads:** For pages like the Admin dashboard, Property Manager dashboard, or resident service history, Server Components can pre-fetch data and render the initial HTML on the server. This improves perceived performance and SEO.
    * **Data-Heavy Views:** Reports, lists of properties/residents, and usage statistics can benefit from Server Components fetching data directly from Firestore or Cloud Functions. These views will utilize Highcharts for visualization.
    * **API Interactions:** Server Components can directly call Fetch requests, potentially simplifying data fetching logic compared to client-side Fetch calls.

* **Firebase Authentication:** All user interactions will be secured through Firebase Authentication, with **custom claims** used to define and enforce user roles (Admin, Property Manager, Resident).
* **Firestore Database:** All persistent data will be stored in Firestore, with **security rules** meticulously defined to ensure data integrity and restrict access based on user roles and ownership.
* **Firebase Cloud Functions:** These will serve as the backend API for:
    * **CRM Integration:** Dispatching service requests, fetching analytics.
    * **Triggering Email Invitations:** Cloud Functions will write to the `mail` collection to trigger emails via the `firestore-send-email` extension.
    * **CSV Processing:** Handling bulk resident imports securely and efficiently.
    * **QR Code Generation:** Generating QR codes on the server for security and consistency.
    * **Subscription Management:** Potentially integrating with a payment gateway (e.g., Stripe via Firebase Extensions).

---

## 3. Data Model (Firestore Collections)

The application employs a multi-tenant Firestore database structure designed for clear data isolation and scalability. Data is primarily organized under a root `organizations` collection, with tenant-specific data such as users, properties, and residents housed in subcollections. A separate root `admins` collection manages super administrator profiles.

The `mail` and `templates` collections, used by the `firestore-send-email` extension, remain as top-level collections and are not part of the direct multi-tenant data hierarchy for organizations, users, or properties.

**For the detailed Firestore schema, multi-tenancy design, specific collection structures, and field definitions, please refer to the canonical documentation in `memory-bank/systemPatterns.md`.**

The following top-level collections are also part of the system:

* **`mail` Collection (for `firestore-send-email`):**
    * `to` (string or array of strings)
    * `message` (map: `subject`, `html`, `text`)
    * `template` (map: `name`, `data`) - for using pre-defined templates
    * `delivery` (map: `startTime`, `state`, `endTime`, `error`, `attempts`, `leaseExpireTime`) - managed by the extension

* **`templates` Collection (for `firestore-send-email`):**
    * `id` (Document ID - template name)
    * `subject` (string)
    * `html` (string - Handlebars template)
    * `text` (string - Handlebars template, optional)
    * `createdAt` (timestamp)
    * `updatedAt` (timestamp)

---

## 4. Role-Based Features & Implementation Strategy

### A. Authentication & Authorization

* **Firebase Authentication:** We'll handle user sign-up, login, and password reset using Firebase Auth.
* **Custom Claims:** After a user signs up or is created, a Firebase Cloud Function will set custom claims on their Firebase Auth token. These claims are crucial for role-based access control (RBAC) and data scoping.
    * **Strategy:** Roles are stored as an array in the `roles` claim. Additional claims like `organizationId` and `propertyId` are used for granular access control within the multi-tenant structure.
        *   **Super Admins:** `claims: { roles: ["admin"] }`
        *   **Organization Users (Property Managers, Property Staff):** `claims: { roles: ["property_manager" | "property_staff"], organizationId: "{organizationId}" }`
        *   **Residents:** `claims: { roles: ["resident"], organizationId: "{organizationId}", propertyId: "{propertyId}" }`
    *   The minimum defined roles are `admin`, `property_manager`, `property_staff`, and `resident`.
    *   **For detailed custom claims strategy, refer to `memory-bank/systemPatterns.md`.**
* **Firestore Security Rules:** These are crucial for enforcing data access. Rules will leverage the custom claims (`request.auth.token.roles`, `request.auth.token.organizationId`, `request.auth.token.propertyId`) to ensure:
    * Admins can access necessary system-wide data.
    * Property Managers and Property Staff can only access data within their assigned `organizationId`.
    * Residents can only access their own data within their assigned `organizationId` and `propertyId`.
    * Data ownership and specific role permissions will be meticulously checked.

### B. Admin Dashboard
* **UI:** We'll use React Client Components for interactive tables, forms, and charts, with Server Components for initial data loads to ensure quick rendering.
* **Features:**
    * **Property Managers Management (CRUD):**
        * List all property managers.
        * Add/Edit/Remove property managers (creating/updating Firebase Auth users and Firestore `users` documents).
    * **Properties Management (CRUD):**
        * List all properties.
        * Add/Edit/Remove properties (creating/updating `properties` documents).
        * Assign/reassign property managers to properties.
    * **Residents Management (CRUD):**
        * Primarily for customer support, allowing admins to search and view resident details and service history.
        * Ability to edit/delete residents (updating `users` and `residents` documents).
