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
    * **Resident Invitation Campaigns:**
        *   Bulk CSV imports.
        *   Public shareable links/QR codes.
        *   Campaign status management (active, inactive, completed, etc.), including deactivation and reactivation.

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
    * **Strategy:** Roles are stored as an array in the `roles` claim. Additional claims like `organizationId` (for single-org users), `organizationIds` (for multi-org users like Organization Managers), and `propertyId` are used for granular access control.
        *   **Super Admins (Global Access):** `claims: { roles: ["admin"] }` (Has implicit access to all organizations).
        *   **Organization Managers (Multi-Org Access):** `claims: { roles: ["organization_manager"], organizationIds: ["{organizationId1}", "{organizationId2}", ...] }` (Manages specified organizations).
        *   **Organization Staff (Property Managers, other staff - Single-Org Access):** `claims: { roles: ["property_manager" | "property_staff"], organizationId: "{organizationId}" }` (Operates within one specific organization).
        *   **Residents (Single-Property Access within an Org):** `claims: { roles: ["resident"], organizationId: "{organizationId}", propertyId: "{propertyId}" }`
    *   The minimum defined roles are `admin`, `organization_manager`, `property_manager`, `property_staff`, and `resident`.
    *   **For detailed custom claims strategy, refer to `memory-bank/systemPatterns.md`.**
* **Firestore Security Rules:** These are crucial for enforcing data access. Rules will leverage the custom claims (`request.auth.token.roles`, `request.auth.token.organizationId`, `request.auth.token.organizationIds`, `request.auth.token.propertyId`) to ensure:
    * Super Admins (`admin` role) can access all data system-wide.
    * Organization Managers (`organization_manager` role) can access data only within the organizations listed in their `organizationIds` claim.
    * Property Managers and Property Staff can only access data within their assigned single `organizationId`.
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

### C. Organization Manager Dashboard

The Organization Manager Dashboard provides tools for managing one or more assigned organizations, including their staff, properties, residents, and invitation campaigns.

*   **UI:** Primarily React Client Components for interactive elements, forms, and tables. Server Components may be used for initial data loading of lists or overview sections.
*   **Context Switching:**
    *   If an Organization Manager is assigned to multiple organizations, a prominent and clear mechanism (e.g., a dropdown selector, potentially adapting `OrganizationSelector.tsx`) will allow them to switch the dashboard's context to a specific organization.
    *   All data displays, management actions, and creation processes (e.g., creating a campaign) will be scoped to the currently selected organization.
*   **Features (scoped to the selected/assigned organization):**
    *   **1. Dashboard Overview:**
        *   Display key metrics and summaries for the selected organization:
            *   Total properties, total residents.
            *   Number of active Property Managers.
            *   Overview of active resident invitation campaigns and their performance.
            *   Summary of open/pending service requests.
        *   Quick links to common management areas (e.g., "Manage Staff," "View Properties," "Create Campaign").
    *   **2. Staff Management (Property Managers):**
        *   (Leverages or expands upon `OrgScopedPropertyManagerManagement.tsx`)
        *   View a list of all Property Managers within the selected organization.
        *   Invite new Property Managers to the organization (utilizing the invitation system, sending email invites).
        *   View/Edit Property Manager details (e.g., contact information, possibly assigned properties if not managed at the property level).
        *   Deactivate/Reactivate Property Manager accounts within the organization.
    *   **3. Property Portfolio Management:**
        *   View a comprehensive list of all properties belonging to the selected organization.
        *   Add new properties:
            *   Form including name, full address (with Google Places API autocompletion), type, and other relevant details.
            *   Assign a Property Manager (from within the organization) to the new property.
        *   Edit existing property details.
        *   Deactivate/Reactivate properties.
        *   View residents associated with each property.
    *   **4. Resident Invitation Campaigns Management:**
        *   (Integrates `src/components/OrganizationManager/Campaigns/OrgManagerCampaignsView.tsx`)
        *   Select a property within the chosen organization to manage its campaigns.
        *   Create new resident invitation campaigns (CSV import, Public Link/QR code) for the selected property.
            *   Configure campaign parameters: name, type, max uses, expiration date.
        *   View a list of all campaigns for the selected property, with statuses and key metrics.
        *   Actions for each campaign: Edit, Deactivate, Reactivate, Delete, View Details (including list of residents who joined via the campaign).
        *   Monitor campaign statistics (total invited, accepted, conversion rates).
    *   **5. Resident Oversight:**
        *   View a consolidated list of all residents across all properties within the selected organization.
        *   Ability to search and filter residents (e.g., by name, property, status).
        *   View detailed resident profiles (contact info, lease details, associated property and unit, service request history).
        *   (This is primarily for oversight and support purposes).
    *   **6. Service Request Oversight:**
        *   View a consolidated list of all service requests across all properties within the selected organization.
        *   Filter service requests (e.g., by property, status, request type, date).
        *   View details of individual service requests, including current status and assigned PM (if applicable).
        *   (This is primarily for monitoring, ensuring timely resolution, and identifying trends).
    *   **7. Reporting & Analytics:**
        *   Access to organization-specific reports and analytics, visualized using Highcharts:
            *   Property occupancy rates.
            *   Resident turnover/retention metrics.
            *   Effectiveness of invitation campaigns (conversion rates, cost per acquisition if applicable).
            *   Service request metrics (average resolution time, requests by type/property).
            *   Staff performance indicators (if applicable).

### D. Property Manager Dashboard

The Property Manager Dashboard is focused on the day-to-day management of assigned properties, including resident onboarding, property details, and service requests.

*   **UI:** Primarily React Client Components for high interactivity.
*   **Scope:** All views and actions are scoped to the Property Manager's assigned organization and the specific properties they manage within that organization. A property selection mechanism (e.g., `PropertySelectorDropdown.tsx`) will be used where actions are property-specific (like managing campaigns or viewing residents for one property).
*   **Features:**
    *   **1. Dashboard Overview:**
        *   Summary of key information for their assigned properties:
            *   Number of units, occupancy rates for each managed property.
            *   Overview of active resident invitation campaigns and their immediate status (e.g., number accepted / max uses).
            *   Count of open/pending service requests for their properties.
        *   Quick links to "Manage Campaigns," "View Residents for Property X," etc.
    *   **2. Property Details & Management:**
        *   View a list of properties they are assigned to manage.
        *   For each property, view detailed information (address, number of units, amenities, specific notes).
        *   Edit certain property details they are authorized to change (e.g., descriptive text, contact information for the property, amenity status).
        *   (Note: Major property creation/deactivation is typically handled by Organization Managers or Admins. PMs manage existing, assigned properties).
    *   **3. Resident Management & Onboarding (via Campaigns and Direct Invites):**
        *   (Integrates `src/components/PropertyManager/Campaigns/PropertyCampaignsView.tsx`, `CreateCampaignModal.tsx`, `EditCampaignModal.tsx`, `CampaignsTable.tsx`, `InviteResidentForm.tsx`, `EditResidentModal.tsx` and associated dialogs)
        *   Requires selection of a specific managed property to perform actions.
        *   **Resident Invitation Campaigns:**
            *   Create new resident invitation campaigns (CSV import, Public Link/QR code) for the selected property.
            *   Configure campaign parameters: name, type, max uses, expiration date.
            *   View, edit, activate, deactivate, delete campaigns for their properties.
            *   Monitor campaign statistics (total invited, accepted, conversion rates).
            *   View residents who joined via specific campaigns.
        *   **Direct Resident Invitations:**
            *   Invite individual residents via email to a specific unit within the selected property (for one-off situations or if campaigns are not suitable).
        *   **Resident Information Management:**
            *   View a list of all current and pending residents for the selected property.
            *   Search and filter residents within that property.
            *   View and edit resident details: profile information (name, contact), lease terms, unit assignment, vehicle information, etc.
            *   Manage resident lifecycle (e.g., process move-ins, initiate move-outs - future enhancements).
    *   **4. Service Request Management (for their properties):**
        *   View a list of all service requests associated with their assigned properties.
        *   Filter service requests (e.g., by status - "New," "In Progress," "Completed," "Cancelled"; by type; by date; by resident).
        *   View complete details of individual service requests.
        *   Update the status of service requests.
        *   Add internal notes or comments to service requests.
        *   Assign service requests to internal maintenance staff or external vendors (future enhancement, potentially involving Phoenix integration for dispatch).
        *   Log work done and materials used.
    *   **5. Reporting (Property-Specific):**
        *   Access to operational reports relevant to their managed properties:
            *   Current occupancy and vacancy reports.
            *   Lease expiration reports.
            *   Performance of their invitation campaigns.
            *   Summary of service requests (e.g., open vs. closed, average time to resolution, requests by category for their properties).
        *   Visualizations using Highcharts.

### E. Resident Dashboard (Automobile Roadside Assistance Focus)

The Resident Dashboard provides a personalized portal for residents to manage their profile (especially vehicle information) and request automobile roadside assistance services. The UI should be optimized for ease of use, especially in potentially stressful roadside situations.

*   **UI:** Clean, intuitive, and highly mobile-responsive, built with React Client Components. Emphasis on quick access to service request functions.
*   **Scope:** All information and actions are strictly scoped to the logged-in resident and their registered vehicles.
*   **Features:**
    *   **1. Dashboard:**
        *   Personalized welcome message.
        *   Quick overview of their registered vehicles (e.g., make, model, license plate displayed concisely).
        *   A prominent and easily accessible button/link to "Request Roadside Service."
        *   Clear display of the status of any ongoing or very recent service requests.
        *   Important announcements related to roadside services (e.g., changes in service hours, new service types available - future enhancement).
    *   **2. My Profile & Vehicle Management:**
        *   (Leverages or expands `src/components/Resident/ResidentProfileManagement.tsx`, with a strong emphasis on vehicle details)
        *   View and update personal contact information (critical for service dispatch and communication).
        *   **Manage Vehicles:**
            *   Ability to add, edit, and remove vehicles associated with their account.
            *   Required information per vehicle: Make, Model, Year, Color, License Plate.
            *   Optional but helpful: VIN, current mileage (for context), notes (e.g., "spare tire in trunk").
            *   Ability to designate a "primary" vehicle for quicker selection during service requests.
        *   View a history of all roadside services requested through their account.
    *   **3. Roadside Service Request Management:**
        *   (Leverages and tailors `src/components/Resident/CreateServiceRequestForm.tsx` and `src/components/Resident/ServiceRequestList.tsx`)
        *   **Request New Roadside Service:**
            *   Select the vehicle requiring service (default to primary, easy to change).
            *   Specify the current location of the vehicle:
                *   Option to use device GPS for current location.
                *   Manual address input with autocompletion (Google Places API).
                *   Ability to save and select from common locations like "Home," "Work" (future enhancement).
            *   Select the type of roadside service needed from a predefined list:
                *   Tire Change (e.g., flat tire, confirm if spare is available)
                *   Jump Start (dead battery)
                *   Lockout Service (keys locked in vehicle)
                *   Fuel Delivery (specify fuel type, limited quantity, e.g., 2 gallons)
                *   Winching/Extrication (e.g., stuck in mud, snow - for basic recovery)
                *   Other (with a field for a brief description of the unlisted issue).
            *   Provide a brief, clear description of the issue or any relevant details for the service provider (e.g., "car is in an underground garage," "front passenger side flat tire").
        *   **Track Service Requests:**
            *   View a list of their past and current roadside service requests.
            *   Clear, real-time status updates for each request (e.g., "Request Submitted," "Searching for Provider," "Provider Dispatched," "Provider En Route," "Service In Progress," "Service Completed," "Request Cancelled").
            *   Estimated Time of Arrival (ETA) for the service provider, if available from the dispatch system (e.g., via Phoenix integration).
            *   View details of the assigned service provider (e.g., name, company name - if provided by the dispatch system).
            *   Map view showing provider's location en route (future enhancement, dependent on dispatch system capabilities).
    *   **4. Service Provider Information & Feedback (Future Enhancement):**
        *   Basic information about the roadside assistance service network or approved providers.
        *   Option to rate the service or provide feedback after a request is completed.
    *   **5. GPTChat Model Integration (Ongoing/Future Enhancement):**
        *   Access to an integrated AI-powered chatbot for:
            *   Answering common questions about available roadside services, what's covered, or how to submit a request effectively.
            *   Potentially assisting in initiating a service request through a conversational interface (e.g., "I have a flat tire on my Honda Civic at [location]").
            *   Providing basic troubleshooting tips for minor car issues before a service request is formally logged (e.g., "how to check if your car battery is dead," "what to do if you run out of gas").

---
## 5. Core Systems (Beyond Role-Specific Dashboards)

This section details key backend systems and integrations that support the overall application functionality.

### F. Core System: Service Request Management (Automobile Roadside Assistance)

This system is dedicated to managing the lifecycle of automobile roadside assistance requests. It begins with a resident's submission, involves dispatch and tracking (primarily via integration with the "Phoenix" system), and concludes with service completion and record-keeping.

*   **1. Data Model (Firestore):**
    *   Service request data will be stored primarily within the `organizations/{organizationId}/services` subcollection (as outlined in `systemPatterns.md`, though the `propertyId` field within a service document might be less critical for roadside assistance compared to on-property services, it can still link the resident to their home base/organization).
    *   **Key Fields for a Service Document (`services/{serviceId}`):**
        *   `residentId`: Firebase Auth UID of the requesting resident.
        *   `organizationId`: Denormalized ID of the resident's organization.
        *   `vehicleDetails`: An object containing essential details of the vehicle requiring service (e.g., `{ make: string, model: string, year: string, color: string, licensePlate: string }`).
        *   `serviceType`: A predefined string/enum indicating the type of roadside assistance requested (e.g., "tire_change", "jump_start", "lockout_service", "fuel_delivery", "winching_extrication", "other_roadside").
        *   `requestLocation`: An object storing the location details where service is needed (e.g., `{ latitude: number, longitude: number, addressString: string, locationNotes?: string }`).
        *   `requestTimestamp`: Timestamp of when the resident submitted the request.
        *   `status`: A string/enum tracking the request's current state (e.g., "submitted_to_app", "pending_phoenix_dispatch", "phoenix_job_created", "provider_assigned_phoenix", "provider_en_route_phoenix", "service_in_progress_phoenix", "service_completed_phoenix", "service_cancelled_resident", "service_cancelled_system", "dispatch_failed_phoenix").
        *   `description`: Resident's detailed description of the issue.
        *   `phoenixJobId?`: The unique identifier for this job within the Phoenix dispatch system.
        *   `assignedProviderInfo?`: An object potentially synced from Phoenix, containing details of the dispatched service provider (e.g., `{ providerName: string, companyName: string, estimatedArrivalTime?: timestamp, providerContact?: string }`).
        *   `completionTimestamp?`: Timestamp of when the service was marked as completed.
        *   `completionNotes?`: Any notes added by the service provider or system upon completion (e.g., "Spare tire installed," "Battery jumped, advised customer to replace battery").
        *   `residentFeedback?`: An object for resident feedback post-service (e.g., `{ rating: number, comments: string }` - future enhancement).

*   **2. Workflow & Cloud Functions (with Phoenix Integration Points):**
    *   **a. Resident Submits Request (`createServiceRequest` Callable Function):**
        *   Triggered from the Resident Dashboard.
        *   Inputs: `vehicleId` (or full vehicle details if not pre-selected), `serviceType`, `locationData`, `description`.
        *   Logic:
            1.  Validates resident's eligibility (e.g., active account, service coverage if applicable - future).
            2.  Creates a new document in the Firestore `services` collection with an initial status like "submitted_to_app".
            3.  **Phoenix Integration (Dispatch):** Immediately, or via a subsequent triggered Cloud Function (e.g., Firestore trigger on new service document), the request details are securely transmitted to the Phoenix dispatch system API.
                *   The Phoenix API is expected to return a `phoenixJobId` upon successful job creation.
                *   This `phoenixJobId` is then updated onto the Firestore service document, and the status might change to "pending_phoenix_dispatch" or "phoenix_job_created".
            4.  Returns a confirmation (including the local `serviceId`) to the resident's app.
    *   **b. Phoenix Updates Status (Webhook or Polling):**
        *   **Phoenix Integration (Status Sync):** A mechanism is required for the Phoenix system to send real-time (or near real-time) status updates back to this application.
            *   **Preferred Method: Webhook.** An HTTP-triggered Cloud Function is exposed, which Phoenix calls whenever a job status changes (e.g., provider assigned, en route, ETA update, completed, cancelled). This function updates the corresponding Firestore `services` document with the new `status`, `assignedProviderInfo`, `ETA`, `completionNotes`, etc.
            *   **Alternative: Polling.** A scheduled Cloud Function could periodically poll a Phoenix API for updates on active jobs (less efficient and real-time).
        *   Firestore updates from these syncs will drive real-time status changes visible on Resident, PM, and OM dashboards.
    *   **c. Request Cancellation:**
        *   **By Resident (`cancelServiceRequest` Callable Function):**
            *   Allows residents to cancel a request if it's within a permissible window (e.g., before a provider is dispatched or has travelled significantly).
            *   Updates the Firestore service document status to "service_cancelled_resident".
            *   **Phoenix Integration (Cancel Job):** Notifies the Phoenix system API to cancel the corresponding job.
        *   **By System/Admin/PM (`updateServiceRequest` Callable Function - with appropriate permissions):**
            *   Allows authorized personnel to update or cancel requests for various reasons (e.g., resident no longer needs service, unable to reach resident).
            *   Updates status in Firestore.
            *   **Phoenix Integration (Cancel/Update Job):** Notifies Phoenix if the job needs to be modified or cancelled.

*   **3. User Interface Interactions & Scope:**
    *   **Resident Dashboard:** Primary interface for submitting new roadside requests and viewing real-time status and history of *their own* requests.
    *   **Property Manager Dashboard:** Can view a list of service requests initiated by residents of *their assigned properties*. Primarily for awareness, support escalation if a resident reports issues with the service, and potentially for viewing local service trends. PMs do not typically dispatch or directly manage roadside assistance.
    *   **Organization Manager Dashboard:** Can oversee all service requests within *their assigned organization(s)*. Used for monitoring overall service levels, identifying systemic issues or trends, and generating reports on service usage and performance.
    *   **Admin Dashboard:** Global oversight of all service requests across the platform for high-level analytics, support, and troubleshooting system-wide issues (including Phoenix integration health).

*   **4. Notifications (Future Enhancements):**
    *   In-app, push, or SMS notifications to residents for critical status updates (e.g., "Provider Dispatched - ETA 30 mins," "Provider Arriving Soon," "Service Completed").
    *   Alerts to relevant PMs/OMs for highly escalated issues, repeated failures for a resident, or prolonged service delays.

### G. Core System: Phoenix Integration (Roadside Assistance Dispatch & Tracking)

This section outlines the technical plan for integrating the application with the "Phoenix" system, which is understood to be an external third-party service responsible for dispatching roadside assistance providers and managing the lifecycle of active service jobs.

*   **1. Purpose of Integration:**
    *   To seamlessly submit new roadside assistance requests, initiated by residents via this application, to the Phoenix system for dispatch.
    *   To receive and reflect real-time (or near real-time) status updates from Phoenix regarding the dispatched job, including provider assignment, Estimated Time of Arrival (ETA), and service completion.
    *   To ensure data consistency for active service requests between this application's Firestore database and the Phoenix system.
    *   To enable cancellation or modification of jobs in Phoenix if initiated from this application.

*   **2. Key Integration Points & Communication Methods:**
    *   **a. Outbound Communication (This Application to Phoenix):**
        *   **Submitting New Service Requests:**
            *   **Trigger:** Firebase Cloud Function (e.g., the `createServiceRequest` callable function or a subsequent Firestore trigger on new service document creation).
            *   **Method:** Secure server-to-server HTTPS API call to a Phoenix-provided endpoint for creating new service jobs.
            *   **Authentication:** The Cloud Function will authenticate with the Phoenix API using a secure method (e.g., API Key, OAuth 2.0 client credentials) stored in Firebase Function environment configuration.
            *   **Data Payload (to Phoenix):** A structured JSON payload containing all necessary details for dispatch. This payload **must also include metadata from this application** to ensure easy linking of data across applications and for Phoenix's internal tracking, reporting, or routing logic if needed.
                *   `externalJobId` or `sourceJobId`: The unique `serviceId` from this application (for precise correlation).
                *   Resident contact information (name, phone number).
                *   Detailed vehicle information (make, model, year, color, license plate; VIN if available).
                *   Specific service type requested (e.g., "tire_change", "jump_start").
                *   Precise location of the vehicle (latitude, longitude, and/or formatted address string).
                *   Resident's description of the issue.
                *   **Source Tracking & Contextual Metadata (from this application):**
                    *   `requestSourceIdentifier`: A fixed string like "property-manager-pro-app".
                    *   `clientOrganizationId`: The `organizationId` to which the resident belongs in this application.
                    *   `clientPropertyId?`: The `propertyId` with which the resident is associated (this might be useful for Phoenix if they have different service levels or providers based on property).
                    *   `clientResidentId`: The Firebase Auth UID of the resident making the request.
                    *   Any other relevant non-PII tags or identifiers that Phoenix might use for analytics or specialized routing.
            *   **Expected Response (from Phoenix):** Upon successful job creation, the Phoenix API is expected to return:
                *   A unique `phoenixJobId`.
                *   Initial job status in the Phoenix system.
                *   This `phoenixJobId` will be stored in the corresponding Firestore `services` document.
        *   **Cancelling or Modifying Service Requests:**
            *   **Trigger:** Firebase Cloud Function (e.g., `cancelServiceRequest` or `updateServiceRequest` callable functions).
            *   **Method:** Secure server-to-server HTTPS API call to Phoenix-provided endpoints for job cancellation or modification, using the `phoenixJobId`.
            *   **Authentication:** Same as for job submission.
            *   **Data Payload (to Phoenix):** Details of the cancellation (e.g., reason) or modification.

    *   **b. Inbound Communication (Phoenix to This Application):**
        *   **Receiving Real-Time Status Updates:**
            *   **Preferred Method: Phoenix Webhooks.**
                *   Phoenix system makes an HTTPS POST request to a dedicated HTTP-triggered Firebase Cloud Function (webhook endpoint) in this application whenever a significant event occurs for a managed job (e.g., provider assigned, provider en route, ETA updated, service started, service completed, job cancelled by provider/system).
                *   **Webhook URL:** This application will provide a stable, secure URL for this Cloud Function to Phoenix.
                *   **Security:** The webhook endpoint must validate incoming requests to ensure they are legitimately from Phoenix (e.g., using a shared secret in the header, HMAC signature verification, or mutual TLS if supported).
                *   **Data Payload (from Phoenix):** A structured JSON payload containing:
                    *   The `phoenixJobId` (or the correlated `serviceId` from this application).
                    *   The new `status` of the job.
                    *   Updated `assignedProviderInfo` (provider name, company, contact details, current location, updated ETA).
                    *   `completionNotes` or `cancellationReason` if applicable.
                *   The receiving Cloud Function will parse this payload and update the corresponding service request document in Firestore in real-time.
            *   **Alternative (If Webhooks Not Supported by Phoenix): Scheduled Polling.**
                *   A Firebase Cloud Function scheduled to run at frequent intervals (e.g., every 1-5 minutes) would make API calls to Phoenix to query the status of all active/pending jobs associated with this application.
                *   Requires a Phoenix API endpoint for batch status retrieval or individual job status query (using `phoenixJobId`).
                *   This method is less efficient and provides delayed updates compared to webhooks.

*   **3. Error Handling, Logging, and Resilience:**
    *   Implement comprehensive error handling for all API interactions with Phoenix (e.g., network timeouts, HTTP error codes, invalid responses).
    *   Utilize retry mechanisms with exponential backoff for transient errors during outbound API calls.
    *   Detailed logging of all integration requests, responses, and errors in Cloud Logging for auditing and troubleshooting.
    *   Implement an alerting mechanism (e.g., Cloud Monitoring alerts) for critical integration failures (e.g., repeated API authentication failures, high rate of Phoenix API errors, webhook endpoint failures).
    *   Define a strategy for handling Phoenix system downtime or unresponsiveness (e.g., queueing outbound requests, displaying appropriate messages to users, manual fallback procedures if necessary).

*   **4. Data Synchronization and Source of Truth:**
    *   The Firestore `services` document will serve as the application's local representation of the service request.
    *   The `phoenixJobId` is the critical link for correlating data between the two systems.
    *   Phoenix is generally considered the source of truth for real-time dispatch status, provider information, and ETAs once a job is accepted by their system. This application will reflect these updates.

*   **5. Development and Testing Environment:**
    *   Secure access to a Phoenix sandbox or testing environment is essential for developing and thoroughly testing the integration without impacting live dispatch operations.
    *   Develop mock Phoenix API endpoints or use a tool like Postman Mock Servers to simulate Phoenix responses for testing Cloud Functions locally.

### H. Core System: Custom GPTChat Model Integration

This system involves integrating a custom-trained or context-aware GPT-based chat model to provide assistance and information to users, primarily residents, focusing on automobile roadside assistance and application usage.

*   **1. Purpose & Scope:**
    *   **Primary Goal (For Residents via Resident Dashboard):**
        *   **Answering FAQs:** Provide instant answers to frequently asked questions about the available roadside assistance services (e.g., "What types of services are offered?", "Is fuel delivery covered?", "How long does a jump start usually take?").
        *   **Basic Troubleshooting:** Offer preliminary troubleshooting steps for common automobile issues before a formal service request is logged (e.g., "My car isn't starting, what are common causes?", "What should I do if I have a flat tire?"). This could help users resolve minor issues themselves or provide better information when requesting service.
        *   **Application Navigation & Usage Guidance:** Help residents understand how to use the application's features (e.g., "How do I add a new vehicle to my profile?", "Where can I see my past service requests?").
        *   **Conversational Service Initiation (Potential Future Enhancement):** Allow users to describe their issue conversationally (e.g., "I have a flat tire on my sedan"), and the chatbot could help gather necessary details (location, vehicle) to pre-fill or guide them to the service request form.
    *   **Secondary Goal (For Property Managers - Evaluation Pending):**
        *   Explore the feasibility of providing Property Managers with access to a version of the chatbot. This might be trained on different data (e.g., property management best practices, internal policies, FAQs relevant to PM tasks) or could be a more general assistant. This is a lower priority and requires further definition and evaluation of value.

*   **2. Model & Knowledge Base Strategy:**
    *   **Model Choice:** A specific GPT-based Large Language Model (LLM) needs to be selected (e.g., from OpenAI, Google, Anthropic, or a self-hosted open-source model if infrastructure allows).
    *   **Knowledge Provisioning (Retrieval Augmented Generation - RAG is highly recommended):**
        *   To ensure accuracy, relevance, and the ability to use up-to-date custom information, a RAG approach is preferred over fine-tuning for this type of Q&A and guidance system.
        *   **Knowledge Base Creation:** Curate and maintain a knowledge base of documents relevant to:
            *   Roadside assistance services offered (details, limitations, processes).
            *   Common vehicle troubleshooting steps.
            *   Application features and how-to guides.
            *   FAQs.
        *   **Vector Database:** This knowledge base will be processed and stored in a vector database (e.g., Pinecone, Weaviate, or a Firestore extension if available and suitable).
        *   **Contextual Retrieval:** When a user asks a question, the system will first query the vector database to find the most relevant information chunks. These chunks are then passed to the LLM as context along with the user's query.

*   **3. Technical Integration Architecture:**
    *   **a. Frontend Chat Interface (React Component):**
        *   A reusable React component will provide the chat UI within the Resident Dashboard.
        *   Standard features: message input field, conversation history display, typing indicators, clear button.
    *   **b. Backend API Layer (Firebase Cloud Function):**
        *   A secure HTTPS callable Cloud Function will serve as the backend for the chat interface.
        *   **Responsibilities:**
            1.  Receive the user's message and conversation history (for context) from the frontend.
            2.  Authenticate the user (ensuring only logged-in residents can use the service).
            3.  Perform the RAG step: Convert the user's query into an embedding and search the vector database for relevant context documents.
            4.  Construct a detailed prompt for the LLM, including:
                *   The original user query.
                *   The retrieved context from the vector database.
                *   The conversation history (to maintain conversational flow).
                *   System-level instructions to guide the LLM's persona, tone, and scope (e.g., "You are a helpful assistant for Property Manager Pro residents. Only answer questions related to roadside assistance and using this app.").
            5.  Make a secure API call to the chosen LLM provider's API endpoint.
            6.  Receive the LLM's generated response.
            7.  Optionally, process or sanitize the response (e.g., remove PII if the model accidentally includes it, format for display).
            8.  Return the final response to the frontend.
        *   **API Key Management:** The API key for the LLM provider (e.g., `OPENAI_API_KEY`) and any keys for vector database services **must not be hardcoded into the source code or committed to Git.** They will be securely managed using one of the following methods:
            *   **Google Cloud Secret Manager (Recommended for production):** The secret (e.g., `OPENAI_API_KEY`) is stored in Google Cloud Secret Manager. The Cloud Function is granted IAM permission to access this secret at runtime using the Secret Manager client library.
            *   **Firebase Function Environment Configuration (Secure alternative):** The secret is set as an environment variable for the Cloud Functions via the Firebase CLI (e.g., `firebase functions:config:set gpt_integration.openai_api_key="YOUR_KEY"`). The Cloud Function then accesses it at runtime via `functions.config().gpt_integration.openai_api_key`.
    *   **c. LLM Provider API:**
        *   Direct interaction with the specific API of the chosen LLM provider (e.g., OpenAI API, Google Vertex AI API).
        *   Adherence to the provider's request/response formats, authentication mechanisms, and usage/rate limits.

*   **4. Conversation Management:**
    *   Conversation history should be maintained during a session to allow for follow-up questions. This can be managed in frontend state or passed back and forth with the backend.
    *   Consider whether to persist conversation history in Firestore for users across sessions (evaluate PII/privacy implications and storage costs).
    *   Provide users with an easy way to clear the current conversation or start a new topic.

*   **5. Safety, Moderation, and Responsible AI Practices:**
    *   Clearly label the chat interface as an AI assistant.
    *   Implement input validation and consider moderation layers for user inputs if harmful queries are a concern.
    *   Review and refine system prompts to minimize biased, harmful, or off-topic responses from the LLM.
    *   Provide an option for users to indicate if an answer was unhelpful or to easily escalate to human support channels if the chatbot cannot resolve their issue.

*   **6. Monitoring, Evaluation, and Iteration:**
    *   Log anonymized conversation data (user queries, retrieved context, LLM responses) to monitor the chatbot's performance, identify common unanswerable questions, and find areas for improving the knowledge base or system prompts.
    *   Track user engagement and satisfaction with the chatbot feature (e.g., thumbs up/down on responses).
    *   Regularly update the knowledge base for the RAG system as application features or service details change.

### I. Core System: Dashboard Data Visualizations & Statistics

This system focuses on providing actionable insights and clear data visualizations to users across different roles (Admin, Organization Manager, Property Manager) using the Highcharts library integrated into the React frontend. The goal is to transform raw data into easily understandable charts and metrics that support decision-making and operational monitoring.

*   **1. Purpose & Scope:**
    *   To present Key Performance Indicators (KPIs), operational trends, and comparative data in an intuitive visual format.
    *   To enable users at different levels to monitor performance, identify areas for improvement, and understand the impact of their actions (e.g., campaign effectiveness, service efficiency).
    *   Visualizations and statistics will be tailored to the specific responsibilities and data access scope of each user role.

*   **2. Technology & Data Sourcing:**
    *   **Charting Library:** **Highcharts** will be used for rendering interactive and responsive charts within React components.
    *   **Primary Data Source:** Cloud Firestore will be the main source of data for generating statistics and visualizations.
    *   **Data Aggregation and Preparation Strategy:**
        *   **Client-Side (for simple, real-time views):** For some charts displaying current-state data or small datasets, data might be fetched directly by React components (Client or Server Components) and formatted client-side for Highcharts.
        *   **Backend Aggregation (Firebase Cloud Functions - for complex or historical data):** For more complex aggregations, historical trend analysis, or to optimize performance for large datasets, dedicated Firebase Cloud Functions (callable) will be developed. These functions will:
            *   Perform efficient queries and aggregations on Firestore data (e.g., counting records, summing values, grouping by time periods).
            *   Pre-process and structure the data into the format required by Highcharts.
            *   Return the prepared data to the frontend for rendering.
        *   **Denormalized Counters/Summaries (Firestore - for frequently accessed KPIs):** For very common KPIs (e.g., total active residents per property), consider maintaining denormalized counters or summary documents in Firestore that are updated via Cloud Functions (triggers) to allow for very fast reads by dashboards.

*   **3. Key Visualizations & Statistics by User Role:**

    *   **a. Admin Dashboard (Global, System-Wide Perspective):**
        *   **Platform Overview:**
            *   Total active Organizations, Properties, Property Managers, Organization Managers, and Residents.
            *   Growth trends over time (e.g., new organizations, users, properties per month/quarter - line/bar charts).
            *   Geographical distribution of properties/organizations (map chart - future enhancement).
        *   **Resident Invitation Campaign Effectiveness (Aggregated):**
            *   Overall conversion rates (invited vs. signed-up) across all organizations.
            *   Most effective campaign types platform-wide.
        *   **Roadside Service Request Analytics (Aggregated):**
            *   Total service requests volume over time (platform-wide).
            *   Distribution of service requests by type (pie/bar chart).
            *   Average service completion times (if available from Phoenix integration data).
        *   **System Health & Usage:**
            *   Key integration health indicators (e.g., Phoenix API success/error rates - if logged).
            *   Active user sessions / feature usage frequency (if tracked).

    *   **b. Organization Manager Dashboard (Scoped to their selected/assigned Organization(s)):**
        *   **Organizational Performance:**
            *   Number of properties, total units, overall occupancy rate within the organization.
            *   Trend of resident count over time.
            *   Breakdown of Property Managers and properties they manage.
        *   **Resident Invitation Campaign Performance (for their Organization):**
            *   Conversion rates per campaign and per property within their organization.
            *   Comparison of campaign effectiveness (e.g., CSV import vs. Public Link).
            *   Cost per resident acquisition via campaigns (if cost data is input - future).
        *   **Roadside Service Request Analytics (for their Organization):**
            *   Volume of requests by type and by property.
            *   Average response and completion times for services within their organization.
            *   Identification of properties or areas with high service request volumes.

    *   **c. Property Manager Dashboard (Scoped to their assigned Properties):**
        *   **Property-Specific Metrics:**
            *   Occupancy rate for each managed property.
            *   Number of active residents per property.
            *   Upcoming lease expirations (if lease end-dates are managed and relevant for resident retention efforts).
        *   **Resident Invitation Campaign Performance (for their specific campaigns/properties):**
            *   Effectiveness of their campaigns (invited, accepted, conversion rate).
            *   Drill-down into specific campaign performance.
        *   **Roadside Service Request Summaries (for their properties):**
            *   Number of open vs. closed requests for each property.
            *   Breakdown of requests by service type.
            *   Average time to completion for requests on their properties (if data is available and relevant).

    *   **d. Resident Dashboard (Limited, Personalized Statistics - Future Enhancement):**
        *   Simple display of their personal service request history (e.g., count of requests by type, list of recent requests).

*   **4. Implementation Considerations:**
    *   **Chart Type Selection:** Choose appropriate Highcharts types (line, bar, column, pie, area, scatter, gauge, etc.) to best represent the data and the insight to be conveyed.
    *   **Interactivity:** Utilize Highcharts features like tooltips, drill-downs (e.g., click on a month in a trend chart to see daily data), zoom, and data point highlighting.
    *   **Responsiveness:** Ensure all charts are fully responsive and adapt gracefully to different screen sizes (desktop, tablet, mobile).
    *   **Data Loading & Performance:**
        *   Optimize Firestore queries used for fetching chart data (use indexes effectively).
        *   Implement filters (e.g., date ranges, status) to allow users to narrow down data for charts.
        *   For very large datasets or complex historical trends, rely on backend aggregation via Cloud Functions.
        *   Consider caching strategies for aggregated data that doesn't change frequently.
    *   **Accessibility (A11y):** Design charts with accessibility in mind:
        *   Ensure good color contrast.
        *   Provide keyboard navigation for interactive elements.
        *   Offer data tables as an alternative way to consume the information presented in charts.
        *   Use ARIA attributes where appropriate.

*   **5. Future Enhancements:**
    *   Allow users to export chart images (PNG, JPG, SVG) or underlying data (CSV, Excel).
    *   Develop more customizable dashboards where users can select, arrange, and save their preferred charts and metrics.
    *   Introduce more advanced analytics, such as predictive forecasting for occupancy or service demand.
    *   Real-time updates for certain KPI charts where appropriate.
