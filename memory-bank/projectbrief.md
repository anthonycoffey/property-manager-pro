# Project Brief: Multi-Tenant ERP-Style Web Application

## 1. Project Goal

To develop a multi-tenant ERP-style web application for property management. The application will facilitate various property-related operations for different user roles, including Super Administrators (`admin`), Organization Managers (`organization_manager`), Property Managers (`property_manager`), and Residents (`resident`).

## 2. Core Requirements

*   **Multi-tenancy:** The system must support distinct data, configurations, and user bases for multiple property management entities or clients (Organizations).
*   **Role-Based Access Control (RBAC):** Implement a robust RBAC system to ensure users can only access features and data appropriate to their roles. Key roles include:
    *   **Super Admin (`admin`):** Global system administration, manages Organizations and Organization Managers.
    *   **Organization Manager (`organization_manager`):** Manages one or more assigned Organizations, including their staff (Property Managers), properties, and residents.
    *   **Property Manager (`property_manager`):** Manages specific properties and their residents within an Organization.
    *   **Resident (`resident`):** Accesses their own information and services related to their property.
*   **User Management:**
    *   Super Admins can create and manage Organizations and invite/assign Organization Managers to them.
    *   Organization Managers can manage Property Managers and other staff within their assigned Organization(s).
    *   Property Managers can manage properties and residents associated with their properties.
    *   Residents can manage their own profiles and service requests.
*   **Property Management:** Allow Organization Managers and Property Managers to list, add, edit, and manage details of properties within their scope.
*   **Resident Management:**
    *   Property Managers (and Organization Managers) can invite and manage residents for their properties.
    *   Super Admins can manage all residents across all organizations for support purposes.
*   **Service Request Management:** Residents can request services, and these requests can be tracked and managed.
*   **Invitation System:** Property Managers can generate referral codes (email/QR) to invite new residents.
*   **Data Storage:** Utilize a scalable and secure NoSQL database (Cloud Firestore) for all application data.
*   **Backend Logic:** Implement server-side logic using cloud functions for tasks like API integrations, email sending, CSV processing, and business rule enforcement.
*   **Frontend Interface:** Develop a responsive and user-friendly interface using React, Material UI, and Material Icons.

## 3. Key Technologies

*   **Frontend:** React 19 (Client Components, Server Components), Material UI, Material Icons, React Hooks and React Context API.
*   **Backend:** Firebase (Authentication, Cloud Firestore, Cloud Functions, Hosting).
*   **Data Fetching (Client-side):** Fetch API, with potential future integration of React Query.

## 4. High-Level Architecture

*   **Hybrid Rendering:** Combine Client-Side Rendering (CSR) for dynamic interactions with Server Components for initial page loads and data-heavy views.
*   **Firebase Authentication:** Secure user interactions with custom claims for role definition.
*   **Firestore Database:** Store all persistent data with security rules for data integrity and access control.
*   **Firebase Cloud Functions:** Serve as the backend API for various operations.

## 5. Scope

The initial scope focuses on delivering the core functionalities for Super Admins, Organization Managers, Property Managers, and Residents as outlined in the project roadmap. This includes user authentication, property management, resident management, service requests, and the invitation system, CRM integration, and basic analytics.
