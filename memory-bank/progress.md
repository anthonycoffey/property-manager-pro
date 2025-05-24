# Progress: Multi-Tenant ERP-Style Web Application

## 1. Current Status: RBAC & Firestore Implementation (As of 2025-05-23)

The project has recently completed the implementation of the Admin Organization Management Panel and a significant refactoring of all Firebase Cloud Functions.

*   **Date of this update:** 2025-05-24 (Updated)

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
    *   **Updated `processSignUp` Cloud Function (`functions/src/index.ts`):** Migrated from a blocking `beforeUserCreated` trigger to a non-blocking `functions.auth.user().onCreate` (1st gen) trigger. Implemented custom claims logic to assign `admin: true` and `accessLevel: 9` for users with `@admin.example.com` emails, and default `resident` roles for others. Resolved TypeScript errors related to `functions.auth` and implicit `any` types by correctly importing `functions` and explicitly typing `user` as `admin.auth.UserRecord`.
    *   **Replaced `firebase-functions/logger` with `console.log`:** All `logger.info` and `logger.error` calls in `functions/src/index.ts` have been replaced with `console.log` and `console.error` respectively, as per user instruction.
    *   Resolved TypeScript module resolution errors for Firebase Functions v2 `identity` module. (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
    *   Updated `src/hooks/useAuth.ts` and `src/providers/AuthProvider.tsx` to fetch and expose custom claims.
*   **Phase 3: Firestore Security Rules:**
    *   Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`.
*   **Phase 4: Frontend Integration & UI Adaptation:**
    *   Updated `src/components/ProtectedRoute.tsx` to enforce route protection based on roles and IDs.
    *   Modified `src/components/Dashboard.tsx` for conditional UI rendering based on user roles.
*   **Phase 5 (Partial): Initial Feature Development (Admin Dashboard - Property Manager CRUD):**
    *   Created `src/components/Admin` directory and `src/components/Admin/PropertyManagerManagement.tsx` component.
    *   Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions in `functions/src/index.ts`.
    *   Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
    *   Added `/admin/property-managers` route to `src/routes.tsx` protected by `ProtectedRoute`.
*   **Resolved Firebase Admin SDK Initialization Error:** Changed `import * as admin from 'firebase-admin';` to `import admin from 'firebase-admin';` in `functions/src/index.ts` to resolve `TypeError: admin.initializeApp is not a function` during Firebase Functions deployment in an ES module environment.
*   **Removed Token Refresh Mechanism from `processSignUp` (2025-05-23):**
    *   Modified `functions/src/index.ts` in the `processSignUp` function to completely remove any explicit server-side mechanism for signaling client-side token refresh (this included removing the previously implemented Firestore `userTokenRefreshFlags` and the original Realtime Database calls).
    *   Removed the security rules for the `userTokenRefreshFlags` collection from `firestore.rules`.
    *   This simplifies the `processSignUp` function and ensures the "Can't determine Firebase Database URL" error (related to the initial Realtime Database attempt) remains resolved. The client will now be solely responsible for its token refresh strategy.
*   **Resolved Authentication Race Condition (2025-05-23):**
    *   Successfully investigated and fixed a race condition in `src/providers/AuthProvider.tsx` that caused users to be incorrectly redirected from protected routes on initial login.
    *   The fix involved refactoring `AuthProvider.tsx` to use a two-stage `useEffect` approach for more robust management of loading and user authentication states. This ensures that `ProtectedRoute.tsx` evaluates access based on complete and current authentication context.
    *   `ProtectedRoute.tsx` was restored to its full functionality (role and ID checks) after the fix.
    *   Console logs used for debugging were cleaned up from `AuthProvider.tsx` and `ProtectedRoute.tsx`.
*   **Multi-Tenancy Sign-Up Logic Implemented (2025-05-23):**
    *   **Modified `processSignUp` Cloud Function (`functions/src/index.ts`):**
        *   Admin users (`*@24hrcarunlocking.com`) now have their profiles created in the `admins/{uid}` Firestore collection.
        *   Direct non-admin sign-ups are assigned a `{ roles: ['pending_association'] }` custom claim and a temporary profile in the root `users/{uid}` collection with `status: 'pending_association'`.
        *   `processSignUp` now checks for existing `organizationId` claims to avoid conflicts with invited user processing.
    *   **Added `signUpWithInvitation` HTTPS Callable Cloud Function (`functions/src/index.ts`):**
        *   Handles user sign-ups via an invitation, ensuring immediate association with an organization, correct roles, proper profile creation in multi-tenant Firestore paths, and updates invitation status.
*   **Invitation System Implementation (Phase 1 - Backend & Core UI) (2025-05-23):**
    *   **Documented Plan:** Created `docs/03-invitation-system-plan.md`.
    *   **Cloud Functions (`functions/src/index.ts`):**
        *   Added `createInvitation` callable function.
        *   Added `createProperty` callable function.
        *   Added `crypto` import.
    *   **Firestore Security Rules (`firestore.rules`):** Updated rules for `organizations/{orgId}/invitations` subcollection.
    *   **Email Templates (JSON in `docs/`):**
        *   Created `docs/propertyManagerInvitation.json`.
        *   Created `docs/residentInvitation.json`.
    *   **UI Components (React Forms):**
        *   Created `src/components/Admin/InvitePropertyManagerForm.tsx`.
        *   Created `src/components/PropertyManager/CreatePropertyForm.tsx`.
        *   Created `src/components/PropertyManager/InviteResidentForm.tsx`.
    *   **TypeScript Fixes:** Resolved issues with `currentUser` property access in new forms by using destructured values from `useAuth()`. Addressed MUI `Grid` `item` prop usage.
*   **Invitation System (Phase 2 - Dynamic Templates & UI Integration) (2025-05-23):**
    *   **Dynamic Email Templates:**
        *   Updated `createInvitation` Cloud Function in `functions/src/index.ts` to use dynamic `appDomain` (from Firebase project ID), `appName` (placeholder), and `inviterName` (from auth token or Firestore profile) in email template data.
        *   Updated `docs/propertyManagerInvitation.json` and `docs/residentInvitation.json` to include `{{ appName }}` and `{{ inviterName }}` placeholders.
    *   **Dashboard Integration (`src/components/Dashboard.tsx`):**
        *   Integrated `InvitePropertyManagerForm.tsx` and `PropertyManagerManagement.tsx` into Admin section using MUI Tabs.
        *   Integrated `CreatePropertyForm.tsx` and `InviteResidentForm.tsx` (with a placeholder `propertyId`) into Property Manager section using MUI Tabs.
    *   **Accept Invitation Page (`src/pages/AcceptInvitationPage.tsx`):**
        *   Created page to handle invitation tokens from URL, display a sign-up form, and call `signUpWithInvitation` Cloud Function.
    *   **Routing (`src/routes.tsx`):**
        *   Added a public route `/accept-invitation` for `AcceptInvitationPage.tsx`.
    *   **TypeScript Refinements (Cloud Functions):**
        *   Replaced `any` types in `functions/src/index.ts` with specific interfaces (`UserProfileData`, `InvitationData`, `EmailTemplateData`) for improved type safety in `signUpWithInvitation` and `createInvitation` functions.
*   **Admin Property Manager Management Panel Overhaul (Step 4 from `docs/04-admin-pm-management-plan.md`) (2025-05-24):**
    *   **Phase 0: Organization Context Switcher:**
        *   Created and integrated `src/components/Admin/OrganizationSelector.tsx` into `Dashboard.tsx`.
    *   **Phase 1: Backend Adjustments:**
        *   Implemented `revokeInvitation` Cloud Function in `functions/src/index.ts`.
    *   **Phase 2 & 3: Frontend UI/UX Overhaul (`src/components/Admin/PropertyManagerManagement.tsx`):**
        *   Removed manual PM creation form.
        *   Implemented organization-scoped, unified list (MUI Table) for active PMs and pending PM invitations.
        *   Implemented actions (Update PM, Delete PM, Revoke Invitation) with dialogs and feedback.
        *   Addressed core visual design and UX requirements.
*   **Admin Dashboard - Organization Management Panel Implemented (2025-05-24):**
    *   Enhanced `src/components/Admin/OrganizationManagementPanel.tsx` to list, add (via `AddOrganizationModal.tsx`), edit (via `EditOrganizationModal.tsx`), and deactivate organizations.
    *   The `Organization` interface was updated to use `createdBy` instead of `ownerId`.
    *   Relevant TypeScript import issues were resolved (type-only imports, `.js` extensions for Firebase Functions).
*   **Firebase Functions Refactoring (2025-05-24):**
    *   All Cloud Functions from `functions/src/index.ts` were refactored into individual files under `functions/src/auth/` (for auth triggers like `processSignUp`) and `functions/src/callable/` (for HTTPS callable functions).
    *   Created `functions/src/firebaseAdmin.ts` for shared Firebase Admin SDK initialization and `functions/src/helpers/handleHttpsError.ts` for a common error handling utility.
    *   The main `functions/src/index.ts` now re-exports all individual functions.
    *   Added new callable Cloud Functions for organization management:
        *   `updateOrganization` (in `functions/src/callable/updateOrganization.ts`)
        *   `deactivateOrganization` (in `functions/src/callable/deactivateOrganization.ts`)
    *   Ensured all relative imports within the `functions/src` directory use the `.js` extension.
*   **Admin Invite Property Manager Form Enhancement (2025-05-24):**
    *   Modified `src/components/Admin/InvitePropertyManagerForm.tsx` to accept `selectedOrganizationId` as a prop.
    *   The Organization ID field in this form is now pre-filled and disabled, based on the organization selected in `OrganizationSelector.tsx` on the `Dashboard`.
    *   Updated `src/components/Dashboard.tsx` to pass the `selectedAdminOrgId` to `InvitePropertyManagerForm.tsx`.
*   **Social Sign-On for Accept Invitation Page (2025-05-24):**
    *   Enhanced `src/pages/AcceptInvitationPage.tsx` to include UI and logic for Google and Microsoft social sign-on options.
    *   Modified the `functions/src/callable/signUpWithInvitation.ts` Cloud Function to:
        *   Handle pre-authenticated users (from social sign-on) by accepting an optional `uid` and making `password` optional.
        *   Skip Firebase Auth user creation if `uid` is provided.
        *   Validate that the email from the social provider matches the email on the invitation.
        *   Use the display name from the social provider for the Firestore user profile.
    *   Resolved `UserCredential` import error in `AcceptInvitationPage.tsx`.
*   **Accept Invitation Page Enhancements (Readonly Email & Pre-fill) (2025-05-24):**
    *   Added a new callable Cloud Function `getInvitationDetails` (`functions/src/callable/getInvitationDetails.ts`) to securely fetch the invited email address using the invitation token and organization ID.
    *   Updated `functions/src/index.ts` to export `getInvitationDetails`.
    *   Modified `src/pages/AcceptInvitationPage.tsx` to:
        *   Call `getInvitationDetails` upon loading with valid URL parameters.
        *   Pre-fill the email input field with the email address fetched from the invitation.
        *   Make the email input field readonly to prevent modification.
        *   Implement loading states and error handling for the invitation detail fetching process, disabling form interactions until details are loaded or if an error occurs.

## 3. What's Left to Build (High-Level from `projectRoadmap.md`)

The remaining application functionality includes:

*   **A. Authentication & Authorization:** (Core setup complete, ongoing refinement)
*   **B. Admin Dashboard:**
    *   Organization Management (CRUD - Add, List, Edit, Deactivate implemented).
    *   Property Managers Management (Core UI for listing, editing, deleting, and revoking invites is complete. Future enhancements or minor adjustments as needed).
    *   Properties Management (CRUD).
    *   Residents Management (View, Edit, Delete for support).
*   **C. Property Manager Dashboard:**
    *   View assigned properties (and allow selection to make `propertyId` dynamic for `InviteResidentForm`).
    *   Manage residents for their properties.
    *   Manage invitations.
    *   Track service requests.
*   **D. Resident Dashboard:**
    *   View property details.
    *   Manage profile (vehicle info).
    *   Submit and track service requests.
*   **E. Core Systems & Features:**
    *   **Data Models in Firestore:** (Initial implementation complete, ongoing refinement as features are built).
    *   **Invitation System:**
        *   Thorough end-to-end testing of all invitation flows (including new social sign-on options).
        *   Manually add email templates from `docs/` to Firestore `templates` collection.
        *   Refine `InviteResidentForm.tsx` in `Dashboard.tsx` to use a dynamic `propertyId`.
    *   **Service Request System:** (Full implementation pending).
    *   **Firebase Cloud Functions for:** CRM Integration, Email Sending (beyond invitations), CSV Processing, QR Code Generation, Subscription Management (all pending).
    *   **Firebase Cloud Functions Structure:** All functions are now modularized.

## 4. Known Issues & Blockers

*   **MUI Grid TypeScript Errors:** Lingering TypeScript errors related to MUI `Grid` component props in `CreatePropertyForm.tsx` might indicate a deeper type configuration issue or linter quirk. Functionality is expected to be unaffected. (No change)
*   **Placeholder `appName`:** The `appName` in `functions/src/index.ts` for email templates is currently a hardcoded placeholder ("Property Manager Pro"). This should ideally be configurable. (No change)
*   **Placeholder `propertyId`:** The `InviteResidentForm` in `Dashboard.tsx` uses a hardcoded `examplePropertyIdForResidentInvite`. This needs to be made dynamic based on PM's selected property. (No change)
*   **None at this stage.** The "Can't determine Firebase Database URL" error in `processSignUp` has been resolved. The TypeScript error related to `functions.auth` was previously resolved. (No change)

## 5. Evolution of Project Decisions

*   **Initial Decision (from `projectRoadmap.md`):** Adopt React 19 with Server Components and Firebase as the core stack.
*   **Initial Decision (from `.clinerules`):** Implement and maintain a "Memory Bank" documentation system.
*   **2025-05-22:** Decided to use Highcharts for analytics and reporting features.
*   **2025-05-23:** Finalized the detailed multi-tenant database architecture for Firestore and the Firebase Auth custom claims strategy. This adopts a hierarchical model based on organizations and array-based roles. The canonical documentation for this is in `memory-bank/systemPatterns.md`, with `memory-bank/projectRoadmap.md` updated to reflect this and refer to `systemPatterns.md`.
*   **2025-05-23:** Resolved Firebase Functions v2 `identity` module import issue by identifying `beforeUserCreated` as the correct function for user creation triggers and updating `tsconfig.json` for `nodenext` compatibility. (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
*   **2025-05-23:** Updated `apphosting.yaml` to include `build` and `release` configurations for Firebase App Hosting, ensuring correct deployment of the Vite application.
*   **2025-05-23:** Resolved `TypeError: admin.initializeApp is not a function` by changing `firebase-admin` import in `functions/src/index.ts` from `import * as admin from 'firebase-admin';` to `import admin from 'firebase-admin';`.
*   **2025-05-23:** Switched Firebase user creation trigger from blocking `beforeUserCreated` to non-blocking `functions.auth.user().onCreate` (1st gen) in `functions/src/index.ts`. Implemented custom claims for admin users. **The explicit server-side token refresh signaling mechanism in `processSignUp` was removed entirely.** Replaced `firebase-functions/logger` with `console.log` and `console.error`.
*   **2025-05-23:** Resolved TypeScript error `Property 'auth' does not exist` in `functions/src/index.ts` by explicitly importing `auth` from `firebase-functions` for v1 function compatibility.
    *   **2025-05-23 (Auth Race Condition):** Identified and resolved a race condition in the client-side authentication flow. Refactored `src/providers/AuthProvider.tsx` to use a two-stage `useEffect` pattern. The first `useEffect` subscribes to `onAuthStateChanged` and updates a raw `firebaseUser` state. The second `useEffect` reacts to `firebaseUser` changes, manages a `loading` state explicitly during asynchronous claim fetching and context updates, ensuring that `ProtectedRoute` components receive a consistent and complete auth state. This fixed issues with premature redirects.
*   **2025-05-23 (Multi-Tenant Sign-Up Strategy):** Implemented a two-part strategy for user creation to enhance multi-tenancy support:
    1.  The `processSignUp` (`auth.onCreate`) trigger was modified to handle initial states for direct sign-ups (assigning `pending_association` role) and admin user setup (correcting profile path to `admins/{uid}`).
    2.  The `signUpWithInvitation` callable Cloud Function was updated to manage invited user sign-ups (both email/password and social sign-on), ensuring immediate and correct association with an organization, roles, and multi-tenant profile creation.
*   **2025-05-24 (Admin PM Management Overhaul):** Implemented the Admin Property Manager Management panel overhaul as per `docs/04-admin-pm-management-plan.md`. This included adding an organization selector, a new `revokeInvitation` Cloud Function, and refactoring the `PropertyManagerManagement.tsx` component to remove manual PM creation and introduce a unified, organization-scoped list for managing active PMs and pending invitations with appropriate actions (Update, Delete, Revoke).
*   **2025-05-24 (Organization Management & Functions Refactor):** Implemented CRUD operations for Organizations in the Admin panel. Refactored all Firebase Functions into a modular, per-file structure. Added `updateOrganization` and `deactivateOrganization` Cloud Functions. Corrected TypeScript import issues and interface definitions.
*   **2025-05-24 (Social Sign-On & Email Pre-fill for Invitation Acceptance):**
    *   Added Google and Microsoft social sign-on options to the `AcceptInvitationPage.tsx`.
    *   Updated the `signUpWithInvitation` Cloud Function to support this flow by handling pre-authenticated users and ensuring email consistency with the invitation.
    *   Implemented a new `getInvitationDetails` Cloud Function to fetch the invited email.
    *   The `AcceptInvitationPage.tsx` now calls `getInvitationDetails` to pre-fill and make the email field readonly, enhancing UX and data integrity.
    *   Resolved the `UserCredential` import error.

## 6. Immediate Next Steps

1.  **Invitation System (Phase 3 - Refinement & Testing):**
    *   Refine `InviteResidentForm.tsx` in `Dashboard.tsx` to use a dynamic `propertyId`.
    *   Thoroughly test all invitation flows.
    *   Verify email content and links.
    *   Manually add email templates from `docs/` to Firestore `templates` collection if not already done.
2.  **Admin Dashboard - Properties Management:**
    *   Begin implementation of property CRUD operations for Admins.
3.  **Continue with Project Roadmap:** Proceed with other features as prioritized.
