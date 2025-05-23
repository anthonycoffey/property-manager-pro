# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

The current focus is on the initial setup and planning phase of the "Multi-Tenant ERP-Style Web Application" project. This involves:
*   Understanding the project requirements and architecture as defined in `projectRoadmap.md`.
*   Establishing the core "Memory Bank" documentation (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md`).
*   Preparing to begin the development of core features.

## 2. Recent Changes & Activities

*   **`projectRoadmap.md` Reviewed:** The foundational document outlining the project's plan, technologies, architecture, and features has been read and processed.
*   **Core Memory Bank Files Created:**
    *   `projectbrief.md`: Defines project goals, requirements, and scope.
    *   `productContext.md`: Outlines the "why," problems solved, and UX goals.
    *   `systemPatterns.md`: Describes system architecture, key technical decisions, and design patterns.
    *   `techContext.md`: Details technologies, setup, constraints, and dependencies.
    *   This `activeContext.md` file.

## 3. Next Steps

*   **Create `progress.md`:** To complete the initial set of core Memory Bank files.
*   **Begin Development Planning:** Based on the `projectRoadmap.md`, start outlining the initial development tasks. This will likely involve:
    *   Setting up the Firebase project.
    *   Initializing the React frontend application.
    *   Implementing basic authentication.
    *   Defining initial Firestore data structures and security rules.
*   **Prioritize Initial Features:** Based on the roadmap, the first features to tackle will likely be:
    *   User Authentication (Firebase Auth with custom claims for roles).
    *   Admin Dashboard: Property Manager CRUD operations.

## 4. Active Decisions & Considerations

*   **Technology Stack Adherence:** Strictly follow the technologies outlined in `projectRoadmap.md` (React 19, Firebase, MUI).
*   **Role-Based Access Control (RBAC):** This is a critical aspect. Implementation via Firebase custom claims and Firestore Security Rules needs to be robust from the start.
*   **Hybrid Rendering (React Server Components):** Strategic application of Server Components for performance as per the roadmap. The setup for RSC needs to be correctly configured.
*   **Data Modeling:** The Firestore data model proposed in `projectRoadmap.md` will be the starting point. It needs to be implemented with appropriate security rules.
    *   `users`
    *   `properties`
    *   `residents`
    *   `services`
    *   `invitations`
    *   `mail` (for `firestore-send-email` extension)
    *   `templates` (for `firestore-send-email` extension)
*   **Email Sending:** The `firestore-send-email` extension will be used for templated emails. This needs to be configured and templates created.
*   **Firebase Emulator Suite:** Leverage heavily for local development and testing of Firebase features, including email sending if supported by the emulator or through mock setup.

## 5. Important Patterns & Preferences (from `projectRoadmap.md`)

*   **Clear Separation of Concerns:** Frontend (React), Backend (Firebase Cloud Functions), Database (Firestore).
*   **Security First:** Emphasis on Firestore Security Rules and proper authentication/authorization.
*   **User-Centric Design:** Tailored experiences for Admin, Property Manager, and Resident roles.
*   **Scalability:** Firebase services are chosen for their ability to scale.
*   **Modularity:** Design components and functions to be modular and maintainable.

## 6. Learnings & Project Insights (Initial)

*   The project has a well-defined technical direction and feature set outlined in the `projectRoadmap.md`.
*   The use of React 19 Server Components is a key architectural choice for performance.
*   Firebase is central to the entire backend and data management strategy.
*   The Memory Bank system is crucial for maintaining context and ensuring consistent development.
