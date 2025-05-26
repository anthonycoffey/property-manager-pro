# Product Context: Multi-Tenant ERP-Style Web Application

## 1. Why This Project Exists

This project aims to provide a modern, efficient, and scalable solution for property management. Traditional property management can involve disparate systems, manual processes, and communication gaps between administrators, property managers, and residents. This application seeks to centralize operations, streamline workflows, and enhance the experience for all stakeholders.

## 2. Problems It Solves

*   **Inefficient Operations:** Reduces reliance on manual data entry, spreadsheets, and fragmented communication channels for managing properties, residents, and services.
*   **Lack of Transparency:** Provides clear visibility into property status, resident information, and service request lifecycles for authorized users.
*   **Poor Resident Experience:** Offers residents a convenient digital platform for service requests, communication, and accessing relevant property information.
*   **Scalability Challenges:** Addresses the difficulty of scaling property management operations with traditional tools as the number of properties or residents grows.
*   **Data Security and Access Control:** Implements robust security measures and role-based access to protect sensitive information and ensure users only see what they are permitted to.
*   **Difficult Onboarding:** Simplifies the process of onboarding new residents through digital invitation systems.

## 3. How It Should Work (User Experience Goals)

The application should provide a seamless and intuitive experience tailored to each user role:

*   **Super Administrators (`admin`):**
    *   **Global Oversight:** A comprehensive dashboard to monitor the entire system, manage organizations, invite/assign Organization Managers, oversee all property portfolios at a high level, and access system-wide analytics.
    *   **System Configuration:** Tools for managing core system settings (if any).
    *   **Top-Level Support:** Easy access to all data (organizations, users, properties, residents, services) for customer support and troubleshooting across the platform.
    *   **Organization Management:** Tools for creating, viewing, editing, and deactivating organizations.

*   **Organization Managers (`organization_manager`):**
    *   **Scoped Oversight:** A dedicated dashboard to manage their assigned organization(s). If managing multiple, an easy way to switch context.
    *   **Staff Management:** Intuitive tools for inviting, viewing, and managing Property Managers and other staff within their organization(s).
    *   **Property Portfolio Management:** Tools for adding, editing, and removing properties within their organization(s).
    *   **Resident & Service Oversight:** Ability to view resident information and service request data within their organization(s) for management and support.
    *   **Reporting:** Access to reports and analytics specific to their organization(s).

*   **Property Managers (`property_manager`):**
    *   **Centralized Control:** A dedicated dashboard to manage their assigned properties within a specific organization, view resident information, track service requests, and manage invitations for residents to their properties.
    *   **Streamlined Resident Onboarding:** Simple tools to generate and send invitations (email/QR codes) to new residents for their specific properties.
    *   **Efficient Communication:** Tools to communicate effectively with residents (future enhancement).
    *   **Clear Reporting:** Access to reports on property performance and service metrics.

*   **Residents:**
    *   **Convenient Access:** A personal dashboard to view their property details, manage their profile (including vehicle information), and submit/track service requests.
    *   **Easy Service Requests:** A simple and clear process for requesting services (e.g., tire change, jump start) and tracking their status.
    *   **Self-Service:** Ability to update personal information and manage their account.
    *   **Secure and Private:** Confidence that their personal data is secure and access is appropriately restricted.

## 4. Overall User Experience Principles

*   **Intuitive Navigation:** Clear and consistent navigation across the application.
*   **Responsive Design:** The application should be accessible and usable across various devices (desktop, tablet, mobile).
*   **Performance:** Fast load times and responsive interactions, leveraging React 19 Server Components where appropriate.
*   **Clarity and Feedback:** Users should always understand the current state of the system and receive clear feedback on their actions.
*   **Aesthetics:** A clean, professional, and modern look and feel, guided by Material UI.
