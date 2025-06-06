# Product Context: Multi-Tenant ERP-Style Web Application

## 1. Why This Project Exists

This project aims to provide a modern, efficient, and scalable solution for property management. Traditional property management can involve disparate systems, manual processes, and communication gaps between administrators, property managers, and residents. This application seeks to centralize operations, streamline workflows, and enhance the experience for all stakeholders.

## 2. Problems It Solves

*   **Inefficient Operations:** Significantly reduces reliance on manual data entry (e.g., via CSV bulk import for residents), spreadsheets, and fragmented communication channels for managing properties, residents, and services.
*   **Lack of Transparency:** Provides clear visibility into property status, resident information, campaign effectiveness, and service request lifecycles for authorized users.
*   **Poor Resident Experience:** Offers residents a convenient digital platform for service requests, communication, and accessing relevant property information.
*   **Scalability Challenges:** Addresses the difficulty of scaling property management operations, especially resident onboarding, with traditional tools as the number of properties or residents grows (e.g., through bulk imports and manageable invitation campaigns).
*   **Data Security and Access Control:** Implements robust security measures and role-based access to protect sensitive information and ensure users only see what they are permitted to.
*   **Difficult Onboarding:** Greatly simplifies and enhances the process of onboarding new residents through flexible digital invitation "Campaigns," including bulk CSV imports and shareable public links/QR codes with configurable limits and expiry.

## 3. How It Should Work (User Experience Goals)

The application should provide a seamless and intuitive experience tailored to each user role:

*   **Super Administrators (`admin`):**
    *   **Global Oversight:** A comprehensive dashboard (now with a dedicated "Dashboard" tab) to monitor the entire system, including key platform metrics (total organizations, properties, users by role), user growth trends, and campaign effectiveness. Also provides tools to manage organizations, invite/assign Organization Managers, and oversee all property portfolios.
    *   **System Configuration:** Tools for managing core system settings (if any).
    *   **Top-Level Support:** Easy access to all data (organizations, users, properties, residents, services, invitation campaigns) for customer support and troubleshooting across the platform.
    *   **Organization Management:** Tools for creating, viewing, editing, and deactivating organizations.
    *   **Campaign Oversight (Implemented):** Ability to view and manage resident invitation campaigns across all organizations (`AdminCampaignsView.tsx`).

*   **Organization Managers (`organization_manager`):**
    *   **Scoped Oversight:** A dedicated dashboard (now with a "Dashboard" tab) to manage their assigned organization(s), displaying key metrics for the selected organization (total properties, residents, property managers) and campaign performance. If managing multiple organizations, an easy way to switch context is provided.
    *   **Staff Management:** Intuitive tools for inviting, viewing, and managing Property Managers and other staff within their organization(s).
    *   **Property Portfolio Management:** Tools for adding, editing, and removing properties within their organization(s).
    *   **Resident & Service Oversight:** Ability to view resident information and service request data within their organization(s) for management and support.
    *   **Resident Invitation Campaigns:** Tools to create, manage, and monitor resident invitation campaigns (CSV import, public links/QR codes) for properties within their assigned organization(s).
    *   **Reporting:** Access to reports and analytics specific to their organization(s), including campaign performance.

*   **Property Managers (`property_manager`):**
    *   **Centralized Control:** A dedicated dashboard (now with a "Dashboard" tab) to manage their assigned properties. After selecting a property, it displays key property-specific metrics (total residents, occupancy rate, total units) and campaign performance for that property. Also provides tools to view resident information, track service requests, and manage invitations.
    *   **Streamlined Resident Onboarding:** Powerful and flexible tools for resident invitations through "Campaigns":
        *   Bulk import of residents via CSV files.
        *   Generation of shareable public links and QR codes for open invitations.
        *   Ability to set usage limits (max sign-ups) and expiration dates for campaigns.
        *   Tracking the status and effectiveness of different invitation campaigns.
    *   **Efficient Communication:** Tools to communicate effectively with residents (future enhancement).
    *   **Clear Reporting:** Access to reports on property performance, service metrics, and resident onboarding/campaign success.

*   **Residents:**
    *   **Convenient Access:** A personal dashboard to view their property details, manage their profile (including vehicle information), and submit/track service requests.
    *   **Easy Service Requests:** An enhanced, simple, and clear process for requesting services. This includes:
        *   Dynamic fetching of available service types from external systems (e.g., Phoenix API).
        *   Ability to select multiple service types if applicable.
        *   Improved address input for service location using Google Places Autocomplete.
        *   Clear options for SMS consent regarding their service request.
        *   User-friendly phone number input formatting.
        *   Tracking the status of their submitted requests.
    *   **Self-Service:** Ability to update personal information and manage their account.
    *   **Secure and Private:** Confidence that their personal data is secure and access is appropriately restricted.

## 4. Overall User Experience Principles

*   **Intuitive Navigation:** Clear and consistent navigation across the application.
*   **Responsive Design:** The application should be accessible and usable across various devices (desktop, tablet, mobile).
*   **Performance:** Fast load times and responsive interactions, leveraging React 19 Server Components where appropriate.
*   **Clarity and Feedback:** Users should always understand the current state of the system and receive clear feedback on their actions.
*   **Aesthetics:** A clean, professional, and modern look and feel, guided by Material UI.
