# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

- **Resident Invitation Campaigns:**
    - Implementing UI for Organization Managers and Admins.
    - Adding advanced campaign management features (edit, deactivate/activate, view detailed stats).
    - Implementing the frontend page for public campaign links (`/join?campaign={id}`).
    - Thorough end-to-end testing of all campaign flows.
- **Campaign Reactivation Feature (Completed 2025-05-29):**
    - Added `activateCampaign` Cloud Function to set an inactive campaign's status to 'active'.
    - Implemented UI in `CampaignsTable.tsx` with a "Reactivate" button and confirmation dialog (`ConfirmActivateCampaignDialog.tsx`).
    - Updated text in `ConfirmDeactivateCampaignDialog.tsx` to reflect that reversal is now possible.
    - Ensured type definitions for `ActivateCampaignData` are present in both `functions/src/types.ts` and `src/types/index.ts`.
- **Campaign Table Actions & View Details Page (Frontend - 2025-05-30):**
    - Completed enhancements to `src/components/PropertyManager/Campaigns/CampaignsTable.tsx` and associated features.
    - **Actions Implemented:** "Edit", "Deactivate", "Reactivate" (previously completed on 2025-05-29), and "Delete". These actions open respective modals/dialogs and call corresponding Cloud Functions.
    - **View Details Page:** The "View Details" menu item now navigates to a functional page (e.g., `/campaigns/{campaignId}`) displaying detailed campaign information, including (or providing a way to view) accepted residents.
    - Implemented permission checks for enabling/disabling these menu items based on user role and campaign ownership/status.
    - Added Snackbar notifications for success/failure of these operations.
    - Corresponding Cloud Functions (`updateCampaign`, `deactivateCampaign`, `deleteCampaign`) are implemented.
- **Public Campaign Link Flow Rearchitected & Fixed (Frontend URL - 2025-05-30):**
    - Modified `functions/src/callable/createCampaign.ts`:
        - Generates `accessUrl`s for "public_link" campaigns that point to a new frontend route (`/join-public-campaign?campaign={campaignId}`). The base URL for this link uses `functions.config().app.domain`.
        - Stores the campaign document's ID in a new field named `id` within the document itself to facilitate querying by the `processPublicCampaignLink` function.
    - Created a new callable Cloud Function `functions/src/callable/processPublicCampaignLink.ts`:
        - Handles validation of the campaign by querying the `campaigns` collection group using the `id` field (matching the `campaignId` from the URL) and `status: 'active'`.
        - Creates the invitation document when triggered by the new frontend handler page.
    - Created a new frontend page `src/pages/PublicCampaignHandlerPage.tsx` at the `/join-public-campaign` route. This page calls `processPublicCampaignLink` and then navigates the user to `/join-campaign` with the necessary parameters.
    - Decommissioned the `functions/src/http/handleCampaignSignUpLink.ts` HTTP function for this flow (export removed, file deleted).
    - This resolves the previous "internal error" caused by an incorrect collection group query.
- **Phoenix Integration:** (Ongoing) Job querying, service request dispatch, services querying.
- **Custom GPTChat Model Integration:** (Ongoing) For residents.
- **Dashboard Data Visualizations & Statistics:** (Ongoing) Initial implementations.

## 2. Recent Changes & Activities

- **Resident Invitation Campaigns Feature (Backend & Initial Frontend - 2025-05-29):**
    - **Concept:** Introduced "Campaigns" as a unified system for resident invitations, supporting bulk CSV imports and shareable public links/QR codes with usage limits and expiration dates.
    - **Backend Implementation:**
        - **Firestore Rules:** Added security rules for the new `organizations/{orgId}/properties/{propId}/campaigns/{campaignId}` subcollection, including helper functions for validation.
        - **`createCampaign` (v1 Callable Function):**
            - Handles creation of `csv_import` and `public_link` campaigns.
            - For CSVs: Processes files uploaded to Firebase Storage (`campaign_csvs_pending/`), creates individual `invitations` linked to the campaign (triggering emails), and moves processed CSVs to `campaign_csvs_processed/`.
            - For Public Links: Generates a unique frontend `accessUrl` and stores the campaign's document ID in an `id` field (e.g., `id: campaignRef.id`) within the campaign document data.
        - **`processPublicCampaignLink` (v1 Callable Function - New):**
            - Called by the new `PublicCampaignHandlerPage.tsx`.
            - Validates the campaign by querying the `campaigns` collection group using `where('id', '==', campaignIdFromUrl)` and `where('status', '==', 'active')`. Dynamically creates an `invitations` document. Returns invitation details to the frontend.
        - **`handleCampaignSignUpLink` (v1 HTTP Function - Decommissioned for this flow):**
            - Previously triggered by `accessUrl`. Its functionality is now handled by `processPublicCampaignLink` (callable) and the frontend handler page.
        - **`signUpWithInvitation` (v2 Callable Function - Updated):**
            - Modified to check for a `campaignId` on accepted invitations.
            - If present, atomically increments `totalAccepted` on the campaign document and updates its status (e.g., "completed", "expired") based on `maxUses` or `expiresAt`.
        - **`cleanupProcessedCampaignCSVs` (v2 Scheduled Function):**
            - Runs daily to delete CSV files older than 30 days from `campaign_csvs_processed/` and `campaign_csvs_failed/` folders in Firebase Storage.
        - **Dependencies:** Added `csv-parse` (functions) and `@types/express` (functions).
    - **Frontend Implementation (Property Manager Scope):**
        - **Dependency:** Added `qrcode.react` (root project).
        - **Type Definitions (`src/types/index.ts`):** Added `Campaign`, `CampaignStatus`, and `CampaignType` interfaces/types.
        - **`CreateCampaignModal.tsx`:** New modal for PMs to create campaigns. Includes form fields for name, type, max uses, expiry. Handles CSV upload to Firebase Storage, calls `createCampaign` function, and displays `accessUrl`/QR code for public links.
        - **`CampaignsTable.tsx`:** New component to display a list of campaigns for a selected property, showing key details and status with real-time updates from Firestore.
        - **`PropertyCampaignsView.tsx`:** New container component integrating the creation modal button and the campaigns table.
        - **`PropertyManagerDashboardPanel.tsx` Integration:** Added a new "Campaigns" tab, utilizing `PropertySelectorDropdown` and embedding `PropertyCampaignsView` for campaign management per property.
    - **Development Note:** Encountered and worked through TypeScript type resolution challenges, particularly with v1 vs. v2 Firebase Function signatures (`CallableContext`, `EventContext`, `onCall`, `onRequest`, `Response`). Strategies included explicit v1 type imports and, as a last resort for `createCampaign.ts` and `handleCampaignSignUpLink.ts`, using `write_to_file` to ensure semantically correct v1 code despite persistent local type errors. The scheduled function `cleanupProcessedCampaignCSVs` was implemented using v2 `onSchedule` syntax to resolve type issues.

- **Major Feature Completions (2025-05-28):**
    - **Invitation System (Phase 3 - Refinement & Testing):** All invitation flows (Admin, OM, PM roles) thoroughly tested and verified, including email content/links and template seeding. (This is now superseded by the more advanced Campaign system for residents).
    - **Admin Dashboard - Properties Management:** CRUD operations for Admins to manage properties implemented and verified.
    - **Organization Manager Dashboard - Organization Creation UI:** UI enabling Organization Managers to create new organizations implemented and verified.
    - **Role-Based Management Capabilities Verified:** Confirmed that Admins can manage OMs, PMs, Properties, and Residents; OMs can manage PMs, Properties, and Residents for their assigned orgs; PMs can manage Properties and Residents for their org.

- **Google Places API Autocomplete Refactor (2025-05-25):**
  - Refactored address autocompletion in property forms to use the recommended `google.maps.places.PlaceAutocompleteElement` (Web Component) instead of the legacy `google.maps.places.Autocomplete`.
  - The `@react-google-maps/api` library is still used for `LoadScript` to load the Google Maps API.
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx`:
    - Implemented `useEffect` hooks to dynamically create, append, and manage the `PlaceAutocompleteElement`.
    - Styled the web component's input field to better match MUI's `TextField` appearance.
    - Attached `gmp-select` event listeners to the `PlaceAutocompleteElement` to retrieve selected place details.
    - Parsed `place.addressComponents` to populate form state for street, city, state (short code), and zip.
  - Ensured the `VITE_GOOGLE_MAPS_API_KEY` environment variable is used and its importance documented.
  - Addressed TypeScript errors related to the new API and potential null values.
- **Property Address Creation Fix (2025-05-27):**
  - Corrected an issue where new properties were saved with `undefined` city, state, and zip.
  - The `functions/src/callable/createProperty.ts` Cloud Function was updated to correctly process and store the full address object (`street`, `city`, `state`, `zip`) sent by `src/components/PropertyManager/CreatePropertyForm.tsx`.
  - This ensures consistency in address data between property creation and editing.
  - The `memory-bank/systemPatterns.md` already reflected the correct full address structure, so no changes were needed there.
- **Google Places Autocomplete Styling and UX (2025-05-25):**
  - Improved the input styling of the `PlaceAutocompleteElement` in `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx` to more closely match standard MUI `TextField` components, using `theme` variables for consistency.
  - Addressed the z-index issue of the autocomplete suggestions dropdown (`.pac-container`) by adding a global style in `src/index.css` to ensure it appears above MUI modals.
- **Organization Management Panel UI Enhancement (2025-05-25):**
  - Updated `src/components/Admin/OrganizationManagementPanel.tsx` to display the organization status using MUI `Chip` components for better visual distinction. Chip colors vary based on status (e.g., active, inactive, suspended). The chip label is now correctly Capitalized (Title Case, e.g., "Active").
  - Further updated `src/components/Admin/OrganizationManagementPanel.tsx` to display the `createdAt` field with both date and time (`toLocaleString()`) and center-aligned the "Created At" column header and cell content for improved readability.
- **Dashboard Component Refactor (2025-05-25):**
  - **Objective:** Improve maintainability and readability of `src/components/Dashboard.tsx` by extracting role-specific UI and logic into separate components. Also, remove all code comments from the affected files.
  - **New Components Created:**
    - `src/components/Dashboard/AdminDashboardPanel.tsx`: Encapsulates all UI and logic specific to the Admin role. This includes the admin tabs, organization selector, property manager management, organization management, and the "Add Organization" modal and associated snackbar feedback.
    - `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`: Encapsulates all UI and logic specific to the Property Manager role. This includes the PM tabs, property lists, resident invitation forms, property creation/editing modals, and organization name fetching.
  - **`src/components/Dashboard.tsx` Refactored:**
    - Simplified to primarily handle role-based conditional rendering of the new panel components (`AdminDashboardPanel`, `PropertyManagerDashboardPanel`) and the existing `ResidentDashboard`.
    - Retains general structure like displaying the logged-in user's email and the welcome message for users without specific roles.
    - All comments removed from `Dashboard.tsx`, `AdminDashboardPanel.tsx`, and `PropertyManagerDashboardPanel.tsx`.
  - **TypeScript Error Resolution:** Addressed a type mismatch for the `organizationId` prop passed to `PropertyManagerDashboardPanel` by using `organizationId ?? null`.
- **Firestore Rules Update (2025-05-25):**
  - Modified `firestore.rules` to allow residents to read the specific property document they belong to.
  - Added `allow read: if isResident() && isPropertyResident(organizationId, propertyId);` to the `match /organizations/{organizationId}/properties/{propertyId}` rule block.
- **Theme Persistence (2025-05-27):**
  - Updated `src/providers/ThemeProvider.tsx` to save and retrieve the selected theme mode (dark/light) from `localStorage`.
  - The theme now initializes from `localStorage` if a preference exists, otherwise defaults to system preference.
  - User's explicit theme choice via the toggle now overrides system preference and is persisted.
- **Organization Manager Dashboard Panel Refactor (2025-05-28):**
  - Combined the two main `Paper` components in `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx` into a single `Paper` component.
  - The `OrgScopedPropertyManagerManagement` component is now rendered within the main `Paper` component, maintaining visual spacing with a `Box` and `marginTop`.
- **Admin Organization Manager Assignment Feature (2025-05-28):**
  - **Backend:**
    - Updated `functions/src/callable/signUpWithOrgManagerInvitation.ts`, `addOrganizationToManager.ts`, and `createOrganization.ts` to denormalize and store an `assignedOrganizationIds: string[]` field in the Organization Manager's profile within the root `admins` collection. This array mirrors their custom claims and facilitates easier querying for the admin panel.
    - Created `functions/src/callable/assignOrganizationToManagerAdmin.ts`: Allows Super Admins to assign an organization to an OM. Updates claims, the `admins` profile (`assignedOrganizationIds`), and the OM's profile in the target organization's `users` subcollection.
    - Created `functions/src/callable/unassignOrganizationFromManagerAdmin.ts`: Allows Super Admins to unassign an organization from an OM. Updates claims, the `admins` profile (`assignedOrganizationIds`), and deletes the OM's profile from the unassigned organization's `users` subcollection.
    - Both new functions include admin role verification.
    - Exported new functions in `functions/src/index.ts`.
    - Resolved `no-else-return` ESLint issues in these new functions.
  - **Frontend:**
    - Created `src/components/Admin/OrganizationManagerAssignments.tsx`:
      - Displays a table of OMs with their managed organizations (as chips).
      - Allows unassigning orgs via chip delete action (calls `unassignOrganizationFromManagerAdmin`).
      - Allows assigning orgs via a modal (calls `assignOrganizationToManagerAdmin`).
    - Integrated this component into `src/components/Dashboard/AdminDashboardPanel.tsx`.
    - Resolved TypeScript `no-explicit-any` errors in `OrganizationManagerAssignments.tsx` by using the `isAppError` type guard.
  - **Documentation:**
    - Updated `memory-bank/systemPatterns.md` to document the new `assignedOrganizationIds` field in the `admins` collection data model, the new admin callable functions, and the preferred error handling pattern using `isAppError`.
- **Lost Password Functionality (2025-05-28):**
  - Created `src/pages/LostPasswordPage.tsx` to allow users to request a password reset email.
    - The page replicates the styling of `LoginForm.tsx`.
    - It uses `sendPasswordResetEmail` from Firebase auth.
    - Provides success and error feedback to the user.
  - Added a route `/lost-password` in `src/routes.tsx` for the new page.
  - Added a "Forgot password?" link on `src/components/LoginForm.tsx` navigating to the new page.

## 3. Next Steps

1.  **Resident Invitation Campaigns - Enhancements & Broader Rollout:**
    *   Implement Campaign Management UI for Organization Managers (similar to PMs, with org/property selection).
    *   Implement Campaign Management UI for Admins (global view/management capabilities).
    *   Ensure the new public campaign link flow (frontend URL -> `PublicCampaignHandlerPage.tsx` -> `processPublicCampaignLink` callable -> `JoinCampaignPage.tsx`) is fully integrated and functional.
    *   Conduct thorough end-to-end testing of all campaign creation (verifying new `accessUrl` format), public link usage, invitation, sign-up, and tracking flows.
2.  **Phoenix Integration:** (Ongoing)
    *   Implement job querying by Resident, Property, and Organization.
    *   Implement service request dispatch to Phoenix.
    *   Implement services querying from Phoenix.
3.  **Custom GPTChat Model Integration:** (Ongoing)
    *   Integrate chatbot into Resident dashboard.
    *   Evaluate PM access.
4.  **Dashboard Data Visualizations & Statistics:** (Ongoing)
    *   Implement metrics for all roles using Highcharts, including campaign performance data.
5.  **Extend `projectRoadmap.md`:** Document detailed plans for the remaining dashboard features and core systems, including the full scope of Invitation Campaigns.

## 4. Active Decisions & Considerations

- **Campaigns as a Unified Invitation Mechanism (Decision 2025-05-29):**
    - Adopted "Campaigns" as the central concept for managing various resident invitation methods.
    - Campaign types defined: `csv_import` (for bulk uploads) and `public_link` (for shareable URLs/QR codes).
    - Campaigns support parameters like `maxUses` and `expiresAt`.
- **Firebase Storage for CSVs with Scheduled Cleanup (Decision 2025-05-29):**
    - CSV files for `csv_import` campaigns are uploaded to Firebase Storage (`campaign_csvs_pending/`).
    - The `createCampaign` function processes these files and moves them to a `campaign_csvs_processed/` (or `campaign_csvs_failed/`) folder.
    - A daily scheduled Cloud Function (`cleanupProcessedCampaignCSVs`) will delete files older than 30 days from the processed/failed folders.
- **Public Campaign URL Generation and Handling Rearchitected & Fixed (Decision 2025-05-30):**
    - The `accessUrl` for "public_link" campaigns generated by `createCampaign.ts` now points to a frontend route (e.g., `/join-public-campaign?campaign={campaignId}`). The base URL for this link uses `functions.config().app.domain`.
        - `createCampaign.ts` also now stores the campaign document's ID in an `id` field (e.g. `id: campaignRef.id`) within the document data itself. This `id` field is used by `processPublicCampaignLink` for querying.
        - Emulator Example: `http://localhost:5173/join-public-campaign?campaign={campaignId}`
        - Production Example: `https://phoenix-property-manager-pro.web.app/join-public-campaign?campaign={campaignId}`
    - A new frontend page, `PublicCampaignHandlerPage.tsx` (at `/join-public-campaign`), handles this initial link.
    - This page calls a new callable Cloud Function, `processPublicCampaignLink.ts`.
    - `processPublicCampaignLink.ts` validates the campaign by querying the `campaigns` collection group using `where('id', '==', campaignIdFromUrl)` and `where('status', '==', 'active')`. It then creates an invitation document and returns details (like `invitationId`, `campaignId`, `organizationId`) to the `PublicCampaignHandlerPage.tsx`.
    - `PublicCampaignHandlerPage.tsx` then programmatically navigates the user to the existing `/join-campaign` frontend path, passing the necessary parameters.
    - The `handleCampaignSignUpLink.ts` HTTP function has been decommissioned for this flow. This new approach also resolves the "internal error" previously encountered with the HTTP function's collection group query.
- **Property Address Data Consistency (Decision 2025-05-27):**
  - Ensured that the `createProperty.ts` Cloud Function saves the full address (street, city, state, zip) as provided by the `CreatePropertyForm.tsx`. This aligns creation logic with edit logic and resolves issues with incomplete address data for new properties.
- **Google Places Autocomplete Styling (New Decision 2025-05-25):**
  - The input field for the `PlaceAutocompleteElement` in property forms will be styled using `theme` variables to align its appearance (font, padding, colors, borders) with standard MUI `TextFields`.
  - The suggestions dropdown (`.pac-container`) will have its `z-index` globally increased via `src/index.css` to ensure it displays correctly over modal dialogs.
- **UI Consistency (New Decision 2025-05-25):** Status indicators in tables (like in `OrganizationManagementPanel.tsx`) should use MUI `Chip` components for better visual feedback and consistency across different management panels.
- **Component Granularity (New Decision 2025-05-25):** Large, multi-functional components like the original `Dashboard.tsx` should be broken down into smaller, role-specific or feature-specific panels to improve maintainability, testability, and readability. This was applied to `Dashboard.tsx`.
- **Comment Removal (User Request 2025-05-25):** All code comments are to be removed from refactored components to rely on clear code structure for understanding.
- **RBAC Enhancement: Super Admin and Organization Manager Roles (New Decision 2025-05-26):**
  - The existing `admin` role is now designated as a "Super Admin" with global system access.
  - A new `organization_manager` role has been introduced.
    - `organization_manager` users are invited by Super Admins and assigned to one or more specific organizations.
    - Their access is scoped to their assigned organization(s) via an `organizationIds: string[]` custom claim.
    - They have their own dashboard panel (`OrganizationManagerDashboardPanel.tsx`) for managing their assigned organizations.
  - This change provides a clearer separation between global administration and tenant-specific (organization-level) administration.
  - Implemented necessary backend (Cloud Functions for invitations and claim updates, Firestore rules) and frontend (Auth context, ProtectedRoute, Dashboard panels) changes.
  - Documented in `systemPatterns.md` and `projectRoadmap.md`.
- **Organization Manager Invitation & Creation Enhancements (2025-05-26):**
  - **Invite Organization Manager Form (`src/components/Admin/InviteOrganizationManagerForm.tsx`):**
    - Layout optimized: Name and Email fields on a single row.
    - Organization selection is now a multi-select dropdown, allowing assignment to multiple organizations (or none) during invitation. Redundant labels removed.
  - **`createInvitation` Cloud Function (`functions/src/callable/createInvitation.ts`):**
    - Modified to accept an `organizationIds` array (or undefined) when an Admin invites an `organization_manager`.
    - All `organization_manager` invitations are now stored in the `globalInvitations` collection.
    - The invitation document stores the `organizationIds` array (or `null` if none were selected).
    - Email templates and links adjusted.
  - **`signUpWithInvitation` Cloud Function (`functions/src/callable/signUpWithInvitation.ts`):**
    - Updated to fetch `organization_manager` invitations from `globalInvitations`.
    - Sets the `organizationIds` custom claim based on the `organizationIds` array from the invitation (or an empty array if none).
    - Creates user profiles in each specified organization if `organizationIds` were provided in the invitation.
    - **Denormalization:** Ensures `assignedOrganizationIds` in the OM's `admins` profile is updated.
  - **`createOrganization` Cloud Function (`functions/src/callable/createOrganization.ts`):**
    - Permissions updated to allow users with the `organization_manager` role (in addition to `admin`) to create new organizations.
    - If an `organization_manager` creates an organization, they are automatically assigned to it:
        - Their `organizationIds` custom claim is updated with the new organization's ID.
        - Their user profile is created within the new organization's `users` subcollection.
        - **Denormalization:** Ensures `assignedOrganizationIds` in the OM's `admins` profile is updated.
  - **`addOrganizationToManager` Cloud Function (`functions/src/callable/addOrganizationToManager.ts`):**
    - When an admin assigns an existing OM to an organization, this function updates their claims.
    - **Denormalization:** Ensures `assignedOrganizationIds` in the OM's `admins` profile is updated, and their profile is created/updated in the target organization's `users` subcollection.
- **Error Handling Pattern (New Decision 2025-05-28):**
  - Use `catch (err: unknown)` for error handling.
  - Employ the `isAppError` type guard (from `src/utils/errorUtils.ts`) along with the `AppError` interface (`src/types/index.ts`) to safely access error messages and codes.
  - This pattern is documented in `memory-bank/systemPatterns.md`.

## 5. ImportantPatterns & Preferences

- **Modular Component Design:** Favor breaking down large components into smaller, more focused ones.
- **Clear Code Over Comments:** Strive for self-documenting code, reducing the need for explanatory comments, especially for straightforward UI logic.
- **Explicit Handling of Optionality:** When a previously required field (like `organizationId` for OM invites) becomes optional, ensure backend, frontend, and data models are consistently updated to reflect this.
- **Standard Dialog Styling (New Preference 2025-05-28):**
    - **Title Border:** Use the `dividers` prop on the `<DialogContent>` component to create a visual separation below the `<DialogTitle>`.
    - **Input Fields (`TextField`):** Default to `variant="outlined"`.
    - **Primary Action Button (e.g., "Save", "Update", "Create"):** Style with `variant="contained"` and `color="primary"`.
    - **Cancel Button:** Style with `variant="outlined"` and `color="error"`.

## 6. Learnings & Project Insights

- **Refactoring Impact:** Breaking down large components significantly improves the clarity of the main component and makes individual role-based functionalities easier to manage and understand.
- **Prop Drilling vs. Context:** While refactoring, it's important to consider if props are being passed down too many levels. For the current Dashboard refactor, direct prop passing was manageable. For more deeply nested structures, React Context or state management libraries might be considered.
- **TypeScript Prop Validation:** Strict prop type checking (like the one caught for `organizationId`) helps maintain component contracts and prevent runtime errors.
- **Organization Manager Data Model & Query (New Learning 2025-05-27):**
  - Clarified that Organization Manager profiles (users with `roles: ["organization_manager"]`) are stored in the root `admins` collection, alongside Super Admins, not in `organizations/{orgId}/users/` as previously assumed for their primary listing.
  - The Firestore query in `src/components/Admin/AssignOrgToManagerForm.tsx` to list these managers was successfully fixed by changing `collectionGroup(db, 'admins')` to `collection(db, 'admins')`. This more specific query against the root collection resolved the "no matching allow statements" error, working correctly with existing security rules and indexes.
  - `memory-bank/systemPatterns.md` has been updated to reflect this data model for Organization Managers.

- **Clarification of Invitation Sign-Up Cloud Functions (2025-05-27):**
  - Analyzed `functions/src/callable/signUpWithInvitation.ts` and `functions/src/callable/signUpWithOrgManagerInvitation.ts`.
  - `signUpWithInvitation.ts` is a general handler for various roles. It can process Organization Manager invitations from `globalInvitations` and set claims/create profiles in `organizations/{orgId}/users/`. However, it does *not* create a profile for the OM in the root `admins` collection.
  - `signUpWithOrgManagerInvitation.ts` is specific to Organization Manager invitations. Its key distinct function is creating/merging the OM's profile in the root `admins/{uid}` collection, which is essential for Super Admin management. It also creates profiles in `organizations/{orgId}/users/` if initial organizations are assigned.
  - This confirms both functions serve distinct purposes, with `signUpWithOrgManagerInvitation.ts` being critical for the complete OM onboarding process including their `admins` profile. The frontend likely uses `AcceptOrgManagerInvitationPage.tsx` to call this specific function.

- **Analysis of `processSignUp.ts` Auth Trigger (2025-05-27):**
  - Reviewed `functions/src/auth/processSignUp.ts`.
  - This `onCreate` Firebase Auth trigger correctly identifies Super Admin users (based on email domain/list) and sets their `roles: ['admin']` custom claim and creates their profile in the `admins` Firestore collection.
  - Crucially, for all other non-Super-Admin users, this function *intentionally does not* set any default custom claims (like `pending_association`) or create any Firestore profiles.
  - It defers all claim-setting and profile creation for invited users (Organization Managers, Property Managers, Residents) to the specific callable invitation functions (`signUpWithInvitation.ts`, `signUpWithOrgManagerInvitation.ts`). This is a deliberate design to prevent race conditions and ensure the invitation flows are the source of truth for these users' setup.
  - This clarifies that any previous understanding of `processSignUp.ts` setting default roles like `pending_association` for non-admin direct sign-ups is outdated by the current implementation.
- **TypeScript Type Challenges with Mixed Firebase Functions Versions (Learning 2025-05-29):**
  - Encountered persistent TypeScript type resolution issues when using v1 Firebase Function constructs (e.g., `functions.https.onCall`, `functions.pubsub.schedule`, `CallableContext`, `EventContext`, `functions.Response`) alongside v2 constructs or in an environment where v2 types might be preferentially inferred.
  - Required explicit v1 type imports (e.g., `import { CallableContext } from 'firebase-functions/v1/https';`) and careful attention to function signatures.
  - In some cases, `write_to_file` was used as a fallback for Cloud Function implementation if `replace_in_file` repeatedly failed due to these subtle type errors that might not affect actual deployment but hindered local type checking.
    - One scheduled function (`cleanupProcessedCampaignCSVs`) was implemented using the v2 `onSchedule` syntax to bypass v1 type resolution problems for `functions.pubsub.schedule`. This highlights the need for vigilance when mixing v1/v2 function patterns.

- **Timestamp Error in `createCampaign` Function (Fix 2025-05-29):**
    - Resolved a `TypeError: Cannot read properties of undefined (reading 'Timestamp')` in `functions/src/callable/createCampaign.ts`.
    - The error was due to using an uninitialized `admin.firestore.Timestamp`.
    - **Fix:**
        - Modified `functions/src/firebaseAdmin.ts` to export `Timestamp` from the initialized `firebase-admin/firestore`.
        - Updated `functions/src/callable/createCampaign.ts` to import `Timestamp` from `../firebaseAdmin.js` and use this imported `Timestamp` for all timestamp operations and type definitions, removing the direct uninitialized `import * as admin from 'firebase-admin';`.
- **Organization Selector Bug Fix (2025-05-30):**
    - Corrected the `useEffect` hook in `src/components/Admin/OrganizationSelector.tsx`.
    - Added `managedOrganizationIds`, `selectedOrganizationId`, and `onOrganizationChange` to its dependency array.
    - The effect now correctly re-fetches organizations if `managedOrganizationIds` change (for OMs).
    - It also clears the parent's selected organization (`onOrganizationChange(null)`) if the currently selected organization is no longer in the available list (e.g., OM's assignments change, or an admin-selected org is deleted/filtered out).
    - This aims to prevent stale selections and ensure dependent components (like `PropertySelectorDropdown`) receive consistent and valid `organizationId` props.
- **Property Manager Campaign View Fix (2025-05-30):**
    - Updated `src/components/Dashboard/PropertyManagerDashboardPanel.tsx` to conditionally render `PropertySelectorDropdown` only when `organizationId` (derived from props/auth claims) is truthy.
    - This resolves TypeScript errors and ensures `PropertySelectorDropdown` always receives a valid `string` for its `organizationId` prop, preventing the "Organization ID not provided. Cannot load properties." error for Property Managers.
