# Progress: Multi-Tenant ERP-Style Web Application

## 1. Current Status: RBAC & Firestore Implementation (As of 2025-05-23)

The project has recently completed the implementation of the Admin Organization Management Panel, a significant refactoring of all Firebase Cloud Functions, and the integration of Google Places API for address autocompletion.

*   **Date of this update:** 2025-05-25

## 2. What Works / Completed

*   **Project Definition:**
    *   `projectRoadmap.md` has been reviewed and serves as the primary guide for development.
*   **Core Memory Bank Documentation Established:**
    *   `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md` are established and updated.
*   **Authentication Redirection Implemented:** Configured `src/components/LoginForm.tsx` and `src/components/SignupForm.tsx` to redirect users to the `/dashboard` page upon successful login or registration.
*   **RBAC and Firestore Implementation Plan Documented:** Created `docs/02-rbac-firestore-implementation.md` detailing the comprehensive plan for multi-tenant RBAC and Firestore integration.
*   **Phase 1: Firebase Project Setup & Initial Firestore Structure:**
    *   Confirmed Firebase project initialization and Firestore enablement.
*   **Phase 2: Firebase Authentication & Custom Claims:**
    *   **Updated `processSignUp` Cloud Function (`functions/src/auth/processSignUp.ts`):**
        *   Migrated from a blocking `beforeUserCreated` trigger to a non-blocking `functions.auth.user().onCreate` (1st gen) trigger.
        *   Implemented custom claims logic:
            *   For admin users (`*@24hrcarunlocking.com`): sets `roles: ['admin']` and creates a profile in `admins/{uid}`.
            *   For other direct sign-ups: sets `roles: ['pending_association']`. **No Firestore document is created by `processSignUp` for these users.** The temporary profile creation in the root `users/{uid}` and the check for `organizationId` claim were removed.
        *   (Previous TypeScript error resolutions and logger changes remain relevant to the function's history but are now within its modularized file).
    *   Updated `src/hooks/useAuth.ts` and `src/providers/AuthProvider.tsx` to fetch and expose custom claims.
*   **Phase 3: Firestore Security Rules:**
    *   Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`.
    *   **Removed rules for the root `/users` collection** as it's no longer used for `pending_association` profiles (2025-05-24).
*   **Phase 4: Frontend Integration & UI Adaptation:**
    *   Updated `src/components/ProtectedRoute.tsx` to enforce route protection based on roles and IDs.
    *   Modified `src/components/Dashboard.tsx` for conditional UI rendering based on user roles.
*   **Phase 5 (Partial): Initial Feature Development (Admin Dashboard - Property Manager CRUD):**
    *   Created `src/components/Admin` directory and `src/components/Admin/PropertyManagerManagement.tsx` component.
    *   Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions (now in `functions/src/callable/`).
    *   Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
    *   Added `/admin/property-managers` route to `src/routes.tsx` protected by `ProtectedRoute`.
*   **Resolved Firebase Admin SDK Initialization Error:** Changed `import * as admin from 'firebase-admin';` to `import admin from 'firebase-admin';` in `functions/src/firebaseAdmin.ts` (previously `functions/src/index.ts`) to resolve `TypeError: admin.initializeApp is not a function` during Firebase Functions deployment in an ES module environment.
*   **Removed Token Refresh Mechanism from `processSignUp` (2025-05-23):**
    *   The `processSignUp` function no longer contains any explicit server-side mechanism for signaling client-side token refresh.
    *   Removed the security rules for the `userTokenRefreshFlags` collection from `firestore.rules`.
    *   This simplifies the `processSignUp` function. The client is solely responsible for its token refresh strategy.
*   **Resolved Authentication Race Condition (2025-05-23):**
    *   Successfully investigated and fixed a race condition in `src/providers/AuthProvider.tsx`.
    *   The fix involved refactoring `AuthProvider.tsx` to use a two-stage `useEffect` approach for robust management of loading and user authentication states.
    *   `ProtectedRoute.tsx` was restored to its full functionality.
*   **Multi-Tenancy Sign-Up Logic Refined (2025-05-24):**
    *   **`processSignUp` Cloud Function (`functions/src/auth/processSignUp.ts`):**
        *   Admin users (`*@24hrcarunlocking.com`) get `admin` roles and profiles in `admins/{uid}`.
        *   Other direct sign-ups get `pending_association` roles; **no Firestore profile is created by this function.**
    *   **`signUpWithInvitation` HTTPS Callable Cloud Function (`functions/src/callable/signUpWithInvitation.ts`):**
        *   Remains the authority for invited user sign-ups.
        *   Sets final custom claims (overwriting any defaults from `processSignUp`).
        *   Creates user profiles directly in the correct multi-tenant Firestore paths (e.g., `organizations/{orgId}/users/{uid}` or `organizations/{orgId}/properties/{propId}/residents/{uid}`).
    *   **Resolved Custom Claim Overwrite (2025-05-24):** Modified `functions/src/auth/processSignUp.ts` to check for an existing `organizationId` claim before setting default `pending_association` claims. This prevents overwriting claims set by the invitation flow, ensuring roles like "resident" are correctly persisted.
*   **Invitation System Implementation (Phase 1 - Backend & Core UI) (2025-05-23):**
    *   **Documented Plan:** Created `docs/03-invitation-system-plan.md`.
    *   **Documented Plan:** Created `docs/03-invitation-system-plan.md`.
    *   **Cloud Functions (now in `functions/src/callable/`):**
        *   `createInvitation.ts`
        *   `createProperty.ts`
    *   **Firestore Security Rules (`firestore.rules`):** Updated rules for `organizations/{orgId}/invitations` subcollection.
    *   **Email Templates (JSON in `docs/`):**
        *   Created `docs/propertyManagerInvitation.json`.
        *   Created `docs/residentInvitation.json`.
    *   **UI Components (React Forms):**
        *   Created `src/components/Admin/InvitePropertyManagerForm.tsx`.
        *   Created `src/components/PropertyManager/CreatePropertyForm.tsx`.
        *   Created `src/components/PropertyManager/InviteResidentForm.tsx`.
    *   **TypeScript Fixes:** Resolved issues with `currentUser` property access in new forms. Addressed MUI `Grid` `item` prop usage.
*   **Invitation System (Phase 2 - Dynamic Templates & UI Integration) (2025-05-23):**
    *   **Dynamic Email Templates:**
        *   Updated `createInvitation.ts` Cloud Function to use dynamic `appDomain`, `appName`, and `inviterName`.
        *   Updated email template JSON files with placeholders.
    *   **Dashboard Integration (`src/components/Dashboard.tsx`):**
        *   Integrated invitation forms into Admin and Property Manager sections using MUI Tabs.
    *   **Accept Invitation Page (`src/pages/AcceptInvitationPage.tsx`):**
        *   Created page to handle invitation tokens, display sign-up form, and call `signUpWithInvitation`.
    *   **Routing (`src/routes.tsx`):**
        *   Added `/accept-invitation` route.
    *   **TypeScript Refinements (Cloud Functions):**
        *   Added specific interfaces for data types in Cloud Functions.
*   **Admin Property Manager Management Panel Overhaul (Step 4 from `docs/04-admin-pm-management-plan.md`) (2025-05-24):**
    *   **Phase 0: Organization Context Switcher:**
        *   Created and integrated `src/components/Admin/OrganizationSelector.tsx`.
    *   **Phase 1: Backend Adjustments:**
        *   Implemented `revokeInvitation` Cloud Function (in `functions/src/callable/revokeInvitation.ts`).
    *   **Phase 2 & 3: Frontend UI/UX Overhaul (`src/components/Admin/PropertyManagerManagement.tsx`):**
        *   Implemented organization-scoped list for active PMs and pending invitations with actions.
*   **Admin Dashboard - Organization Management Panel Implemented (2025-05-24):**
    *   Enhanced `src/components/Admin/OrganizationManagementPanel.tsx` for organization CRUD.
*   **Firebase Functions Refactoring (2025-05-24):**
    *   All Cloud Functions refactored into individual files under `functions/src/auth/` and `functions/src/callable/`.
    *   Shared utilities in `functions/src/firebaseAdmin.ts` and `functions/src/helpers/handleHttpsError.ts`.
    *   Main `functions/src/index.ts` re-exports functions.
    *   Added `updateOrganization.ts` and `deactivateOrganization.ts` callables.
*   **Admin Invite Property Manager Form Enhancement (2025-05-24):**
    *   Modified `src/components/Admin/InvitePropertyManagerForm.tsx` to use `selectedOrganizationId` prop.
*   **Social Sign-On for Accept Invitation Page (2025-05-24):**
    *   Enhanced `src/pages/AcceptInvitationPage.tsx` with social sign-on.
    *   Modified `functions/src/callable/signUpWithInvitation.ts` to handle pre-authenticated users.
*   **Accept Invitation Page Enhancements (Readonly Email & Pre-fill) (2025-05-24):**
    *   Added `getInvitationDetails.ts` Cloud Function.
    *   Updated `src/pages/AcceptInvitationPage.tsx` to pre-fill and disable email field.
*   **Property Manager Dashboard - Dynamic Property Selection for Resident Invitations (2025-05-24):**
    *   Implemented `src/components/PropertyManager/PropertyManagerPropertiesList.tsx`.
    *   Integrated into `src/components/Dashboard.tsx` for dynamic property selection in resident invites.
*   **Property Manager Panel UI/UX Refactor (2025-05-24):**
    *   Refactored the Property Manager section in `src/components/Dashboard.tsx`:
        *   Panel title now displays the fetched Organization Name.
        *   Removed the "Create Property" tab; property creation is now handled via a "Create Property" button opening a modal containing `CreatePropertyForm.tsx`.
        *   `CreatePropertyForm.tsx` updated with an `onSuccess` callback for modal closure.
        *   The "Invite Resident" tab now embeds `PropertyManagerPropertiesList` for clear property selection before inviting.
        *   The "My Properties" tab continues to list properties.
    *   This aligns with Admin panel patterns and improves UX for property creation and resident invitation.
*   **Property Manager Panel Enhancements (Table Display & Dropdown Selector - 2025-05-24):**
    *   **`PropertyManagerPropertiesList.tsx`:** Refactored to display properties in an MUI `Table` with "Property Name" and formatted "Address" columns.
    *   **New `PropertySelectorDropdown.tsx`:** Created to provide a dedicated MUI `Select` dropdown for choosing a property (displays Name and Address); its callback now provides both property ID and name.
    *   **`Dashboard.tsx` (Property Manager Panel):**
        *   "My Properties" tab now uses the table-based `PropertyManagerPropertiesList.tsx`.
        *   "Invite Resident" tab now uses the new `PropertySelectorDropdown.tsx` for property selection. The `Divider` between the dropdown and the form was removed for a unified look. State variables for selected property ID/name were renamed for clarity (e.g., `selectedPropertyId`).
    *   **`InviteResidentForm.tsx`:**
        *   Title now displays the selected property's name instead of ID.
        *   Layout updated to place the email input and "Send Invitation" button on the same row.
    *   These changes further refine the UI/UX based on feedback, improving clarity and consistency.
*   **Google Places API Autocomplete for Property Address (2025-05-25):**
    *   Integrated Google Places API for address autocompletion in property creation and editing forms.
    *   Utilized the `@react-google-maps/api` library.
    *   Modified `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx`.
    *   The "Street Address" field in these forms now offers autocomplete suggestions.
    *   Selecting a suggested address automatically populates the street, city, state (using short codes like "CA"), and zip code fields in the form.
    *   The state selection dropdowns in these forms were updated to use a consistent mapping of US state names to their short codes, aligning with the data provided by the Places API.
    *   Documented the use of the `VITE_GOOGLE_MAPS_API_KEY` environment variable.

## 3. What's Left to Build (High-Level from `projectRoadmap.md`)

The remaining application functionality includes:

*   **A. Authentication & Authorization:** (Core setup complete, ongoing refinement)
*   **B. Admin Dashboard:**
    *   Organization Management (CRUD - Add, List, Edit, Deactivate implemented).
    *   Property Managers Management (Core UI for listing, editing, deleting, and revoking invites is complete. Future enhancements or minor adjustments as needed).
    *   Properties Management (CRUD).
    *   Residents Management (View, Edit, Delete for support).
*   **C. Property Manager Dashboard:**
    *   **Property Creation:** (Implemented via "Create Property" button and modal with `CreatePropertyForm.tsx`).
    *   **View Assigned Properties:** (Implemented in "My Properties" tab via table-based `PropertyManagerPropertiesList`, showing Name and Address).
    *   **Invite Residents:**
        *   Select property for invitation (Implemented in "Invite Resident" tab via new `PropertySelectorDropdown.tsx`, showing Name and Address).
        *   Use `InviteResidentForm` with selected property (Implemented).
    *   Manage residents for their properties (e.g., view list, edit details - Pending).
    *   Manage invitations (beyond the initial invite form, e.g., view status, revoke - Pending).
    *   Track service requests (Pending).
*   **D. Resident Dashboard:**
    *   View property details.
    *   Manage profile (vehicle info).
    *   Submit and track service requests.
*   **E. Core Systems & Features:**
    *   **Data Models in Firestore:** (Initial implementation complete, ongoing refinement as features are built).
    *   **Invitation System:**
        *   Thorough end-to-end testing of all invitation flows (Admin invites PM, PM creates Property, PM invites Resident with dynamic property selection, invitee accepts via email/password and social sign-on).
        *   Manually add email templates from `docs/` to Firestore `templates` collection.
        *   The `InviteResidentForm.tsx` in `Dashboard.tsx` now uses a dynamic `propertyId`.
    *   **Service Request System:** (Full implementation pending).
    *   **Firebase Cloud Functions for:** CRM Integration, Email Sending (beyond invitations), CSV Processing, QR Code Generation, Subscription Management (all pending).
    *   **Firebase Cloud Functions Structure:** All functions are now modularized.

## 4. Known Issues & Blockers

*   **MUI Grid TypeScript Errors:** Lingering TypeScript errors related to MUI `Grid` component props in `CreatePropertyForm.tsx` might indicate a deeper type configuration issue or linter quirk. Functionality is expected to be unaffected. (No change)
*   **Placeholder `appName`:** The `appName` in `functions/src/index.ts` (now within `createInvitation.ts`) for email templates is currently a hardcoded placeholder ("Property Manager Pro"). This should ideally be configurable. (No change)
*   **Placeholder `propertyId` in `InviteResidentForm`:** This has been resolved. The form now uses a dynamic `propertyId` selected by the Property Manager.
*   **None at this stage.** The "Can't determine Firebase Database URL" error in `processSignUp` has been resolved. The TypeScript error related to `functions.auth` was previously resolved. (No change)

## 5. Evolution of Project Decisions

*   **Initial Decision (from `projectRoadmap.md` & `.clinerules`):** Core stack (React 19, Firebase), Memory Bank.
*   **2025-05-22:** Highcharts for analytics.
*   **2025-05-23:** Detailed multi-tenant DB architecture and custom claims strategy (`memory-bank/systemPatterns.md`).
*   **2025-05-23:** Resolved various Firebase Functions v2 import/config issues (now historical context).
*   **2025-05-23:** Updated `apphosting.yaml`.
*   **2025-05-23:** Resolved `firebase-admin` import issue.
*   **2025-05-23:** Switched `processSignUp` to non-blocking `onCreate`, removed token refresh, replaced logger.
*   **2025-05-23 (Auth Race Condition):** Fixed in `AuthProvider.tsx`.
*   **2025-05-24 (User Onboarding Logic Refinement):**
    *   **`processSignUp.ts` (`auth.onCreate` trigger):**
        *   Handles admin user creation (`*@24hrcarunlocking.com`): sets `admin` role, creates profile in `admins/{uid}`.
        *   Handles other direct sign-ups: sets `pending_association` role. **No Firestore document is created by this function for these users.**
        *   The check for `organizationId` claim was removed as it was ineffective due to execution order.
    *   **`signUpWithInvitation.ts` (callable function):**
        *   Manages all invited user sign-ups (email/password and social).
        *   Sets final custom claims (e.g., `property_manager`, `resident`, `organizationId`, `propertyId`), overwriting any defaults from `processSignUp`.
        *   Creates user profiles directly in the correct multi-tenant Firestore paths.
    *   **Firestore Rules (`firestore.rules`):**
        *   Removed rules for the root `/users` collection as it's no longer used.
    *   This addresses the issue where invited Property Managers were incorrectly getting `pending_association` roles due to the execution order of the `onCreate` trigger and the callable invitation function.
*   **2025-05-24 (Custom Claim Overwrite Prevention):**
    *   Modified `processSignUp.ts` to check for an existing `organizationId` custom claim on a user before applying its default `pending_association` claim.
    *   If `organizationId` is present, `processSignUp.ts` will not modify the user's claims, preserving claims set by `signUpWithInvitation.ts`. This resolves the issue where invitation-specific claims (e.g., for residents) were being overwritten.
*   **2025-05-24 (Admin PM Management Overhaul):** Implemented as per `docs/04-admin-pm-management-plan.md`.
*   **2025-05-24 (Organization Management & Functions Refactor):** Implemented.
*   **2025-05-24 (Social Sign-On & Email Pre-fill for Invitation Acceptance):** Implemented.
*   **2025-05-24 (Property Manager Dashboard - Dynamic Property for Invites):** Implemented.
*   **Seed Script Enhancement (`scripts/seedTemplates.js`) (2025-05-24):**
    *   Modified the script to accept an `--env` command-line flag (`emulator` or `production`).
    *   Defaults to `emulator` if no flag is provided, automatically setting `FIRESTORE_EMULATOR_HOST="localhost:8080"` if not already set.
    *   If `--env=production` is used, it prompts the user for explicit confirmation ("Y" or "yes") before attempting to connect to the live Firestore database, as a safety measure.
    *   Updated logging to clearly indicate the target environment.

## 6. Immediate Next Steps

1.  **Invitation System (Phase 3 - Refinement & Testing):**
    *   Thoroughly test all invitation flows, including the new dynamic property selection for resident invites.
    *   Verify email content and links.
    *   Seed email templates from `docs/` to Firestore `templates` collection using the enhanced `seedTemplates.js` script.
2.  **Admin Dashboard - Properties Management:**
    *   Begin implementation of property CRUD operations for Admins.
3.  **Continue with Project Roadmap:** Proceed with other features as prioritized.
