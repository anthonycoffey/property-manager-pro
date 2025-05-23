# Tech Context: Multi-Tenant ERP-Style Web Application

## 1. Core Technologies

### Frontend
*   **React 19:**
    *   **Client Components:** For interactivity.
    *   **Server Components:** For performance and server-side data fetching.
*   **Material UI (MUI):** UI component library for Material Design.
*   **Material Icons:** Vector icons.
*   **State Management:**
    *   **React Context API:** Global state (user auth, theme).
    *   **Zustand:** Complex/local component state.
*   **Data Fetching (Client-Side):** Standard `Workspace` API (e.g., `fetch`). Open to React Query if needed.
*   **Build Tool:** (Implicit) Likely Vite or Create React App, to be confirmed. Standard Node.js/npm/yarn ecosystem.

### Backend
*   **Firebase:**
    *   **Firebase Authentication:** User management, RBAC via custom claims.
    *   **Cloud Firestore:** NoSQL database (data: users, properties, residents, services, invitations). Real-time updates. Firestore Security Rules for access control.
    *   **Firebase Cloud Functions:** Server-side logic, API (Node.js or Python runtime, to be decided based on team preference or specific needs, though Node.js is common with Firebase).
    *   **Firebase Hosting:** Static asset hosting, CDN.

## 2. Development Setup & Environment

*   **Node.js & npm/yarn:** Required for React development and Firebase CLI.
*   **Firebase CLI:** Essential for deploying functions, hosting, Firestore rules, and local emulation.
*   **IDE:** Visual Studio Code recommended, or any editor with good JavaScript/TypeScript support.
*   **Version Control:** Git (repository to be set up on a platform like GitHub, GitLab, or Bitbucket).
*   **Local Emulation:** Firebase Local Emulator Suite will be crucial for testing Authentication, Firestore, and Cloud Functions locally before deployment.

## 3. Technical Constraints & Considerations

*   **Firebase Quotas and Limits:** Development must be mindful of Firebase usage quotas (e.g., Firestore reads/writes, Cloud Function invocations, storage).
*   **Firestore Security Rules Complexity:** Writing and maintaining comprehensive and secure Firestore rules can be complex and requires careful planning and testing.
*   **Cold Starts (Cloud Functions):** Be aware of potential cold start latencies for infrequently used Cloud Functions and optimize where necessary.
*   **Data Modeling for NoSQL:** Careful consideration of data duplication vs. complex queries is needed for Firestore to ensure performance and scalability. Denormalization might be used strategically.
*   **React Server Components (RSC):**
    *   Relatively new technology; best practices are still evolving.
    *   Requires a compatible hosting/build environment (e.g., Next.js, or a custom setup if not using such a framework). The roadmap implies a direct React 19 usage, so this needs careful setup.
*   **Vendor Lock-in:** Heavy reliance on Firebase means a degree of vendor lock-in. This is a trade-off for the integrated services and development speed.

## 4. Key Dependencies (Conceptual)

*   **Frontend:**
    *   `react`, `react-dom`
    *   `@mui/material`, `@emotion/react`, `@emotion/styled` (for MUI)
    *   `@mui/icons-material`
    *   `zustand`
    *   Routing library (e.g., `react-router-dom`) - *Not explicitly mentioned but essential for a multi-page app.*
*   **Backend (Cloud Functions - Node.js example):**
    *   `firebase-admin` (for server-side Firebase access)
    *   `firebase-functions` (for writing Cloud Functions)
    *   Potentially other NPM packages for specific integrations (e.g., CRM SDK, email libraries like Nodemailer, CSV parsing libraries).
*   **Development:**
    *   `firebase-tools` (Firebase CLI)
    *   Linters (ESLint), Prettier, TypeScript (optional but recommended for larger projects).

## 5. Tool Usage Patterns

*   **Firebase Console:** For managing Firebase services, viewing analytics, configuring authentication, and managing Firestore data manually if needed.
*   **Firebase CLI:** For deployment, local emulation, and managing Firebase project settings programmatically.
*   **React DevTools:** Browser extension for debugging React components and state.
*   **IDE Debugger:** For stepping through both frontend and backend (Cloud Functions, if using Node.js and configured for local debugging) code.
*   **Postman / Insomnia (or similar):** For testing Cloud Function HTTP endpoints directly.
