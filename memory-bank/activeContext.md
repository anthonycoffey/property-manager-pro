# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

The current focus is on refactoring UI components for better maintainability and readability, starting with the main Dashboard.

## 2. Recent Changes & Activities

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

## 3. Next Steps

- **Continue UI Refinements:** Identify other large components or sections that could benefit from similar refactoring to enhance modularity.
- **Invitation System (Phase 3 - Refinement & Testing):**
  - Thoroughly test all invitation flows: Admin invites PM, PM creates Property, PM invites Resident (including the new dynamic property selection), invitee accepts and signs up (email/password and social).
  - Verify email content and links.
  - Manually add email templates from `docs/` to Firestore `templates` collection if not already done (can use the enhanced `seedTemplates.js` script for this).
- **Admin Dashboard - Properties Management:**
  - Begin implementation of property CRUD operations for Admins as per project roadmap.
- **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md`.

## 4. Active Decisions & Considerations

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
  - **`createOrganization` Cloud Function (`functions/src/callable/createOrganization.ts`):**
    - Permissions updated to allow users with the `organization_manager` role (in addition to `admin`) to create new organizations.
    - If an `organization_manager` creates an organization, they are automatically assigned to it:
        - Their `organizationIds` custom claim is updated with the new organization's ID.
        - Their user profile is created within the new organization's `users` subcollection.

## 5. ImportantPatterns & Preferences

- **Modular Component Design:** Favor breaking down large components into smaller, more focused ones.
- **Clear Code Over Comments:** Strive for self-documenting code, reducing the need for explanatory comments, especially for straightforward UI logic.
- **Explicit Handling of Optionality:** When a previously required field (like `organizationId` for OM invites) becomes optional, ensure backend, frontend, and data models are consistently updated to reflect this.

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
