# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

- **Violation Notification Links (Completed 2025-07-26):**
    - **Objective:** Add `link` and `mobileLink` to property-wide notifications for unidentified vehicle violations.
    - **Core Changes:**
        - **Backend:**
            - Modified `functions/src/callable/createViolationReport.ts` to include `link` and `mobileLink` in the `propertyNotificationData` object, pointing to the manager's violation detail page.

- **Property-Wide Notification System (Completed 2025-07-24):**
    - **Objective:** Implement a feature for property managers to create and view property-wide notifications, with an automated notification path for unidentified vehicle violations.
    - **Core Changes:**
        - **Backend:**
            - Created `functions/src/callable/createPropertyNotification.ts` to allow manual creation of notifications with optional vehicle data and violation links.
            - Modified `functions/src/callable/createViolationReport.ts` to create a property-wide notification if a reported vehicle's owner cannot be identified.
            - Updated `firestore.rules` to define access controls for the new `/properties/{propId}/notifications` collection.
        - **Frontend:**
            - Created a new UI for Property Managers at `/dashboard/property-manager/property-notifications`.
            - The view (`PropertyNotificationsView.tsx`) displays a real-time list of all notifications and includes a modal (`CreatePropertyNotificationModal.tsx`) for creating new ones.
            - Added a client-side service `src/lib/notificationsService.ts` for real-time data fetching.
            - Added a link to the new page in `navigationConfig.ts`.

- **Deprecate Violation Cloud Functions (Completed 2025-07-24):**
    - **Objective:** Deprecate `getMyViolations` and `getViolationDetails` cloud functions and replace them with client-side Firestore queries.
    - **Core Changes:**
        - Created `src/lib/violationsService.ts` to house the new client-side query logic.
        - Implemented `getMyViolations` and `getViolationDetailsById` in the new service file.
        - Refactored `src/components/Resident/MyViolationsListView.tsx` and `src/components/Resident/ViolationDetailView.tsx` to use the new service functions.
        - Deleted `functions/src/callable/getMyViolations.ts` and `functions/src/callable/getViolationDetails.ts`.
        - Removed the exports for the deprecated functions from `functions/src/index.ts`.

- **Mobile-Friendly Violation Reporting (Completed 2025-07-12):**
    - **Objective:** Enhance the "Report Violation" page to be more mobile-friendly by providing a direct camera access option.
    - **Core Changes:**
        - Modified `src/pages/PropertyManager/ReportViolationPage.tsx`.
        - Added an `IconButton` with a `PhotoCamera` icon next to the existing "Upload File" button.
        - This new button triggers a file input with the `capture="environment"` attribute, which directly opens the device's rear camera on mobile browsers.
        - The existing file upload functionality for selecting from the gallery is preserved.
        - Used an MUI `Stack` to group the buttons and the selected file name for better layout.

- **Dashboard Navigation Refactor & UI Enhancements (Completed 2025-06-09):**
    - **Objective:** Refactor tab-based dashboard navigation to a drawer-based system for improved scalability and mobile usability. Enhance user experience with breadcrumbs and improved initial page navigation.
    - **Core Changes:**
        - Replaced MUI `Tabs` in `AdminDashboardPanel.tsx`, `OrganizationManagerDashboardPanel.tsx`, `PropertyManagerDashboardPanel.tsx`, and `ResidentDashboard.tsx` with a unified drawer navigation.
        - Drawer navigation links in `src/components/Layout/AppBarComponent.tsx` are now dynamically generated from `src/config/navigationConfig.ts` based on user roles.
        - Content previously in tabs has been extracted into new, distinct routed view components (e.g., `AdminOverviewView.tsx`, `OrgManagerStaffView.tsx`, `PropertyManagerResidentsView.tsx`, `ResidentServiceRequestsView.tsx`).
        - `src/routes.tsx` updated with nested routes under `/dashboard` for these new views.
        - `src/components/Dashboard.tsx` now acts as a primary layout component rendering an `<Outlet />` and includes logic for redirecting users to their default view.
        - `OrganizationManagerDashboardPanel.tsx` and `PropertyManagerDashboardPanel.tsx` refactored to be layout components for their respective sections, providing context (`OrgManagerContext.tsx`, `PropertyManagerContext.tsx`) for `selectedOrgId` and `selectedPropertyId`.
        - `AdminDashboardPanel.tsx` and `ResidentDashboard.tsx` simplified, with `ResidentDashboard.tsx` also acting as a layout for its section.
    - **UI Enhancements:**
        - **Breadcrumbs:** Implemented `src/components/Layout/BreadcrumbsComponent.tsx`, integrated into `Dashboard.tsx` to display on all authenticated dashboard pages. Breadcrumbs show the current page context and link back to the user's main dashboard page.
        - **Initial Page Navigation:** Enhanced initial/overview pages (`AdminOverviewView.tsx`, `OrgManagerOverviewView.tsx`, `PropertyManagerOverviewView.tsx`, `ResidentProfileManagement.tsx`) with a "Quick Navigation" section (using MUI `Card`s) linking to other relevant sections for the user's role.
        - **Testimonial Sections:** Reinstated testimonial sections in `PropertyManagerDashboardPanel.tsx` and `ResidentDashboard.tsx` (now layout components), appearing below the main page content.
        - **Layout Consistency:** Ensured new UI elements and refactored views utilize MUI `Box` and `Stack` for layout, adhering to project preferences over `Grid`.
        - **Resident Default Page:** Updated `navigationConfig.ts` to make "My Profile" the default landing page for residents.
        - Corrected `phoneNumber` to `phone` in `ResidentProfileManagement.tsx` to align with type definitions.

- **Previous Focus (Completed before 2025-06-09):**
    - Resident Profile Vehicle Information Update.
    - Dashboard Data Visualizations & Statistics - Phase 1 (Non-Phoenix Data).
    - Login Page Accessibility.
    - Twilio "Request Call" Integration.
    - Phoenix Integration - Service Request Form Submission (Initial Phase).
    - Service Request Form Phone Pre-population (Completed 2025-06-10): Enhanced phone number pre-population in `CreateServiceRequestForm.tsx` to use `currentUser.phoneNumber` as a fallback if `residentProfileData.phone` is unavailable.
    - Service Request Form Auto-select First Vehicle (Completed 2025-06-10): Added functionality to `CreateServiceRequestForm.tsx` to automatically select the first vehicle from the resident's profile if vehicles are present and no vehicle is already selected.

## 2. Recent Changes & Activities (Newest First)

- **ESLint Fixes (Completed 2025-07-25):**
    - **Objective:** Resolve outstanding ESLint errors in the notifications feature.
    - **Change:**
        - Modified `src/components/PropertyManager/Notifications/CreatePropertyNotificationModal.tsx` to use the `isAppError` type guard for safer error handling.
        - Modified `src/components/PropertyManager/Notifications/PropertyNotificationsView.tsx` to remove an unused state variable (`firstVisible`).
    - **Details:** This improves code quality and adheres to project best practices for type safety and cleanliness.

- **Violation Notification Links (Completed 2025-07-26):**
    - **Objective:** Add `link` and `mobileLink` to property-wide notifications for unidentified vehicle violations.
    - **Change:** Modified `functions/src/callable/createViolationReport.ts`.
    - **Details:** Added `link` and `mobileLink` to the notification data for unidentified vehicle violations, directing managers to the specific violation details page.

- **Property-Wide Notification System (Completed 2025-07-24):**
    - **Objective:** Implement a feature for property managers to create and view property-wide notifications.
    - **Change:** Created a new callable function, modified `createViolationReport`, updated Firestore rules, and built a new UI for property managers.
    - **Details:**
        - The new `createPropertyNotification` function allows managers to manually create notifications with an optional license plate.
        - The `createViolationReport` function now posts a public notification to the property's notification feed if the vehicle's owner is unknown, linking it to the violation report.
        - A new page was created for property managers to view these notifications and create new ones, accessible via the main navigation.

- **FCM Token Logic Update for Multi-Tenancy (Completed 2025-07-21):**
    - **Objective:** Align the `updateFcmToken` cloud function with the application's multi-tenant Firestore structure.
    - **Change:** Modified `functions/src/callable/updateFcmToken.ts`.
    - **Details:**
        - The function now requires `organizationId`, `role`, and an optional `propertyId` to be passed from the client.
        - It dynamically constructs the path to the user's profile based on their role.
        - For residents, the path is `organizations/{orgId}/properties/{propId}/residents/{userId}`.
        - For staff (e.g., property managers), the path is `organizations/{orgId}/users/{userId}`.
        - This ensures FCM tokens are saved to the correct, tenant-specific user document.

- **Deprecate Violation Cloud Functions (Completed 2025-07-24):**
    - **Objective:** Replace `getMyViolations` and `getViolationDetails` cloud functions with client-side queries.
    - **Change:** Created `src/lib/violationsService.ts` and updated related components.
    - **Details:**
        - The new `getMyViolations` service function queries violations where `residentId` matches the user's UID.
        - The new `getViolationDetailsById` service function includes a security check to ensure the user is either the `residentId` or `reporterId`.
        - This change improves performance by reducing cloud function invocations and simplifies the backend.
        - Corrected documentation to reflect the use of `reporterId` for tracking who reported a violation.

- **Mobile-Friendly Violation Reporting (Completed 2025-07-12):**
    - **Objective:** Enhance the "Report Violation" page to be more mobile-friendly by providing a direct camera access option.
    - **Change:** Modified `src/pages/PropertyManager/ReportViolationPage.tsx`.
    - **Details:**
        - Added an `IconButton` with a `PhotoCamera` icon to allow users to directly open their device camera for taking violation photos.
        - The new input uses `capture="environment"` to signal the use of the rear-facing camera.
        - The original "Upload File" button is retained for gallery selections.
        - Both inputs use the same `handlePhotoChange` handler.
        - Grouped the upload buttons and file name display in an MUI `Stack` for cleaner alignment.

- **Dynamic Card Headers & Conditional Layout (Completed 2025-06-25):**
    - **Objective:** Update dashboard panels to show dynamic titles/icons and conditionally render layouts for specific routes.
    - **Change:** Modified `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`.
    - **Details:**
        - Implemented a dynamic `CardHeader` that displays the title and icon from `navigationConfig.ts` based on the current route.
        - Added a conditional check to provide a full-screen view for the AI Assistant (`/dashboard/property-manager/ai-assistant`) by rendering its content outside the main `Card` wrapper, allowing it to take up the full content area. Other routes retain the card-based layout.

- **Resident Testimonial Refactor (Completed 2025-06-15):**
    - **Objective:** Refactor the static testimonial section into a reusable, theme-aware slider component.
    - **Change:** Created `src/components/Resident/ResidentReviewSlider.tsx` and updated `src/components/Resident/ResidentDashboard.tsx`.
    - **Details:**
        - Created a new `ResidentReviewSlider` component to display testimonials in a "Google Reviews" style slider.
        - The component is built with MUI components (`Card`, `Avatar`, `Rating`, etc.) and is fully theme-aware.
        - Implemented a custom slider using `useState` and `IconButton` to avoid new dependencies.
        - Replaced the old static testimonial layout in `ResidentDashboard.tsx` with the new slider component.

- **AppBar Layout Refactor (Completed 2025-06-15):**
    - **Objective:** Refactor the `AppBarComponent` to a more conventional left-drawer oriented design.
    - **Change:** Modified `src/components/Layout/AppBarComponent.tsx`.
    - **Details:** Moved the drawer-toggling `MenuIcon` to the far-left of the `AppBar`. Centered the application logo and title. Removed the redundant user avatar trigger from the `AppBar`, as the user's profile is already in the drawer. The right side of the `AppBar` now only contains the `Notifications` component.
- **Demo Page Enhancement (Completed 2025-06-14):**
    - **Objective:** Extend the MUI component showcase page with more helper and overlay components.
    - **Change:** Modified `src/pages/DemoPage.tsx`.
    - **Details:** Added a new "Helpers & Overlays" section featuring demonstrations of `Popover`, `Backdrop`, and `Popper` components. Also enhanced the existing `Tooltip` examples to show different placements and usage with disabled elements. Replaced `Grid` with `Stack` for layout in this new section to resolve TypeScript errors and align with project patterns.
- **Service Request Form Auto-select First Vehicle (Completed 2025-06-10):**
    - Modified `src/components/Resident/CreateServiceRequestForm.tsx`.
    - Added a new `useEffect` hook that triggers when `residentProfileData` or `selectedVehicle` changes.
    - If `residentProfileData.vehicles` exists, is not empty, and no vehicle is currently selected (`selectedVehicle` is null), the hook sets `selectedVehicle` to the first vehicle in the `residentProfileData.vehicles` array.
- **Service Request Form Phone Pre-population (Completed 2025-06-10):**
    - Modified `src/components/Resident/CreateServiceRequestForm.tsx`.
    - Updated the `useEffect` hook that sets initial form values (name, email, phone) to check `currentUser.phoneNumber` from Firebase Auth if `residentProfileData.phone` (from Firestore) is not present. This improves the likelihood of pre-filling the phone number.
- **Dashboard Navigation Refactor & UI Enhancements (Completed 2025-06-09):**
    - Details as listed in "Current Work Focus" above.
    - Key files created/modified:
        - `src/config/navigationConfig.ts` (updated resident link order)
        - `src/components/Layout/AppBarComponent.tsx` (updated drawer logic)
        - `src/routes.tsx` (major restructuring for nested dashboard routes)
        - `src/components/Dashboard.tsx` (refactored to layout, added breadcrumbs, redirect logic)
        - `src/contexts/OrgManagerContext.tsx` (new)
        - `src/contexts/PropertyManagerContext.tsx` (new)
        - `src/components/Layout/BreadcrumbsComponent.tsx` (new)
        - New view components created in `src/components/Dashboard/*/[RoleName]/` directories.
        - Existing dashboard panels (`AdminDashboardPanel.tsx`, `OrganizationManagerDashboardPanel.tsx`, `PropertyManagerDashboardPanel.tsx`, `ResidentDashboard.tsx`) refactored.
        - Overview/initial pages (`AdminOverviewView.tsx`, `OrgManagerOverviewView.tsx`, `PropertyManagerOverviewView.tsx`, `ResidentProfileManagement.tsx`) enhanced with navigation cards and layout updates.

- **Resident Profile - Vehicle Information Update (Completed 2025-06-04):** (Details as previously listed)
- **Dashboard Data Visualizations & Statistics - Phase 1 (Non-Phoenix Data) (Completed 2025-06-03):** (Details as previously listed)
- **Login Page Accessibility (Completed 2025-06-03):** (Details as previously listed)
- **Twilio "Request Call" Integration (Completed 2025-06-03):** (Details as previously listed)
- **Phoenix API Integration - Service Request Form Submission (Completed 2025-06-02):** (Details as previously listed)

## 3. Next Steps

1.  **Test Resident Review Slider:**
    *   Verify the slider works correctly in both light and dark modes.
    *   Check for responsiveness on different screen sizes.
2.  **Thorough Testing of New Navigation & UI:**
    *   Verify all drawer links for all user roles.
    *   Test breadcrumb accuracy and navigation.
    *   Test navigation cards on overview pages.
    *   Check layout responsiveness on different screen sizes.
    *   Confirm context providers (`OrgManagerContext`, `PropertyManagerContext`) are working correctly for views that depend on `selectedOrgId` or `selectedPropertyId`.
2.  **Dashboard Data Visualizations & Statistics - Phase 1.C (Phoenix API Integration):** (As previously listed)
3.  **Phoenix Integration - Remaining Core Tasks:** (As previously listed)
4.  **Review and Refine Denormalization for Dashboard Stats:** (As previously listed)

## 4. Active Decisions & Considerations

- **Navigation Structure (New Decision 2025-06-09):**
    - Shifted from tab-based navigation within monolithic dashboard panels to a global drawer navigation (`AppBarComponent.tsx`) linking to distinct, routed views.
    - Centralized navigation link definitions in `navigationConfig.ts`.
    - Implemented nested routing under `/dashboard` for role-specific views.
- **Context Providers for Scoped Data (New Decision 2025-06-09):**
    - Introduced `OrgManagerContext` and `PropertyManagerContext` to manage and provide `selectedOrgId` and `selectedPropertyId` (and related data like names) to child views, simplifying prop drilling.
- **Breadcrumbs for Navigation Context (New Decision 2025-06-09):**
    - Added a `BreadcrumbsComponent` to provide users with clear path context within the dashboard sections.
- **Initial Page Enhancements (New Decision 2025-06-09):**
    - Overview/initial landing pages for each role now include "Quick Navigation" cards/links to other relevant sections for that role.
- **Layout Components (Reinforced 2025-06-09):**
    - Consistently used MUI `Box` and `Stack` with `sx` props for layout in new and refactored components, avoiding `Grid` as per project preference.
- **Dashboard Statistics Aggregation Strategy (Decision 2025-06-03):** (As previously listed)
- **Charting Library (Decision 2025-06-03):** (As previously listed)

## 5. Important Patterns & Preferences

- **Routed Views for Dashboard Sections (New Pattern 2025-06-09):**
    - Each major section/feature previously in a dashboard tab is now its own component rendered via a specific route.
- **Layout Components for Role Dashboards (New Pattern 2025-06-09):**
    - `Dashboard.tsx` acts as the top-level layout for all authenticated views.
    - `OrganizationManagerDashboardPanel.tsx`, `PropertyManagerDashboardPanel.tsx`, and `ResidentDashboard.tsx` now serve as specific layout wrappers for their respective roles, handling context provision (for OM/PM) and common UI elements like headers or testimonial sections.
- **Centralized Navigation Configuration (New Pattern 2025-06-09):**
    - `navigationConfig.ts` defines all drawer navigation links, their properties, and role visibility.
- **Context API for Shared State in Scoped Views (New Pattern 2025-06-09):**
    - Using React Context (`OrgManagerContext`, `PropertyManagerContext`) to share state like selected organization/property ID across multiple views within a role's section.
- **Generic Chart Wrapper Components (Pattern 2025-06-03):** (As previously listed)
- **Modular Component Design:** (As previously listed)

## 6. Learnings & Project Insights

- **Impact of Routing on Component Structure (New Insight 2025-06-09):**
    - Refactoring to a route-per-view model significantly changes how components are structured and how data/state (like selected organization/property) needs to be passed or made available (e.g., via context or route params).
- **Importance of Context Providers for Nested Routes (New Insight 2025-06-09):**
    - When a parent route element sets up a context (e.g., `PropertyManagerDashboardPanel` providing `PropertyManagerContext`), child routes rendered via `<Outlet />` can easily consume this context, avoiding complex prop drilling.
- **Dynamic Breadcrumb Generation (New Insight 2025-06-09):**
    - `useLocation` and a mapping configuration (like `navigationConfig.ts`) can be effectively used to create dynamic and meaningful breadcrumbs.
- **Firestore Indexing for Aggregation (Insight 2025-06-03):** (As previously listed)
- **Robustness of Cloud Function Inputs (Insight 2025-06-03):** (As previously listed)
