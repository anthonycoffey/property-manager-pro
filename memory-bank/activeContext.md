# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

With the "Admin Property Manager Management Panel Overhaul" (Step 4 from `docs/04-admin-pm-management-plan.md`) now complete, the focus shifts to the next items on the project roadmap. This could include further enhancements to the Admin Dashboard (e.g., Property Management) or completing the Invitation System refinements.

## 2. Recent Changes & Activities

- **RBAC and Firestore Implementation Plan Documented:** Created `docs/02-rbac-firestore-implementation.md` detailing the comprehensive plan for multi-tenant RBAC and Firestore integration.
- **Firebase Project Setup & Initial Firestore Structure (Phase 1 Completed):**
  - Confirmed Firebase project initialization and Firestore enablement.
- **Firebase Authentication & Custom Claims (Phase 2 Completed):**
  - **Updated `processSignUp` Cloud Function (`functions/src/index.ts`):** Migrated from a blocking `beforeUserCreated` trigger to a non-blocking `functions.auth.user().onCreate` (1st gen) trigger. Implemented custom claims logic to assign `admin: true` and `accessLevel: 9` for users with `@admin.example.com` emails, and default `resident` roles for others. The `user` parameter is typed as `admin.auth.UserRecord`.
  - **Replaced `firebase-functions/logger` with `console.log`:** All `logger.info` and `logger.error` calls in `functions/src/index.ts` have been replaced with `console.log` and `console.error` respectively, as per user instruction.
  - Resolved persistent TypeScript module resolution errors for `firebase-functions/v2/identity` by identifying the correct import (`beforeUserCreated` from `firebase-functions/v2/identity`) and ensuring `tsconfig.json` was correctly configured (`skipLibCheck: true`, `types: ["node", "firebase-functions"]`, `moduleResolution: "nodenext"`). (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
  - Updated `src/hooks/useAuth.ts` (`CustomUser` type, `AuthContextType` with roles/IDs) and `src/providers/AuthProvider.tsx` (fetching and providing custom claims from `getIdTokenResult`).
- **Firestore Security Rules (Phase 3 Completed):**
  - Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`. These rules control access to `admins`, `organizations`, and their nested `users`, `properties`, `residents`, `invitations`, and `services` collections based on user roles (`request.auth.token.roles`) and assigned IDs (`request.auth.token.organizationId`, `request.auth.token.propertyId`).
- **Frontend Integration & UI Adaptation (Phase 4 Completed):**
  - Updated `src/components/ProtectedRoute.tsx` to enforce route protection based on `allowedRoles`, `requiredOrgId`, and `requiredPropertyId`.
  - Modified `src/components/Dashboard.tsx` to conditionally render content based on the logged-in user's roles and assigned IDs.
- **Multi-Tenancy Sign-Up Logic Implemented (2025-05-23):**
  - **Modified `processSignUp` Cloud Function (`functions/src/auth/processSignUp.ts`):**
    - Admin users (`*@24hrcarunlocking.com`) now have their profiles created in the `admins/{uid}` Firestore collection.
    - Direct non-admin sign-ups are assigned a `{ roles: ['pending_association'] }` custom claim. **No Firestore document is created for these users by `processSignUp` anymore.** The temporary profile creation in the root `users/{uid}` collection has been removed.
    - The check in `processSignUp` to skip logic if an `organizationId` claim already exists was removed as it was ineffective due to execution order.
  - **`signUpWithInvitation` HTTPS Callable Cloud Function (`functions/src/callable/signUpWithInvitation.ts`):**
    - This function remains the authority for invited user sign-ups. It sets all necessary custom claims (overwriting any defaults from `processSignUp`) and creates user profiles directly in the correct multi-tenant Firestore paths.
- **Firestore Security Rules (`firestore.rules`):**
  - Rules for the root `/users` collection have been removed, as this collection is no longer used for `pending_association` profiles.
- **Initial Feature Development (Admin Dashboard - Property Manager CRUD) (Phase 5 Started/Partially Completed):**
  - Created the `src/components/Admin` directory and the `src/components/Admin/PropertyManagerManagement.tsx` component as a starting point for the Admin Dashboard.
  - Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions (now in `functions/src/callable/`).
  - Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
- **Deployment Configuration Updated:** Modified `apphosting.yaml` to include `build` and `release` configurations for Firebase App Hosting, ensuring correct deployment of the Vite application.
- **Resolved Firebase Admin SDK Initialization Error:** Changed `import * as admin from 'firebase-admin';` to `import admin from 'firebase-admin';` in `functions/src/index.ts` to resolve `TypeError: admin.initializeApp is not a function` during Firebase Functions deployment in an ES module environment.
- **Removed Token Refresh Mechanism from `processSignUp` (2025-05-23):**
  - Modified `functions/src/index.ts` to completely remove any explicit server-side mechanism (previously Firestore-based `userTokenRefreshFlags`, and before that Realtime Database) for signaling client-side token refresh after custom claims are set in the `processSignUp` function.
  - Removed the `userTokenRefreshFlags` collection rules from `firestore.rules`.
  - This simplifies the `processSignUp` function. The client will rely on its own logic (e.g., periodic refresh, refresh on specific actions, or manual refresh by user) to get updated tokens with new claims.
- **Resolved Authentication Race Condition (2025-05-23):**
  - Investigated and resolved a race condition where users (especially new signups) were incorrectly redirected from protected routes due to premature evaluation of auth state.
  - Refactored `src/providers/AuthProvider.tsx` to use a two-stage `useEffect` process:
    1.  One `useEffect` subscribes to `onAuthStateChanged` and updates a raw `firebaseUser` state.
    2.  A second `useEffect` reacts to changes in `firebaseUser`, synchronously sets a `loading` state to `true` if processing is needed, asynchronously fetches claims, updates the main `currentUser` context, and then sets `loading` to `false`.
  - This ensures the `loading` state accurately reflects the auth processing period, preventing `ProtectedRoute` from making decisions based on stale or incomplete context.
  - Restored `src/components/ProtectedRoute.tsx` to enforce role and ID checks after confirming the fix.
- **Invitation System Implementation (Phase 1 - Backend & Core UI) (2025-05-23):**
  - **Documented Plan:** Created `docs/03-invitation-system-plan.md`.
  - **Cloud Functions:**
    - Added `createInvitation` callable Cloud Function to `functions/src/index.ts` for generating invitation records and triggering emails.
    - Added `createProperty` callable Cloud Function to `functions/src/index.ts` for property managers to create properties.
    - Added `crypto` import to `functions/src/index.ts`.
  - **Firestore Security Rules:** Updated `firestore.rules` to include rules for the `organizations/{orgId}/invitations` subcollection.
  - **Email Templates:** Created JSON structures for `propertyManagerInvitation` and `residentInvitation` email templates in `docs/` for manual Firestore setup.
  - **UI Components (Initial Forms):**
    - Created `src/components/Admin/InvitePropertyManagerForm.tsx`.
    - Created `src/components/PropertyManager/CreatePropertyForm.tsx`.
    - Created `src/components/PropertyManager/InviteResidentForm.tsx`.
  - **TypeScript Fixes:** Corrected `currentUser` property access in the new form components to use destructured `roles` and `organizationId` from `useAuth()`. Addressed MUI `Grid` `item` prop usage in `CreatePropertyForm.tsx`.
- **Invitation System (Phase 2 - Dynamic Templates & UI Integration) (2025-05-23):**
  - **Dynamic Email Templates:**
    - Updated `createInvitation` Cloud Function in `functions/src/index.ts` to use dynamic `appDomain` (from Firebase project ID), `appName` (placeholder), and `inviterName` (from auth token or Firestore profile) in email template data.
    - Updated `docs/propertyManagerInvitation.json` and `docs/residentInvitation.json` to include `{{ appName }}` and `{{ inviterName }}` placeholders.
  - **Dashboard Integration:**
    - Modified `src/components/Dashboard.tsx` to include tabs for Admin and Property Manager roles, integrating:
      - `InvitePropertyManagerForm.tsx` and `PropertyManagerManagement.tsx` for Admins.
      - `CreatePropertyForm.tsx` and `InviteResidentForm.tsx` (with a placeholder `propertyId`) for Property Managers.
  - **Accept Invitation Page:**
    - Created `src/pages/AcceptInvitationPage.tsx` to handle invitation tokens from URL, display a sign-up form, and call `signUpWithInvitation` Cloud Function.
    - Added a route for `/accept-invitation` in `src/routes.tsx` pointing to `AcceptInvitationPage.tsx`.
  - **TypeScript Refinements (Cloud Functions):**
    - Replaced `any` types in `functions/src/index.ts` with specific interfaces (`UserProfileData`, `InvitationData`, `EmailTemplateData`) for improved type safety in `signUpWithInvitation` and `createInvitation` functions.
- **Admin Property Manager Management Panel Overhaul (Step 4 from `docs/04-admin-pm-management-plan.md`) (2025-05-24):**
  - **Phase 0: Organization Context Switcher:**
    - Created `src/components/Admin/OrganizationSelector.tsx` to allow Admins to select an organization.
    - Integrated `OrganizationSelector` into `src/components/Dashboard.tsx`, passing the selected `organizationId` to `PropertyManagerManagement.tsx`.
  - **Phase 1: Backend Adjustments:**
    - Implemented the `revokeInvitation` Cloud Function in `functions/src/index.ts` for Admins to cancel pending invitations.
  - **Phase 2: Frontend UI/UX Overhaul (`src/components/Admin/PropertyManagerManagement.tsx`):**
    - Removed the manual Property Manager creation form.
    - Implemented conditional data fetching (active PMs and pending PM invitations) based on the selected `organizationId`.
    - Created a unified MUI `Table` to display both active PMs and pending invitations.
    - Implemented actions for:
      - **Update PM:** Opens a dialog to edit `displayName` and `email`. Calls `updatePropertyManager` Cloud Function.
      - **Delete PM:** Opens a confirmation dialog. Calls `deletePropertyManager` Cloud Function.
      - **Revoke Invitation:** Opens a confirmation dialog. Calls `revokeInvitation` Cloud Function.
    - Added loading states and Snackbar feedback for all actions.
  - **Phase 3: Visual Design & User Experience:**
    - Core UX requirements (clear list, status chips, intuitive actions, loading indicators, feedback) addressed through MUI components and implementation choices in Phase 2.
- **Admin Dashboard - Organization Management Panel Implemented (2025-05-24):**
  - Enhanced `src/components/Admin/OrganizationManagementPanel.tsx` to:
    - Fetch and display a list of organizations from Firestore.
    - Integrate `src/components/Admin/AddOrganizationModal.tsx` for creating new organizations.
    - Create and integrate `src/components/Admin/EditOrganizationModal.tsx` for updating organization name and status.
  - Corrected `Organization` interface to use `createdBy` instead of `ownerId`.
  - Fixed TypeScript import issues (type-only imports for interfaces, `.js` extension for relative imports in Firebase Functions).
- **Firebase Functions Refactoring (2025-05-24):**
  - All Cloud Functions previously in `functions/src/index.ts` were refactored into individual files under `functions/src/auth/` and `functions/src/callable/` directories.
  - Created `functions/src/firebaseAdmin.ts` for shared Firebase Admin SDK initialization.
  - Created `functions/src/helpers/handleHttpsError.ts` for a shared error handling utility.
  - The main `functions/src/index.ts` now only re-exports these individual functions.
  - Added new callable Cloud Functions:
    - `functions/src/callable/updateOrganization.ts`: For updating organization details.
    - `functions/src/callable/deactivateOrganization.ts`: For soft-deleting (deactivating) organizations.
  - Ensured all relative imports in the `functions/src` directory use the `.js` extension as required by the TypeScript configuration.
- **Admin Invite Property Manager Form Enhancement (2025-05-24):**
  - Modified `src/components/Admin/InvitePropertyManagerForm.tsx` to accept `selectedOrganizationId` as a prop.
  - The Organization ID field in this form is now pre-filled and disabled, based on the organization selected in `OrganizationSelector.tsx` on the `Dashboard`.
  - Updated `src/components/Dashboard.tsx` to pass the `selectedAdminOrgId` to `InvitePropertyManagerForm.tsx`.
- **Social Sign-On for Accept Invitation Page (2025-05-24):**
  - Enhanced `src/pages/AcceptInvitationPage.tsx` to include "Sign up with Google" and "Sign up with Microsoft" buttons.
  - Implemented logic to use `signInWithPopup` for social authentication.
  - The `processSocialSignUp` helper function in `AcceptInvitationPage.tsx` now calls the `signUpWithInvitation` Cloud Function, passing the `uid`, `email`, and `displayName` from the social provider.
  - Modified `functions/src/callable/signUpWithInvitation.ts` to:
    - Accept an optional `uid` (for pre-authenticated social sign-on users) and make `password` optional.
    - If `uid` is provided, skip Firebase Auth user creation (`admin.auth().createUser()`) and use the existing `uid`.
    - Perform server-side validation to ensure the email from the social provider matches the email on the invitation document.
    - Use the display name from the social provider for the Firestore user profile.
- **Accept Invitation Page Enhancements (Readonly Email & Pre-fill) (2025-05-24):**
  - Created and exported a new callable Cloud Function `getInvitationDetails` (`functions/src/callable/getInvitationDetails.ts`) to securely fetch invitation email based on token and organization ID.
  - Updated `src/pages/AcceptInvitationPage.tsx` to:
    - Call `getInvitationDetails` on component mount using the token and orgId from URL.
    - Pre-fill the email field with the fetched email from the invitation.
    - Make the email field readonly.
    - Handle loading states while fetching invitation details and disable form submission until details are loaded or if an error occurs.
    - Improved error handling for invalid/expired invitation links based on `getInvitationDetails` response.
  - Corrected the `UserCredential` import in `AcceptInvitationPage.tsx` to `type UserCredential` to resolve a previous syntax error.
- **Property Manager Dashboard - Dynamic Property Selection for Resident Invitations (2025-05-24):**
  - Created `src/components/PropertyManager/PropertyManagerPropertiesList.tsx` to allow PMs to view and select their managed properties.
  - Integrated `PropertyManagerPropertiesList` into `src/components/Dashboard.tsx` for the Property Manager role.
- **Seed Script Enhancement (`scripts/seedTemplates.js`) (2025-05-24):**
  - Modified the script to accept an `--env` command-line flag (`emulator` or `production`).
  - Defaults to `emulator` if no flag is provided, automatically setting `FIRESTORE_EMULATOR_HOST="localhost:8080"` if not already set.
  - If `--env=production` is used, it prompts the user for explicit confirmation ("Y" or "yes") before attempting to connect to the live Firestore database, as a safety measure.
  - Updated logging to clearly indicate the target environment.
- **Property Manager Panel UI/UX Refactor (2025-05-24):**
  - Modified `src/components/Dashboard.tsx` for the Property Manager role:
    - The panel title now fetches and displays the Organization Name instead of just the ID.
    - Removed the "Create Property" tab.
    - Added a "Create Property" button that opens an MUI Dialog modal containing the `CreatePropertyForm.tsx`.
    - `CreatePropertyForm.tsx` was updated to accept an `onSuccess` callback to close the modal.
    - The "Invite Resident" tab now includes its own instance of `PropertyManagerPropertiesList` to act as a property selector, directly driving the `InviteResidentForm`.
    - The "My Properties" tab continues to list properties using `PropertyManagerPropertiesList`.
  - This aligns the Property Manager property creation flow with the modal-based pattern used in the Admin panel (e.g., "Add Organization") and clarifies the property selection process for inviting residents.
- **Property Manager Panel Enhancements (Further Refactor - 2025-05-24):**
  - **`PropertyManagerPropertiesList.tsx`:**
    - Refactored to display properties in an MUI `Table` instead of a `List`.
    - Table columns now show "Property Name" and formatted "Address" (instead of Property ID).
    - Table rows remain clickable for selection.
  - **New `PropertySelectorDropdown.tsx` Component:**
    - Created to provide a dedicated dropdown for selecting a property.
    - Fetches properties managed by the PM and displays them (Name and Address) in an MUI `Select` component.
  - **`Dashboard.tsx` (Property Manager Panel):**
    - The "My Properties" tab now uses the table-based `PropertyManagerPropertiesList.tsx`.
    - The "Invite Resident" tab now uses the new `PropertySelectorDropdown.tsx` for property selection, followed by a `Divider` and then the `InviteResidentForm.tsx`. This layout mimics the Admin panel's invitation forms.
- **Property Manager Panel Refinements (Feedback-based - 2025-05-24):**
  - **`InviteResidentForm.tsx`:**
    - Title now displays the selected property's name (e.g., "Invite New Resident to: {PropertyName}") instead of its ID.
    - Email input field and "Send Invitation" button are now on the same row for a more compact layout.
  - **`PropertySelectorDropdown.tsx`:**
    - Callback `onPropertyChange` now correctly provides both `propertyId` and `propertyName` to the parent.
  - **`Dashboard.tsx` (Property Manager Panel):**
    - State variables `selectedPropertyIdForPM` and `selectedPropertyNameForPM` renamed to `selectedPropertyId` and `selectedPropertyName` respectively. Handler `handlePropertySelectForPM` renamed to `handlePropertySelect`.
    - `selectedPropertyName` is now passed to `InviteResidentForm.tsx`.
    - The `Divider` between the property selector dropdown and the invitation form in the "Invite Resident" tab has been removed for a more unified section.
    - Resolved TypeScript errors related to prop type mismatches for selection handlers.
- **Resolved Custom Claim Overwrite for Invited Users (2025-05-24):**
  - Modified `functions/src/auth/processSignUp.ts` (the `auth.onCreate` trigger) to check for existing `organizationId` custom claims on a new user before attempting to set default `pending_association` claims.
  - If an `organizationId` claim is present (indicating the user was likely processed by `signUpWithInvitation.ts`), `processSignUp.ts` now skips setting its default claims, preventing the overwrite of roles (e.g., "resident") and other claims (`organizationId`, `propertyId`) set by the invitation flow.
  - This ensures that custom claims set during the invitation acceptance process (e.g., for residents) are correctly persisted.
- **Google Places API Autocomplete for Property Address (2025-05-25):**
  - Integrated Google Places API for address autocompletion in property forms.
  - Used `@react-google-maps/api` library.
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx`.
  - The "Street Address" field now provides autocomplete suggestions.
  - Selecting an address populates the street, city, state (using short code), and zip code fields.
  - Updated state `Select` components to use a mapping of US state names to short codes for consistency.
  - Added `VITE_GOOGLE_MAPS_API_KEY` to `.env` (assumed to be gitignored) and documented its use.

## 3. Next Steps

- **Invitation System (Phase 3 - Refinement & Testing):**
  - Thoroughly test all invitation flows: Admin invites PM, PM creates Property, PM invites Resident (including the new dynamic property selection), invitee accepts and signs up (email/password and social).
  - Verify email content and links.
  - Manually add email templates from `docs/` to Firestore `templates` collection if not already done (can use the enhanced `seedTemplates.js` script for this).
- **Admin Dashboard - Properties Management:**
  - Begin implementation of property CRUD operations for Admins as per project roadmap.
- **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md`.
  - Updated `Dashboard.tsx` to manage `selectedPropertyIdForPM` state.
  - Modified the Property Manager section in `Dashboard.tsx` to include tabs for "My Properties" and "Invite Resident".
  - The `InviteResidentForm` in `Dashboard.tsx` now receives the dynamic `selectedPropertyIdForPM` and `organizationId`, and conditionally renders an `Alert` if no property is selected.
  - Corrected TypeScript errors in `PropertyManagerPropertiesList.tsx` related to Firestore import and `organizationId` access.
  - Confirmed `InviteResidentForm.tsx` correctly uses the passed `organizationId` and `propertyId` props.

## 3. Next Steps

- **Invitation System (Phase 3 - Refinement & Testing):**
  - Thoroughly test all invitation flows: Admin invites PM, PM creates Property, PM invites Resident (including the new dynamic property selection), invitee accepts and signs up (email/password and social).
  - Verify email content and links.
  - Manually add email templates from `docs/` to Firestore `templates` collection if not already done.
- **Admin Dashboard - Properties Management:**
  - Begin implementation of property CRUD operations for Admins as per project roadmap.
- **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md`.

## 4. Active Decisions & Considerations

- **Property Manager Dashboard UI:** Decided to use a tabbed interface in `Dashboard.tsx` for Property Managers to switch between viewing their properties and inviting residents. This keeps the UI organized.
- **Firebase Functions User Creation Trigger & Token Refresh:** Switched from `beforeUserCreated` (blocking) to `functions.auth.user().onCreate` (non-blocking, 1st gen) for `processSignUp`. Custom claims are set _after_ user creation. **The explicit server-side mechanism to prompt client-side token refresh has been removed from `processSignUp`.**
- **Logging in Firebase Functions:** Replaced `firebase-functions/logger` with standard `console.log` and `console.error` as per user instruction.
- **Resolved TypeScript Error:** The TypeScript error `Property 'auth' does not exist on type 'typeof import("d:/repos/property-manager-pro/functions/node_modules/firebase-functions/lib/v2/index")'` for the `functions.auth.user().onCreate` trigger was previously resolved by explicitly importing `auth` from `firebase-functions`. This is now handled within the refactored `functions/src/auth/processSignUp.ts`.
- **User Sign-Up and Multi-Tenancy Association (Revised 2025-05-24):**
  - **`processSignUp` (`functions/src/auth/processSignUp.ts`):**
    - Handles admin user creation (`*@24hrcarunlocking.com`): sets `admin` role, creates profile in `admins/{uid}`.
    - Handles other direct sign-ups: sets `pending_association` role. **No Firestore document is created by this function for these users.**
  - **`signUpWithInvitation` (`functions/src/callable/signUpWithInvitation.ts`):**
    - Manages all invited user sign-ups (email/password and social).
    - Sets final custom claims (e.g., `property_manager`, `resident`, `organizationId`, `propertyId`), overwriting any defaults.
    - Creates user profiles directly in the correct multi-tenant Firestore paths (e.g., `organizations/{orgId}/users/{uid}` or `organizations/{orgId}/properties/{propId}/residents/{uid}`).
  - The root `/users` collection is no longer used for temporary profiles.
  - This revised approach clarifies the responsibilities of each function and ensures correct claim/profile handling based on the identified execution order of `onCreate` triggers and callable functions.
- **Custom Claim Overwrite Prevention (New Decision 2025-05-24):**
  - The `processSignUp.ts` (`auth.onCreate`) trigger has been modified to check for an existing `organizationId` custom claim on a user before applying its default `pending_association` claim.
  - If `organizationId` is present, `processSignUp.ts` will not modify the user's claims, thus preserving claims set by the `signUpWithInvitation.ts` function (e.g., for residents or property managers). This resolves the issue where invitation-specific claims were being overwritten.
- **Firebase Functions Structure:** Adopted a modular structure for Firebase Functions, with each function in its own file, categorized into `auth` and `callable` subdirectories. Shared utilities are in `helpers` and `firebaseAdmin` files. The main `index.ts` re-exports all functions. Relative imports within `functions/src` use `.js` extensions.
- **Social Sign-On Email Matching:** For invitation-based social sign-on, the email provided by the social identity provider _must_ match the email address on the invitation. This is validated client-side (for UX) and server-side (for security) in `signUpWithInvitation.ts`.
- **Invitation Email Pre-fill:** The email field on the `AcceptInvitationPage.tsx` is now pre-filled and made readonly using data fetched via the `getInvitationDetails` Cloud Function, ensuring the user signs up with the intended invited email address.
- **Seed Script Safety:** The `seedTemplates.js` script now defaults to the emulator and requires explicit confirmation for production operations, enhancing safety.
- **Property Manager Panel Structure (New Decision 2025-05-24):**
  - Property creation for Property Managers is now handled via a modal triggered by a button, removing the dedicated "Create Property" tab. This follows the pattern of the Admin "Add Organization" functionality.
  - The "Invite Resident" tab now embeds the property selection list (`PropertyManagerPropertiesList`) directly, making the selection context clear for inviting residents. (Superseded by dropdown)
  - The panel title now displays the fetched Organization Name for better user context.
- **Property Manager Panel Display and Selection (New Decision 2025-05-24, iteration 2):**
  - Properties in the "My Properties" tab are displayed in an MUI `Table` showing Name and Address.
  - Property selection for inviting residents in the "Invite Resident" tab is handled by a new dedicated `PropertySelectorDropdown.tsx` component, displaying Name and Address. This replaces the embedded list selector.
  - This further aligns the PM panel with Admin panel UI patterns (tables for lists, dedicated selectors for forms).
- **Property Manager Invite Flow Refinements (Feedback-based - 2025-05-24):**
  - `InviteResidentForm.tsx` title now uses property name.
  - Layout of `InviteResidentForm.tsx` places email field and send button on the same row.
  - `Dashboard.tsx` state variables for property selection renamed for clarity (e.g., `selectedPropertyId`).
  - Divider removed in "Invite Resident" tab for a more unified look between selector and form.

## 5. ImportantPatterns & Preferences

- (No new patterns or preferences to add at this time, existing ones from `projectRoadmap.md` and `systemPatterns.md` still apply).

## 6. Learnings & Project Insights

- **Firebase Blocking Functions Limitations:** Learned that Firebase Blocking Functions (`beforeUserCreated`, `beforeUserSignedIn`) are restricted to GCIP (Google Cloud Identity Platform) projects, necessitating a shift to a non-blocking `onCreate` trigger for general Firebase projects when setting custom claims at user creation.
- **Firebase Functions v1 and v2 Coexistence:** Confirmed that 1st gen functions (`functions.auth.user().onCreate`) can coexist with 2nd gen functions (`onCall` from `firebase-functions/v2/https`) in the same source file. However, TypeScript type resolution for v1 functions in an ES module v2 project can be challenging, leading to `Property 'auth' does not exist` errors.
- **TypeScript Module Resolution with `NodeNext` and Firebase Functions v2:** Encountered significant challenges with `nodenext` module resolution for `firebase-functions/v2/auth` due to the package's `exports` map. Resolved by identifying the correct submodule (`firebase-functions/v2/identity`) and function name (`beforeUserCreated`). (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
- **Firebase Auth Custom Claims:** Successfully integrated custom claims for RBAC, demonstrating their effectiveness for granular access control.
- **Firestore Security Rules Complexity:** Emphasized the need for meticulous rule writing and testing for multi-tenant and RBAC systems.
- **Firebase Admin SDK ES Module Import:** Discovered and resolved `TypeError: admin.initializeApp is not a function` by adjusting the `firebase-admin` import statement for compatibility with ES module environments in Firebase Functions.
  - **Token Refresh Mechanism:** The explicit server-side token refresh signaling mechanism in `processSignUp` (previously using Realtime Database, then Firestore flags) has been removed to simplify the function, per user request.
- **Auth Provider State Management (Race Condition Fix):** The refactor of `AuthProvider.tsx` using two `useEffect` hooks (one for raw Firebase user state, one for processing that state and managing loading/claims) proved effective in resolving a subtle race condition. This highlights the importance of carefully managing loading states when dealing with asynchronous authentication events and React context propagation to route guards. The key was ensuring that `loading` is `true` during the entire period when user data (including claims) is being fetched and set, preventing `ProtectedRoute` from acting on incomplete or stale data.
- **Multi-Tenant User Onboarding Strategy (New Insight 2025-05-23):** Adopted a two-part strategy for user creation to support multi-tenancy:
  1.  The `processSignUp` (`auth.onCreate`) trigger (`functions/src/auth/processSignUp.ts`) handles initial state for direct sign-ups (assigning `pending_association` role, or `admin` role and profile for admin emails). It no longer creates Firestore documents for `pending_association` users.
  2.  The `signUpWithInvitation` callable Cloud Function (`functions/src/callable/signUpWithInvitation.ts`) manages invited user sign-ups (both email/password and social sign-on), ensuring immediate association with an organization, correct final roles (overwriting any defaults), and profile creation in the designated multi-tenant Firestore path.
- **Custom Claim Overwrite Resolution (New Insight 2025-05-24):**
  - Identified and resolved an issue where custom claims set by `signUpWithInvitation.ts` (e.g., for residents) were being overwritten by the `processSignUp.ts` (`auth.onCreate`) trigger.
  - The fix involved modifying `processSignUp.ts` to check for an existing `organizationId` claim before applying its default `pending_association` claim. If `organizationId` is present, `processSignUp.ts` now refrains from altering the claims, ensuring the invitation-specific claims persist.
- **Firestore Rules Update (New Insight 2025-05-24):**
  - Removed security rules for the root `/users` collection in `firestore.rules` as this collection is no longer used for storing `pending_association` user profiles.
- **TypeScript Configuration for Firebase Functions (New Insight 2025-05-24):** Confirmed that the TypeScript setup for Firebase Functions (likely using `moduleResolution: "nodenext"` or similar) requires explicit `.js` extensions for relative imports within the `functions/src` directory. Type-only imports (`import type { ... } from ...`) are also enforced for type imports when `verbatimModuleSyntax` is enabled.
- **Social Sign-On for Invitations (New Insight 2025-05-24):** The `AcceptInvitationPage.tsx` now supports Google and Microsoft sign-on. The `signUpWithInvitation` Cloud Function was updated to handle these pre-authenticated users by skipping Auth user creation if a `uid` is passed from the client, and validating the social email against the invitation.
- **Invitation Detail Fetching (New Insight 2025-05-24):** A new `getInvitationDetails` Cloud Function was added to securely provide the invited email to the `AcceptInvitationPage.tsx`, allowing the email field to be pre-filled and made readonly. This enhances user experience and data integrity for the invitation acceptance process.
- **Seed Script Command-Line Arguments (New Insight 2025-05-24):** The `seedTemplates.js` script was enhanced to use an `--env` flag for specifying target environments (emulator/production), with a default to emulator and a confirmation step for production. This improves usability and safety for seeding operations.
