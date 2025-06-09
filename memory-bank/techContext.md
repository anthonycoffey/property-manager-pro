# Tech Context: Multi-Tenant ERP-Style Web Application

## 1. Core Technologies

### Frontend
*   **React 19:**
    *   **Client Components:** For interactivity.
    *   **Server Components:** For performance and server-side data fetching.
*   **Material UI (MUI):** UI component library for Material Design.
*   **Material Icons:** Vector icons.
*   **Routing:** `react-router-dom` for client-side navigation, including nested routes for dashboard layouts and views.
*   **State Management:**
    *   **React Context API:** Used for global state (e.g., user authentication status via `AuthProvider`, current theme via `ThemeProvider`) and for scoped state within dashboard sections (e.g., `OrgManagerContext` for selected organization, `PropertyManagerContext` for selected property).
    *   **React Hooks:** Local component state.
*   **Data Fetching (Client-Side):** Standard Fetch API. Client-side service modules (e.g., `src/lib/phoenixService.ts`) are used to encapsulate API calls. Server-side data fetching via Server Components is preferred where applicable.
*   **Charting/Visualization:** Highcharts for displaying analytics and reports.
*   **Advanced Select/Dropdowns:** `react-select` for features like multi-select, search, and custom styling.
*   **Address Autocompletion:** Google Places API. Uses `@react-google-maps/api`'s `useJsApiLoader` for script loading, then directly utilizes `google.maps.places.AutocompleteService` and `google.maps.Geocoder` with MUI `Autocomplete` component for UI.
*   **Schema Validation (Frontend):** `zod` for validating form inputs.
*   **Build Tool:** Vite. Standard Node.js/npm ecosystem.

### Backend
*   **Firebase:**
    *   **Firebase Authentication:** User management, RBAC via custom claims.
    *   **Cloud Firestore:** NoSQL database.
    *   **Firebase Cloud Functions:** Server-side logic, API.
    *   **Firebase Storage:** File uploads.
    *   **Firebase Hosting:** Static asset hosting, CDN.
    *   **`firestore-send-email` Extension:** Templated emails.

## 2. Development Setup & Environment

(No changes from previous version for this update)

## 3. Technical Constraints & Considerations

(No changes from previous version for this update, though the increased use of nested routes and context might warrant future consideration for performance profiling in complex scenarios)

## 4. Key Dependencies (Conceptual)

*   **Frontend:**
    *   `react`, `react-dom`
    *   `react-router-dom` (for routing)
    *   `@mui/material`, `@emotion/react`, `@emotion/styled` (for MUI)
    *   `@mui/icons-material`
    *   `@react-google-maps/api`
    *   `react-select`
    *   `qrcode.react`
    *   `zod`
    *   `highcharts`, `highcharts-react-official`
*   **Backend (Cloud Functions - Node.js example):** (No changes from previous version)
*   **Development:** (No changes from previous version)

## 5. Tool Usage Patterns

(No changes from previous version, but the preference for `Box` and `Stack` over `Grid` for layout has been actively applied in recent refactoring)
