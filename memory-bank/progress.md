# Progress: Multi-Tenant ERP-Style Web Application

## 1. Current Status: RBAC & Firestore Implementation (As of 2025-05-23)

The project has recently completed the backend and initial frontend (for Property Managers) of the "Resident Invitation Campaigns" feature. This includes CSV bulk import, public link/QR code generation, and associated Cloud Functions and Firestore structures.

- **Date of this update:** 2025-05-30

## 2. What Works / Completed

- **Resident Invitation Campaigns (Backend & Initial Frontend for PMs) - 2025-05-29:**
  - **Concept:** "Campaigns" system for CSV bulk imports and Public Link/QR code resident invitations, with usage limits and expiry.
  - **Backend:**
    - Firestore rules for `campaigns` subcollection.
    - `createCampaign` (v1 Callable): Creates campaigns, processes CSVs from Firebase Storage. For public links, now generates a frontend URL (e.g., `/join-public-campaign?campaign=...`) and stores the campaign's document ID in an `id` field (e.g. `id: campaignRef.id`) within the document data.
    - `processPublicCampaignLink` (v1 Callable - New): Handles validation of public campaign links by querying the `campaigns` collection group using `where('id', '==', campaignIdFromUrl)` and `where('status', '==', 'active')`. Creates invitation documents. Triggered by a frontend handler page.
    - `handleCampaignSignUpLink` (v1 HTTP - Decommissioned for public link flow): Previously handled direct public links; its functionality is now replaced by `processPublicCampaignLink` and a frontend handler.
    - `signUpWithInvitation` (v2 Callable): Updated to increment campaign counters and update status.
    - `cleanupProcessedCampaignCSVs` (v2 Scheduled): Daily cleanup of old CSVs from Firebase Storage (`campaign_csvs_processed/`, `campaign_csvs_failed/`).
  - **Frontend (Property Manager Scope):**
    - Type definitions: `Campaign`, `CampaignStatus`, `CampaignType` in `src/types/index.ts`.
    - `CreateCampaignModal.tsx`: Modal for PMs to create campaigns (CSV or Public Link), handles CSV upload to Storage, calls `createCampaign` function, displays QR/link.
    - `CampaignsTable.tsx`: Displays list of campaigns for a property with real-time updates.
    - `PropertyCampaignsView.tsx`: Container for campaign creation and table.
  - Integrated into `PropertyManagerDashboardPanel.tsx` via a new "Campaigns" tab with property selection.
  - **Dependencies:** `csv-parse` (functions), `@types/express` (functions), `qrcode.react` (frontend).
- **Campaign Reactivation Feature - 2025-05-29:**
  - **Backend:** Created `activateCampaign` Cloud Function (`functions/src/callable/activateCampaign.ts`) to change an 'inactive' campaign's status to 'active'. Includes permission checks similar to `deactivateCampaign`. Exported in `functions/src/index.ts`.
  - **Frontend:**
    - Added `ActivateCampaignData` type to `src/types/index.ts` and `functions/src/types.ts`.
    - Created `src/components/PropertyManager/Campaigns/ConfirmActivateCampaignDialog.tsx` for user confirmation.
    - Updated `src/components/PropertyManager/Campaigns/CampaignsTable.tsx`:
      - Added a "Reactivate" button/menu item for inactive campaigns.
      - Integrated the `ConfirmActivateCampaignDialog`.
      - Calls the `activateCampaign` Cloud Function.
      - Implemented Snackbar notifications for actions.
    - Updated the confirmation text in `src/components/PropertyManager/Campaigns/ConfirmDeactivateCampaignDialog.tsx` to reflect that deactivation is reversible.
- **Campaign Management UI for Organization Managers & Admins (Completed 2025-05-30):**
    - Implemented `src/components/OrganizationManager/Campaigns/OrgManagerCampaignsView.tsx` providing Organization Managers with UI to manage resident invitation campaigns for properties within their assigned organizations. This includes appropriate organization and property selectors.
    - Implemented `src/components/Admin/Campaigns/AdminCampaignsView.tsx` providing Admins with a global UI to view and manage resident invitation campaigns across all organizations. This includes appropriate organization and property selectors.
*   **Campaign Table Actions & View Details Page (Frontend & Backend) - 2025-05-30:**
    *   The `CampaignsTable.tsx` component now includes fully functional actions in its row menu:
        *   **Edit:** Opens `EditCampaignModal.tsx` for modifying campaign details (calls `updateCampaign` Cloud Function).
        *   **Deactivate:** Uses `ConfirmDeactivateCampaignDialog.tsx` (calls `deactivateCampaign` Cloud Function).
        *   **Reactivate:** (Completed 2025-05-29) Uses `ConfirmActivateCampaignDialog.tsx` (calls `activateCampaign` Cloud Function).
        *   **Delete:** Uses `ConfirmDeleteCampaignDialog.tsx` for inactive campaigns (calls `deleteCampaign` Cloud Function).
        *   **View Details:** Navigates to a page (e.g., `/campaigns/{campaignId}`) showing campaign details, including accepted residents.
    *   Includes UI for permission checks and Snackbar notifications.
    *   Corresponding Cloud Functions (`updateCampaign.ts`, `deactivateCampaign.ts`, `deleteCampaign.ts`) are implemented in `functions/src/callable/`.
- **Project Definition:**
  - `projectRoadmap.md` has been reviewed and serves as the primary guide for development. (Note: Current version of `projectRoadmap.md` details up to Admin Dashboard features).
- **Core Memory Bank Documentation Established:**
  - `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md` are established and updated.
- **Authentication Redirection Implemented:** Configured `src/components/LoginForm.tsx` and `src/components/SignupForm.tsx` to redirect users to the `/dashboard` page upon successful login or registration.
- **RBAC and Firestore Implementation Plan Documented:** Created `docs/02-rbac-firestore-implementation.md` detailing the comprehensive plan for multi-tenant RBAC and Firestore integration.
- **Phase 1: Firebase Project Setup & Initial Firestore Structure:**
  - Confirmed Firebase project initialization and Firestore enablement.
- **Phase 2: Firebase Authentication & Custom Claims:**
  - **Updated `processSignUp` Cloud Function (`functions/src/auth/processSignUp.ts`) (Behavior Clarified 2025-05-27):**
    - This `onCreate` auth trigger correctly identifies Super Admin users (based on email domain/list), sets their `roles: ['admin']` custom claim, and creates their profile in the `admins` Firestore collection.
    - For all other non-Super-Admin users, this function _intentionally does not_ set any default custom claims or create Firestore profiles. It defers all claim-setting and profile creation for invited users to the specific callable invitation functions to prevent race conditions. This supersedes previous notes about it setting `pending_association` roles.
  - Updated `src/hooks/useAuth.ts` and `src/providers/AuthProvider.tsx` to fetch and expose custom claims, including `organizationIds` for multi-org roles.
- **RBAC Enhancement (Super Admin & Organization Manager - 2025-05-26):**
  - Clarified existing `admin` role as "Super Admin" with global system access.
  - Introduced new `organization_manager` role for managing one or more specific organizations.
    - Custom claims: `roles: ['organization_manager']`, `organizationIds: ["orgId1", "orgId2", ...]`.
  - Updated `functions/src/callable/createInvitation.ts` to allow Admins to invite `organization_manager`s.
  - Created new `functions/src/callable/addOrganizationToManager.ts` Cloud Function for Admins to assign existing `organization_manager`s to additional organizations.
  - Updated `functions/src/index.ts` to export the new Cloud Function.
  - Created `docs/organizationManagerInvitation.json` email template.
- **Phase 3: Firestore Security Rules:**
  - Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`.
  - **Removed rules for the root `/users` collection** as it's no longer used for `pending_association` profiles (2025-05-24).
  - Updated `firestore.rules` (2025-05-26) to:
    - Grant Super Admins (`admin` role) broad/global access.
    - Scope `organization_manager` access based on their `request.auth.token.organizationIds` array claim using the `in` operator.
    - Added helper functions `isOrganizationManager()` and `isOrgManagerForOrg(orgId)`.
- **Phase 4: Frontend Integration & UI Adaptation:**
  - Updated `src/hooks/useAuth.ts` and `src/providers/AuthProvider.tsx` to include `organizationIds` in the auth context (2025-05-26).
  - Updated `src/components/ProtectedRoute.tsx` to correctly handle route protection for `organization_manager` role using `organizationIds` (2025-05-26).
  - Updated `src/components/Dashboard.tsx` to conditionally render a new `OrganizationManagerDashboardPanel.tsx` for the `organization_manager` role (2025-05-26).
  - Created `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx` with basic structure, including an organization selector for multi-org managers, and integrated `OrgScopedPropertyManagerManagement` for PM management within the selected org (2025-05-26).
  - Created `src/components/OrganizationManager/OrgScopedPropertyManagerManagement.tsx` (2025-05-26).
  - Updated `src/components/Dashboard/AdminDashboardPanel.tsx` with a new "Organization Managers" tab, integrating `InviteOrganizationManagerForm` and `AssignOrgToManagerForm` (2025-05-26).
  - Created `src/components/Admin/InviteOrganizationManagerForm.tsx` (2025-05-26).
  - Created `src/components/Admin/AssignOrgToManagerForm.tsx` for assigning existing Organization Managers to additional organizations (2025-05-26).
- **Phase 5 (Partial): Initial Feature Development (Admin Dashboard - Property Manager CRUD):**
  - Created `src/components/Admin` directory and `src/components/Admin/PropertyManagerManagement.tsx` component.
  - Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions (now in `functions/src/callable/`).
  - Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
- **Resolved Authentication Race Condition (2025-05-23):**
  - Successfully investigated and fixed a race condition in `src/providers/AuthProvider.tsx`.
  - The fix involved refactoring `AuthProvider.tsx` to use a two-stage `useEffect` approach for robust management of loading and user authentication states.
  - `ProtectedRoute.tsx` was restored to its full functionality.
- **Multi-Tenancy Sign-Up Logic Refined (2025-05-24):**
  - **`processSignUp` Cloud Function (`functions/src/auth/processSignUp.ts`) (Behavior Clarified 2025-05-27):**
    - Super Admin users (`*@24hrcarunlocking.com` or specific emails) get `admin` roles and profiles in `admins/{uid}`.
    - For all other users (including direct sign-ups not matching admin criteria), **no Firestore profile is created by this function, and no default claims are set.** This task is deferred to invitation-specific functions.
  - **`signUpWithInvitation` HTTPS Callable Cloud Function (`functions/src/callable/signUpWithInvitation.ts`):**
    - Remains the authority for invited user sign-ups (PM, Resident, and can handle OM if called by generic page).
    - Sets final custom claims (overwriting any defaults from `processSignUp`).
    - Creates user profiles directly in the correct multi-tenant Firestore paths (e.g., `organizations/{orgId}/users/{uid}` or `organizations/{orgId}/properties/{propId}/residents/{uid}`).
- **Invitation System Implementation (Phase 1 - Backend & Core UI) (2025-05-23):**
  - **Documented Plan:** Created `docs/03-invitation-system-plan.md`.
  - **Cloud Functions (now in `functions/src/callable/`):**
    - `createInvitation.ts`
    - `createProperty.ts`
  - **Firestore Security Rules (`firestore.rules`):** Updated rules for `organizations/{orgId}/invitations` subcollection.
  - **Email Templates (JSON in `docs/`):**
    - Created `docs/propertyManagerInvitation.json`.
    - Created `docs/residentInvitation.json`.
  - **UI Components (React Forms):**
    - Created `src/components/Admin/InvitePropertyManagerForm.tsx`.
    - Created `src/components/PropertyManager/CreatePropertyForm.tsx`.
    - Created `src/components/PropertyManager/InviteResidentForm.tsx`.
  - **TypeScript Fixes:** Resolved issues with `currentUser` property access in new forms. Addressed MUI `Grid` `item` prop usage.
- **Invitation System (Phase 2 - Dynamic Templates & UI Integration) (2025-05-23):**
  - **Dynamic Email Templates:**
    - Updated `createInvitation.ts` Cloud Function to use dynamic `appDomain`, `appName`, and `inviterName`.
    - Updated email template JSON files with placeholders.
  - **Dashboard Integration (`src/components/Dashboard.tsx`):**
    - Integrated invitation forms into Admin and Property Manager sections using MUI Tabs.
  - **Accept Invitation Page (`src/pages/AcceptInvitationPage.tsx`):**
    - Created page to handle invitation tokens, display sign-up form, and call `signUpWithInvitation`.
  - **Routing (`src/routes.tsx`):**
    - Added `/accept-invitation` route.
  - **TypeScript Refinements (Cloud Functions):**
    - Added specific interfaces for data types in Cloud Functions.
- **Admin Property Manager Management Panel Overhaul (Step 4 from `docs/04-admin-pm-management-plan.md`) (2025-05-24):**
  - **Phase 0: Organization Context Switcher:**
    - Created and integrated `src/components/Admin/OrganizationSelector.tsx`.
  - **Phase 1: Backend Adjustments:**
    - Implemented `revokeInvitation` Cloud Function (in `functions/src/callable/revokeInvitation.ts`).
  - **Phase 2 & 3: Frontend UI/UX Overhaul (`src/components/Admin/PropertyManagerManagement.tsx`):**
    - Implemented organization-scoped list for active PMs and pending invitations with actions.
- **Admin Dashboard - Organization Management Panel Implemented (2025-05-24):**
  - Enhanced `src/components/Admin/OrganizationManagementPanel.tsx` for organization CRUD.
- **Firebase Functions Refactoring (2025-05-24):**
  - All Cloud Functions refactored into individual files under `functions/src/auth/` and `functions/src/callable/`.
  - Shared utilities in `functions/src/firebaseAdmin.ts` and `functions/src/helpers/handleHttpsError.ts`.
  - Main `functions/src/index.ts` re-exports functions.
  - Added `updateOrganization.ts` and `deactivateOrganization.ts` callables.
- **Admin Invite Property Manager Form Enhancement (2025-05-24):**
  - Modified `src/components/Admin/InvitePropertyManagerForm.tsx` to use `selectedOrganizationId` prop.
- **Social Sign-On for Accept Invitation Page (2025-05-24):**
  - Enhanced `src/pages/AcceptInvitationPage.tsx` with social sign-on.
  - Modified `functions/src/callable/signUpWithInvitation.ts` to handle pre-authenticated users.
- **Accept Invitation Page Enhancements (Readonly Email & Pre-fill) (2025-05-24):**
  - Added `getInvitationDetails.ts` Cloud Function.
  - Updated `src/pages/AcceptInvitationPage.tsx` to pre-fill and disable email field.
- **Property Manager Dashboard - Dynamic Property Selection for Resident Invitations (2025-05-24):**
  - Implemented `src/components/PropertyManager/PropertyManagerPropertiesList.tsx`.
  - Integrated into `src/components/Dashboard.tsx` for dynamic property selection in resident invites.
- **Property Manager Panel UI/UX Refactor (2025-05-24):**
  - Refactored the Property Manager section in `src/components/Dashboard.tsx`:
    - Panel title now displays the fetched Organization Name.
    - Removed the "Create Property" tab; property creation is now handled via a "Create Property" button opening a modal containing `CreatePropertyForm.tsx`.
    - `CreatePropertyForm.tsx` updated with an `onSuccess` callback for modal closure.
    - The "Invite Resident" tab now embeds `PropertyManagerPropertiesList` for clear property selection before inviting.
    - The "My Properties" tab continues to list properties.
  - This aligns with Admin panel patterns and improves UX for property creation and resident invitation.
- **Property Manager Panel Enhancements (Table Display & Dropdown Selector - 2025-05-24):**
  - **`PropertyManagerPropertiesList.tsx`:** Refactored to display properties in an MUI `Table` with "Property Name" and formatted "Address" columns.
  - **New `PropertySelectorDropdown.tsx`:** Created to provide a dedicated MUI `Select` dropdown for choosing a property (displays Name and Address); its callback now provides both property ID and name.
  - **`Dashboard.tsx` (Property Manager Panel):**
    - "My Properties" tab now uses the table-based `PropertyManagerPropertiesList.tsx`.
    - "Invite Resident" tab now uses the new `PropertySelectorDropdown.tsx` for property selection. The `Divider` between the dropdown and the form was removed for a unified look. State variables for selected property ID/name were renamed for clarity (e.g., `selectedPropertyId`).
  - **`InviteResidentForm.tsx`:**
    - Title now displays the selected property's name instead of ID.
    - Layout updated to place the email input and "Send Invitation" button on the same row.
  - These changes further refine the UI/UX based on feedback, improving clarity and consistency.
- **Google Places API Autocomplete Refactor for Property Address (2025-05-25):**
  - Refactored address autocompletion in property creation and editing forms to use the recommended `google.maps.places.PlaceAutocompleteElement` (Web Component) due to deprecation notices for the legacy `Autocomplete` for new customers.
  - The `@react-google-maps/api` library's `LoadScript` component is still used to load the Google Maps JavaScript API.
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx`.
  - Implemented `useEffect` hooks to dynamically create, append, style, and manage the `PlaceAutocompleteElement` within a `div` container.
  - The `PlaceAutocompleteElement` now provides the street address input and suggestions.
  - On selecting an address via the `gmp-select` event, the form's state for street, city, state (short code), and zip code is populated.
  - Ensured state selection dropdowns remain consistent with short codes.
  - Maintained documentation for the `VITE_GOOGLE_MAPS_API_KEY` environment variable.
- **Create Property Form Simplification & Backend Alignment (2025-05-25):**
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx`:
    - Removed City, State, and Zip Code fields from the form UI.
    - Renamed the "Street Address" label to "Address".
    - The form now only captures and sends the full street address.
  - Updated `functions/src/callable/createProperty.ts`:
    - The Cloud Function now expects an `address` object containing only `{ street: string }`.
    - The property document in Firestore will store `address: { street: "..." }` for new properties.
  - Updated `memory-bank/systemPatterns.md` to reflect this change in the property's `address` data model.
- **Google Places Autocomplete Styling and UX Enhancements (2025-05-25):**
  - Improved input field styling for `PlaceAutocompleteElement` in `CreatePropertyForm.tsx` and `EditPropertyModal.tsx` to align with MUI `TextField` appearance using theme variables.
  - Changed "Street Address" label to "Address" in `EditPropertyModal.tsx` for consistency.
  - Added global CSS in `src/index.css` to set a higher `z-index` for the `.pac-container` (autocomplete suggestions list) to ensure it displays correctly over MUI modals.
- **Admin Dashboard - Organization Management Panel UI Enhancement (2025-05-25):**
  - Updated `src/components/Admin/OrganizationManagementPanel.tsx` to display organization status using MUI `Chip` components. The chip label is now correctly Capitalized (Title Case, e.g., "Active"). This provides better visual feedback (e.g., "active" as green, "inactive" as red).
  - The `createdAt` column in the same panel was updated to show both date and time (`toLocaleString()`) and is now center-aligned for improved readability.
- **Dashboard Component Refactor (2025-05-25):**
  - Refactored `src/components/Dashboard.tsx` to improve maintainability and readability.
  - Extracted Admin-specific UI and logic into `src/components/Dashboard/AdminDashboardPanel.tsx`.
  - Extracted Property Manager-specific UI and logic into `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`.
  - The main `Dashboard.tsx` now conditionally renders these panels or `ResidentDashboard` based on user roles.
  - All code comments were removed from `Dashboard.tsx`, `AdminDashboardPanel.tsx`, and `PropertyManagerDashboardPanel.tsx` as per user request.
  - Resolved a TypeScript error related to the `organizationId` prop in `Dashboard.tsx`.
- **Firestore Rules Update (2025-05-25):**
  - Modified `firestore.rules` to allow residents to read the specific property document (`/organizations/{orgId}/properties/{propId}`) they are associated with, based on their custom claims.
- **Theme Persistence in localStorage (2025-05-27):**
  - Updated `src/providers/ThemeProvider.tsx` to save the current theme mode (light/dark) to `localStorage`.
  - The theme now initializes by reading from `localStorage` first, then falling back to system preference if no stored value is found.
  - User's explicit toggle of the theme mode overrides system preference and is persisted.
- **Organization Manager Dashboard Panel Refactor (2025-05-28):**
  - Combined the two main `Paper` components in `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx` into a single `Paper` component.
  - The `OrgScopedPropertyManagerManagement` component is now rendered within the main `Paper` component, maintaining visual spacing with a `Box` and `marginTop`.
- **Admin Organization Manager Assignment Feature (2025-05-28):**
  - **Backend Cloud Functions:**
    - Updated `signUpWithOrgManagerInvitation.ts`, `addOrganizationToManager.ts`, and `createOrganization.ts` to denormalize and store an `assignedOrganizationIds: string[]` field in the Organization Manager's profile within the root `admins` collection. This array mirrors their custom claims.
    - Created `assignOrganizationToManagerAdmin.ts`: Callable function for Super Admins to assign an organization to an OM. Updates claims, the `admins` profile (`assignedOrganizationIds`), and the OM's profile in the target organization's `users` subcollection. Includes admin role verification.
    - Created `unassignOrganizationFromManagerAdmin.ts`: Callable function for Super Admins to unassign an organization from an OM. Updates claims, the `admins` profile (`assignedOrganizationIds`), and deletes the OM's profile from the unassigned organization's `users` subcollection. Includes admin role verification.
    - Exported these new functions in `index.ts`.
    - Resolved `no-else-return` ESLint issues in the new Cloud Functions.
  - **Frontend UI (`src/components/Admin/OrganizationManagerAssignments.tsx`):**
    - Created a new component to display a table of Organization Managers.
    - Shows managed organizations as deletable MUI Chips (triggers `unassignOrganizationFromManagerAdmin`).
    - Provides a button to open a modal for assigning new organizations (triggers `assignOrganizationToManagerAdmin`).
    - Integrated this component into the "Organization Managers" tab of `AdminDashboardPanel.tsx`.
    - Addressed TypeScript `no-explicit-any` errors using the `isAppError` type guard.
  - **Memory Bank Documentation:**
    - Updated `systemPatterns.md` to include the `assignedOrganizationIds` field in the `admins` data model, details of the new admin callable functions, and the established error handling pattern (`isAppError`).
    - Updated `activeContext.md` with these changes.
- **Lost Password Functionality (2025-05-28):**
  - Created `src/pages/LostPasswordPage.tsx` with a form to send a password reset email via Firebase.
  - Added a route `/lost-password` in `src/routes.tsx`.
  - Added a "Forgot password?" link to `src/components/LoginForm.tsx`.
- **Invitation System (Phase 3 - Refinement & Testing) Completed (2025-05-28):**
  - All invitation flows thoroughly tested and verified:
    - Admin invites / manages Organization Managers (with and without initial organization).
    - Admin can also invite/manage Property Managers, Properties and their Residents.
    - Organization Manager accepts global invitation.
    - Organization Manager invites other users (e.g., Property Managers, Residents) within their assigned organizations.
    - Property Manager creates a property and invites residents.
  - Email content and links for all scenarios verified.
  - Email templates from `docs/` seeded to Firestore `templates` collection using `seedTemplates.js`.
- **Admin Dashboard - Properties Management Completed (2025-05-28):**
  - Implementation of property CRUD operations for Admins completed and verified.
- **Organization Manager Dashboard - Organization Creation UI Completed (2025-05-28):**
  - UI for Organization Managers to use their ability to create organizations (if they don't have one or wish to create more) implemented and verified.
- **Role-Based Management Capabilities Verified (2025-05-28):**
  - Admins can manage organization managers, property managers, properties, and residents.
  - Organization managers can manage property managers, properties, and residents for assigned organizations.
  - Property managers can manage properties and residents for their organization.

## 3. What's Left to Build (High-Level from `projectRoadmap.md`)

The remaining application functionality, based on the current `projectRoadmap.md` (which details up to Admin Dashboard features), includes:

- **B. Admin Dashboard (Super Admin View):**
  - Property Managers Management (CRUD): Further refinement or specific sub-tasks if not fully covered by general management capabilities.
  - (Note: Other items previously listed here like Organization Management, Properties Management, and Residents Management for Admins are now considered complete based on recent verifications).
- (The old "Invitation System (Phase 3)" is now superseded by the "Resident Invitation Campaigns" feature for resident invites.)

(Further features beyond the Admin Dashboard, such as Organization Manager, Property Manager, and Resident Dashboards, and core systems like Service Requests, are planned but not yet detailed in the current version of `projectRoadmap.md`.)

## 3. Immediate Next Steps (Updated from activeContext.md)

1.  **Resident Invitation Campaigns - Enhancements & Broader Rollout:**
    - (UI for Organization Managers and Admins completed - see "What Works / Completed").
    - Verify and test the new public campaign link flow:
        - `createCampaign` generates frontend `accessUrl`.
        - `PublicCampaignHandlerPage.tsx` (at `/join-public-campaign`) correctly calls `processPublicCampaignLink`.
        - `processPublicCampaignLink` correctly creates an invitation.
        - User is correctly navigated to `JoinCampaignPage.tsx` to complete sign-up.
    - Conduct thorough end-to-end testing of all campaign creation, public link usage, invitation, sign-up, and tracking flows.
2.  **Phoenix Integration:** (Ongoing)
    - Implement job querying by Resident, Property, and Organization.
    - Implement service request dispatch to Phoenix.
    - Implement services querying from Phoenix.
3.  **Custom GPTChat Model Integration:** (Ongoing)
    - Integrate chatbot into Resident dashboard.
    - Evaluate PM access.
4.  **Dashboard Data Visualizations & Statistics:** (Ongoing)
    - Implement metrics for all roles using Highcharts, including campaign performance data.
5.  **Extend `projectRoadmap.md`:** Document detailed plans for the remaining dashboard features and core systems, including the full scope of Invitation Campaigns.

## 4. Known Issues & Blockers

- **TypeScript v1/v2 Firebase Functions Typing:** Persistent TypeScript type resolution issues were encountered in the local dev environment when mixing v1 and v2 Firebase Function types/signatures (e.g., for `onCall`, `onRequest`, `CallableContext`, `EventContext`, `Response`). While workarounds (explicit v1 type imports, `write_to_file` fallback, using v2 `onSchedule`) were used, this indicates a potential sensitivity in the project's TypeScript setup that needs monitoring. Deployed functions may work correctly if Firebase CLI interprets them as intended.
- **MUI Grid TypeScript Errors:** Lingering TypeScript errors related to MUI `Grid` component props in `CreatePropertyForm.tsx` might indicate a deeper type configuration issue or linter quirk. Functionality is expected to be unaffected.

## 5. Evolution of Project Decisions

- **Initial Decision (from `projectRoadmap.md` & `.clinerules`):** Core stack (React 19, Firebase), Memory Bank.
- **2025-05-22:** Highcharts for analytics.
- **2025-05-23:** Detailed multi-tenant DB architecture and custom claims strategy (`memory-bank/systemPatterns.md`).
- **2025-05-23:** Resolved various Firebase Functions v2 import/config issues (now historical context).
- **2025-05-23:** Updated `apphosting.yaml`.
- **2025-05-23:** Resolved `firebase-admin` import issue.
- **2025-05-23:** Switched `processSignUp` to non-blocking `onCreate`, removed token refresh, replaced logger.
- **2025-05-23 (Auth Race Condition):** Fixed in `AuthProvider.tsx`.
- **2025-05-24 (User Onboarding Logic Refinement):**
  - **`processSignUp.ts` (`auth.onCreate` trigger) (Behavior Clarified 2025-05-27):**
    - Handles Super Admin user creation (`*@24hrcarunlocking.com` or specific emails): sets `admin` role, creates profile in `admins/{uid}`.
    - For all other users (including direct sign-ups not matching admin criteria): **No default claims are set, and no Firestore document is created by this function.** This is to ensure invitation-specific functions are the source of truth for claims and profiles for invited users, preventing race conditions.
    - Previous notes about `processSignUp.ts` setting `pending_association` roles or checking for `organizationId` claims to prevent overwrites are now superseded by its current simpler, deferring behavior for non-admins.
  - **`signUpWithInvitation.ts` and `signUpWithOrgManagerInvitation.ts` (callable functions):**
    - These functions manage all invited user sign-ups (email/password and social).
    - They set the final, definitive custom claims (e.g., `property_manager`, `resident`, `organization_manager`, and associated `organizationId(s)`, `propertyId`).
    - They create user profiles directly in the correct multi-tenant Firestore paths (and `admins` collection for OMs via `signUpWithOrgManagerInvitation.ts`).
  - **Firestore Rules (`firestore.rules`):**
    - Rules for the root `/users` collection were previously removed as it's no longer used for pending profiles. This remains correct.
  - This refined understanding clarifies that the invitation callable functions are solely responsible for setting up non-Super-Admin users, and `processSignUp.ts` only handles Super Admins, simplifying the logic and avoiding claim conflicts.
- **2025-05-24 (Admin PM Management Overhaul):** Implemented as per `docs/04-admin-pm-management-plan.md`.
- **2025-05-25 (Create Property Form Simplification):**
  - Removed City, State, Zip from `CreatePropertyForm.tsx`.
  - Renamed "Street Address" to "Address" in the form.
  - Updated `createProperty.ts` Cloud Function to expect and store only `address: { street: "..." }`.
  - Updated `systemPatterns.md` to reflect the simplified address data model for properties.
- **2025-05-25 (Google Places Autocomplete Styling/UX):**
  - Enhanced input styling for `PlaceAutocompleteElement` in property forms.
  - Set global `z-index` for `.pac-container` to ensure visibility over modals.
- **2025-05-25 (Organization Status Chips & CreatedAt Formatting):** Implemented MUI Chips for status display (with Title Case labels) and updated `createdAt` formatting/alignment in `OrganizationManagementPanel.tsx`.
- **2025-05-24 (Organization Management & Functions Refactor):** Implemented.
- **2025-05-24 (Social Sign-On & Email Pre-fill for Invitation Acceptance):** Implemented.
- **2025-05-24 (Property Manager Dashboard - Dynamic Property for Invites):** Implemented.
- **Seed Script Enhancement (`scripts/seedTemplates.js`) (2025-05-24):**
  - Modified the script to accept an `--env` command-line flag (`emulator` or `production`).
  - Defaults to `emulator` if no flag is provided, automatically setting `FIRESTORE_EMULATOR_HOST="localhost:8080"` if not already set.
  - If `--env=production` is used, it prompts the user for explicit confirmation ("Y" or "yes") before attempting to connect to the live Firestore database, as a safety measure.
  - Updated logging to clearly indicate the target environment.
- **2025-05-26 (RBAC Enhancement: Super Admin & Organization Manager Roles):**
  - Clarified `admin` role as Super Admin with global access.
  - Introduced new `organization_manager` role with `organizationIds` custom claim for scoped access to one or more organizations.
  - Implemented backend Cloud Functions (`createInvitation` update, `signUpWithInvitation` update, new `addOrganizationToManager`) for managing `organization_manager` users and their organization assignments.
  - Updated Firestore Security Rules for differentiated access.
  - Updated frontend Auth context (`useAuth`, `AuthProvider`), `ProtectedRoute`, and `Dashboard` to support the new role and claims.
  - Created initial `OrganizationManagerDashboardPanel` and `InviteOrganizationManagerForm` components.
  - Updated `AdminDashboardPanel` to include management options for Organization Managers.
- **Organization Manager Invitation & Creation Enhancements (2025-05-26):**
  - **Invite Organization Manager Form (`src/components/Admin/InviteOrganizationManagerForm.tsx`):**
    - Optimized layout: Name/Email on one row.
    - Organization Selector is now a multi-select dropdown, allowing assignment to none, one, or multiple organizations during invitation. Labels streamlined.
  - **`createInvitation.ts` Cloud Function:**
    - Admins can now invite Organization Managers and assign them to multiple organizations (or none) simultaneously.
    - All Organization Manager invitations are stored in the `globalInvitations` collection.
    - The invitation document now stores an `organizationIds` array (which can be `null` or empty if no organizations are selected at invite time).
  - **`signUpWithInvitation.ts` Cloud Function:**
    - Handles sign-ups from `globalInvitations`.
    - Sets the `organizationIds` custom claim based on the `organizationIds` array from the invitation.
    - Creates user profiles in each specified organization if `organizationIds` were provided in the invitation.
  - **`createOrganization.ts` Cloud Function:**
    - Now allows users with the `organization_manager` role to create organizations.
    - If an OM creates an organization, they are auto-assigned: claims updated with new org ID, and their profile is created in the new organization's `users` subcollection.
- **Clarification of Invitation Sign-Up Cloud Functions (2025-05-27):**
  - Analyzed `functions/src/callable/signUpWithInvitation.ts` and `functions/src/callable/signUpWithOrgManagerInvitation.ts`.
  - Confirmed that `signUpWithInvitation.ts` is a general handler. While it can process Organization Manager invitations from `globalInvitations` (setting claims and creating profiles in `organizations/{orgId}/users/`), it crucially does _not_ create the OM's profile in the root `admins` collection.
  - Confirmed that `signUpWithOrgManagerInvitation.ts` is specific to Organization Manager invitations and its key distinct function is creating/merging the OM's profile in the root `admins/{uid}` collection, which is essential for Super Admin management. It also handles org-specific profiles if initial organizations are assigned.
  - This reinforces that both functions serve distinct, necessary purposes, with `signUpWithOrgManagerInvitation.ts` being vital for the complete OM onboarding process, including their `admins` profile. The frontend likely uses `AcceptOrgManagerInvitationPage.tsx` to call this specific function.
- **2025-05-28: Major Feature Completions & Next Steps Definition:**
  - Completed and verified: Invitation System (Phase 3), Admin Dashboard Properties Management (CRUD), Organization Manager Dashboard Organization Creation UI.
  - Verified comprehensive role-based management capabilities for Admins, OMs, and PMs.
  - Defined new "Immediate Next Steps" focusing on Phoenix Integration, CSV Import, GPTChat Integration, and Dashboard Visualizations. (This is now updated above in section 3)
- **2025-05-29 (Resident Invitation Campaigns):**
  - Adopted "Campaigns" concept for CSV and Public Link/QR invitations.
  - Implemented backend (Firestore rules, `createCampaign` v1 callable, `handleCampaignSignUpLink` v1 HTTP, `signUpWithInvitation` v2 callable update, `cleanupProcessedCampaignCSVs` v2 scheduled).
  - Implemented initial frontend for Property Managers (`CreateCampaignModal`, `CampaignsTable`, `PropertyCampaignsView` integrated into dashboard).
  - Utilized Firebase Storage for CSVs with a scheduled cleanup strategy.
    - Noted and navigated TypeScript v1/v2 type resolution challenges.
*   **Public Campaign Link Flow Rearchitected & Sign-up Debugged (2025-05-30):**
    *   **URL Rearchitecture:**
        *   The `createCampaign` Cloud Function (`functions/src/callable/createCampaign.ts`) was updated to generate `accessUrl`s that are frontend URLs (e.g., `https://your-app.com/join-public-campaign?campaign={campaignId}`). The base URL is derived from `functions.config().app.domain`.
        *   Store the campaign document's ID in an `id` field (e.g. `id: campaignRef.id`) within the document data itself.
    *   A new frontend page, `src/pages/PublicCampaignHandlerPage.tsx`, was created and mapped to the `/join-public-campaign` route.
    *   This handler page calls a new callable Cloud Function, `functions/src/callable/processPublicCampaignLink.ts`.
    *   The `processPublicCampaignLink` function validates the campaign by querying the `campaigns` collection group using `where('id', '==', campaignIdFromUrl)` and `where('status', '==', 'active')`. It then creates an invitation document and returns details to the frontend handler.
    *   The frontend handler page then navigates the user to the existing `/join-campaign` route (which uses `src/pages/JoinCampaignPage.tsx`) with the necessary `invitationId`, `campaignId`, and `organizationId`.
    *   The previous HTTP Cloud Function `functions/src/http/handleCampaignSignUpLink.ts` has been decommissioned for this flow (export removed, file deleted).
    *   This change provides a cleaner, more user-friendly `accessUrl` for public campaigns and resolved an "internal error" from an incorrect collection group query.
    *   **Sign-up Debugging:**
        *   Fixed an issue in `src/pages/JoinCampaignPage.tsx` where it incorrectly showed an "Invalid Campaign Link" error if `getInvitationDetails` returned no email (expected for public campaign invites). The page now allows users to enter their email if not pre-filled.
        *   Resolved a `TypeError` in `functions/src/callable/signUpWithInvitation.ts` that occurred when `invitationData.email` was undefined. The function now correctly handles this case.
        *   Corrected `functions/src/callable/processPublicCampaignLink.ts` to store `organizationIds: [orgId]` (an array) in new invitation documents, aligning with how `signUpWithInvitation.ts` expects to process organization context for setting claims. This resolved an issue where user roles were not being assigned.
        *   Added enhanced logging to `signUpWithInvitation.ts` and `getInvitationDetails.ts` to aid debugging.
    *   **Result:** The end-to-end public campaign sign-up flow is now functional.
- **Organization Selector Bug Fix (2025-05-30):**
    - Corrected the `useEffect` hook in `src/components/Admin/OrganizationSelector.tsx` to properly handle changes in `managedOrganizationIds` (for OMs) and to clear invalid selections.
    - Added `managedOrganizationIds`, `selectedOrganizationId`, and `onOrganizationChange` to its dependency array.
    - This aims to improve the stability of organization selection and prevent downstream errors like "Organization ID not provided" in campaign views by ensuring consistent state.
- **Property Manager Campaign View Fix (2025-05-30):**
    - Updated `src/components/Dashboard/PropertyManagerDashboardPanel.tsx` to conditionally render `PropertySelectorDropdown` in the "Invite Residents" and "Campaigns" tabs only when `organizationId` (derived from props/auth claims) is truthy.
    - This resolves TypeScript errors related to passing `string | null` to a prop expecting `string`, and ensures `PropertySelectorDropdown` always receives a valid `organizationId` when rendered. This is intended to fix the "Organization ID not provided. Cannot load properties." error for Property Managers when accessing campaign features.
