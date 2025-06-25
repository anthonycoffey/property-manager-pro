# System Patterns: Multi-Tenant ERP-Style Web Application

## 1. System Architecture Overview

The application employs a modern web architecture with a React-based frontend and a Firebase-powered backend. It utilizes a hybrid rendering model, combining Client-Side Rendering (CSR) with React Server Components for optimal performance and user experience.

- **Frontend:**
  - **React 19:** Core library for building the user interface.
    - **Client Components:** Used for interactive elements, forms, and real-time UI updates.
    - **Server Components:** Strategically used for initial data fetching, rendering static or data-heavy sections to improve load times and reduce client-side bundle size.
  - **Material UI (MUI):** Provides a comprehensive suite of pre-built UI components, ensuring a consistent and professional look and feel.
  - **Material Icons:** Used for a wide range of vector-based icons that integrate seamlessly with Material UI.
  - **`react-select`:** Used for advanced select/dropdown functionality, such as multi-select and enhanced searchability.
  - **State Management:**
    - **React Context API:** For global state accessible by many components (e.g., user authentication status, current theme, selected organization/property within dashboard sections).
  - **Routing:** `react-router-dom` for client-side routing, including nested routes for dashboard views.
  - **Charting/Visualization:** **Highcharts** (with `highcharts-react-official`) is used for analytics and reporting features in dashboards.
  - **Data Fetching:** Primarily uses the standard Fetch API for client-side data fetching, encapsulated in service modules (e.g., `src/lib/phoenixService.ts`). The architecture is open to integrating React Query in the future.
  - **Schema Validation:** Uses `zod` for validating form inputs.

- **Backend (Firebase):** (No changes from previous version)
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Cloud Functions
  - `firestore-send-email` Extension
  - Firebase Hosting

---

## 2. Key Technical Decisions & Design Patterns

- **Role-Based Access Control (RBAC):** (No changes from previous version)

- **Data Modeling (Firestore - Multi-Tenant Structure):** (No changes from previous version)

- **API Design (Cloud Functions):** (No changes from previous version for this update, existing functions like `getAdminDashboardStats` are now called by more granular view components)

- **Frontend Navigation Pattern (New Pattern 2025-06-09):**
    - **Global Drawer Navigation:** The primary navigation within the authenticated application is handled by a global MUI `Drawer` component located in `src/components/Layout/AppBarComponent.tsx`.
    - **Dynamic Links:** Drawer links are dynamically generated based on the current user's roles (derived from Firebase Auth custom claims).
    - **Centralized Configuration:** Navigation items (text, icon, path, target roles) are defined in `src/config/navigationConfig.ts`.
    - **Routed Views:** Each navigation link points to a distinct route handled by `react-router-dom`. Content previously managed by tabs within large dashboard panels is now broken down into smaller, focused view components.
    - **Nested Routing:** Dashboard sections utilize nested routes (e.g., `/dashboard/admin/overview`, `/dashboard/organization-manager/:orgId/staff`).

- **Dashboard Layout and Context Pattern (New Pattern 2025-06-09):**
    - **Main Dashboard Layout (`src/components/Dashboard.tsx`):** Acts as the top-level layout for all authenticated views under the `/dashboard` path. It renders a `BreadcrumbsComponent` and an `<Outlet />` for child routes. It also handles redirecting users to their appropriate default view based on their role.
    - **Role-Specific Layout Panels:**
        - `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx`: Serves as a layout for all views under `/dashboard/organization-manager`. It manages the selection of the active organization (via `OrganizationSelector`) and provides `selectedOrgId` and `selectedOrganization` data through `OrgManagerContext.tsx`. It renders an `<Outlet />` for specific OM views and includes the testimonial section.
        - `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`: Serves as a layout for all views under `/dashboard/property-manager`. It manages the selection of the active property (via `PropertySelectorDropdown`) and provides `selectedPropertyId` and `selectedPropertyName` through `PropertyManagerContext.tsx`. It renders an `<Outlet />` for specific PM views and includes the testimonial section.
        - `src/components/Resident/ResidentDashboard.tsx`: Serves as a layout for all views under `/dashboard/resident`. It includes a common header and the testimonial section, rendering an `<Outlet />` for specific resident views.
    - **Context API for Scoped Data:** `OrgManagerContext` and `PropertyManagerContext` are used to provide scoped data (like selected organization or property IDs) to nested views without prop drilling.

- **Breadcrumbs Pattern (New Pattern 2025-06-09):**
    - `src/components/Layout/BreadcrumbsComponent.tsx` dynamically generates breadcrumbs based on the current route.
    - It uses `useLocation` and `navigationConfig.ts` to create a hierarchical navigation trail.
    - The "home" link in the breadcrumbs directs to the user's primary overview page for their role.
    - Breadcrumbs are displayed on all authenticated dashboard pages.

- **Initial Page Enhancement Pattern (New Pattern 2025-06-09):**
    - The initial landing/overview pages for each role (`AdminOverviewView.tsx`, `OrgManagerOverviewView.tsx`, `PropertyManagerOverviewView.tsx`, `ResidentProfileManagement.tsx`) now include a "Quick Navigation" section.
    - This section displays MUI `Card` components with icons and links (using `CardActionArea` and `RouterLink`) to other main sections available to that user, derived from `navigationConfig.ts`. This provides an alternative in-page navigation method.

- **Application Layout Wrapper (Corrected Pattern 2025-06-25):**
    - The application uses a two-level layout approach.
    - **Global Layout (`App.tsx`):** The root `App.tsx` component renders the `AppBarComponent` to ensure it is globally visible on all pages, public and private.
    - **Authenticated Layout (`MainLayout.tsx`):** A dedicated `MainLayout.tsx` is wrapped by the `ProtectedRoute`. It is responsible for the layout of authenticated pages, containing a `Container` for the main content (`Outlet`) and a full-width `Footer`. This pattern correctly separates global concerns from authenticated-only layout elements.
- **Client-Side API Service Modules:** (No changes from previous version)
- **Generic Chart Wrapper Components:** (No changes from previous version)
- **Address Autocompletion (Google Places API):** (No changes from previous version)
- **Advanced UI Components (`react-select`):** (No changes from previous version)

## 3. Component Relationships & Data Flow (Illustrative - Updated 2025-06-09)

*   **Authentication Flow:** (No significant changes to this flow itself, but the destination after login is now more dynamic due to `Dashboard.tsx` redirect logic).

*   **Dashboard Navigation & View Rendering:**
    1.  User logs in, `currentUser` object (with `customClaims.roles`) becomes available via `useAuth`.
    2.  User is typically redirected to `/dashboard` by `LoginForm` or `ProtectedRoute`.
    3.  `src/components/Dashboard.tsx` renders:
        a.  It determines the user's primary role and their first valid navigation path from `navigationConfig.ts`.
        b.  If the current path is `/dashboard`, it uses `<Navigate to={firstValidPathForRole} replace />`.
        c.  It renders `BreadcrumbsComponent.tsx`.
        d.  It renders an `<Outlet />`.
    4.  `src/routes.tsx` matches the specific path (e.g., `/dashboard/admin/overview` or `/dashboard/organization-manager/staff`).
        a.  For roles like Organization Manager or Property Manager, a layout panel (e.g., `OrganizationManagerDashboardPanel`) is rendered first. This panel sets up its specific context (e.g., `OrgManagerProvider`) and renders its own `<Outlet />`.
        b.  The final view component (e.g., `AdminOverviewView.tsx`, `OrgManagerStaffView.tsx`) is rendered within the appropriate outlet.
    5.  `src/components/Layout/AppBarComponent.tsx`'s drawer filters `navigationConfig.ts` based on `currentUser.customClaims.roles` to display relevant navigation links. Clicking a link uses `react-router-dom`'s `navigate` function.
    6.  View components (e.g., `AdminOverviewView.tsx`) may fetch their own data or, if scoped (like `OrgManagerOverviewView.tsx`), consume IDs from their respective contexts (`OrgManagerContext`, `PropertyManagerContext`) to fetch data.

*   **Dashboard Statistics Flow (Updated):**
    1.  **Frontend (e.g., `AdminOverviewView.tsx`, `OrgManagerOverviewView.tsx`):**
        a.  On component mount (or when `selectedOrgId`/`selectedPropertyId` from context changes), a `useEffect` hook triggers data fetching.
        b.  Calls the relevant Firebase Callable Function (e.g., `getAdminDashboardStats`, `getOrgManagerDashboardStats`).
        c.  (Rest of the flow for loading, error handling, and chart rendering remains similar but is now within these more granular view components).

*   (Other existing data flows like Invitation Campaign, Service Request, etc., remain largely unchanged at their core but are now initiated from or displayed within the new routed views.)

---

## 4. Scalability and Maintainability

- **Modular Design (Enhanced):** The new routed-view approach further enhances modularity. Each dashboard section is a self-contained view, making it easier to manage, test, and update independently.
- (Other points like Firebase Services, Server Components, Clear Data Models remain the same)

---

## 5. Error Handling Patterns

(No changes from previous version)

---
