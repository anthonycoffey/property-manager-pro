# Progress: Multi-Tenant ERP-Style Web Application

## 1. Current Status: Initial Setup & Planning (As of 2025-05-22)

The project is currently in the **initial setup and planning phase**. The primary activities have revolved around understanding the project scope via `projectRoadmap.md` and establishing the foundational "Memory Bank" documentation.

*   **Date of this update:** 2025-05-22

## 2. What Works / Completed

*   **Project Definition:**
    *   `projectRoadmap.md` has been reviewed and serves as the primary guide for development.
*   **Core Memory Bank Documentation Established:**
    *   `projectbrief.md`: Outlines project goals, core requirements, key technologies, high-level architecture, and scope.
    *   `productContext.md`: Details the project's purpose, problems it solves, and user experience goals.
    *   `systemPatterns.md`: Describes the system architecture, key technical decisions, design patterns, and component relationships.
    *   `techContext.md`: Lists technologies, development setup, technical constraints, dependencies, and tool usage patterns.
    *   `activeContext.md`: Defines current work focus, recent changes, next steps, active decisions, important patterns, and initial insights.
    *   This `progress.md` file.

## 3. What's Left to Build (High-Level from `projectRoadmap.md`)

The entire application functionality is yet to be built. Key high-level features include:

*   **A. Authentication & Authorization:**
    *   Firebase Authentication setup (sign-up, login, password reset).
    *   Cloud Function for setting custom claims (roles).
    *   Comprehensive Firestore Security Rules for RBAC.
*   **B. Admin Dashboard:**
    *   UI (React Client & Server Components).
    *   Property Managers Management (CRUD).
    *   Properties Management (CRUD).
    *   Residents Management (View, Edit, Delete for support).
*   **C. Property Manager Dashboard:** (Details to be expanded from roadmap as development progresses)
    *   View assigned properties.
    *   Manage residents for their properties.
    *   Manage invitations.
    *   Track service requests.
*   **D. Resident Dashboard:** (Details to be expanded from roadmap as development progresses)
    *   View property details.
    *   Manage profile (vehicle info).
    *   Submit and track service requests.
    *   **E. Core Systems & Features:**
    *   **Data Models in Firestore:** Implementation of `users`, `properties`, `residents`, `services`, `invitations`, `mail`, `templates` collections.
    *   **Invitation System:**
        *   Generation of unique codes (email/QR).
        *   Cloud Functions for managing invitation lifecycle, triggering emails via `firestore-send-email`.
    *   **Service Request System:**
        *   Forms for request submission.
        *   Status tracking.
        *   Cloud Functions for processing.
    *   **Firebase Cloud Functions for:**
        *   CRM Integration (future).
        *   Triggering Email Sending (invitations, notifications) via `firestore-send-email`.
        *   CSV Processing (bulk resident import).
        *   QR Code Generation.
        *   Subscription Management (future).

## 4. Known Issues & Blockers

*   **None at this stage.** The project is in its infancy. Issues will be documented here as they arise during development.

## 5. Evolution of Project Decisions

*   **Initial Decision (from `projectRoadmap.md`):** Adopt React 19 with Server Components and Firebase as the core stack.
*   **Initial Decision (from `.clinerules`):** Implement and maintain a "Memory Bank" documentation system.
*   **2025-05-22:** Decided to use Highcharts for analytics and reporting features.
*   *(This section will be updated as significant decisions are made or plans evolve throughout the project lifecycle).*

## 6. Immediate Next Steps (from `activeContext.md`)

1.  **Firebase Project Setup:** Create and configure the Firebase project.
2.  **React Application Initialization:** Set up the basic React 19 application structure.
3.  **Implement Basic Authentication:** Integrate Firebase Authentication for user sign-up and login.
4.  **Define Initial Firestore Schema & Rules:** Create the collections and basic security rules in Firestore.
5.  **Begin Admin Dashboard - Property Manager CRUD:** Start development of the first core feature set.
