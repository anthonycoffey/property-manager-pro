# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

The current focus is on the active implementation of Role-Based Access Control (RBAC) and Cloud Firestore for the multi-tenant architecture, as outlined in `docs/02-rbac-firestore-implementation.md`. This involves setting up backend functions, defining security rules, and integrating these features into the React frontend.

## 2. Recent Changes & Activities

*   **RBAC and Firestore Implementation Plan Documented:** Created `docs/02-rbac-firestore-implementation.md` detailing the comprehensive plan for multi-tenant RBAC and Firestore integration.
*   **Firebase Project Setup & Initial Firestore Structure (Phase 1 Completed):**
    *   Confirmed Firebase project initialization and Firestore enablement.
*   **Firebase Authentication & Custom Claims (Phase 2 Completed):**
    *   **Updated `processSignUp` Cloud Function (`functions/src/index.ts`):** Migrated from a blocking `beforeUserCreated` trigger to a non-blocking `functions.auth.user().onCreate` (1st gen) trigger. Implemented custom claims logic to assign `admin: true` and `accessLevel: 9` for users with `@admin.example.com` emails, and default `resident` roles for others. The `user` parameter is typed as `admin.auth.UserRecord`.
    *   **Replaced `firebase-functions/logger` with `console.log`:** All `logger.info` and `logger.error` calls in `functions/src/index.ts` have been replaced with `console.log` and `console.error` respectively, as per user instruction.
    *   Resolved persistent TypeScript module resolution errors for `firebase-functions/v2/identity` by identifying the correct import (`beforeUserCreated` from `firebase-functions/v2/identity`) and ensuring `tsconfig.json` was correctly configured (`skipLibCheck: true`, `types: ["node", "firebase-functions"]`, `moduleResolution: "nodenext"`). (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
    *   Updated `src/hooks/useAuth.ts` (`CustomUser` type, `AuthContextType` with roles/IDs) and `src/providers/AuthProvider.tsx` (fetching and providing custom claims from `getIdTokenResult`).
*   **Firestore Security Rules (Phase 3 Completed):**
    *   Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`. These rules control access to `admins`, `organizations`, and their nested `users`, `properties`, `residents`, `invitations`, and `services` collections based on user roles (`request.auth.token.roles`) and assigned IDs (`request.auth.token.organizationId`, `request.auth.token.propertyId`).
*   **Frontend Integration & UI Adaptation (Phase 4 Completed):**
    *   Updated `src/components/ProtectedRoute.tsx` to enforce route protection based on `allowedRoles`, `requiredOrgId`, and `requiredPropertyId`.
    *   Modified `src/components/Dashboard.tsx` to conditionally render content based on the logged-in user's roles and assigned IDs.
*   **Initial Feature Development (Admin Dashboard - Property Manager CRUD) (Phase 5 Started/Partially Completed):**
    *   Created the `src/components/Admin` directory and the `src/components/Admin/PropertyManagerManagement.tsx` component as a starting point for the Admin Dashboard.
    *   Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions in `functions/src/index.ts`.
    *   Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
*   **Deployment Configuration Updated:** Modified `apphosting.yaml` to include `build` and `release` configurations for Firebase App Hosting, ensuring correct deployment of the Vite application.
*   **Resolved Firebase Admin SDK Initialization Error:** Changed `import * as admin from 'firebase-admin';` to `import admin from 'firebase-admin';` in `functions/src/index.ts` to resolve `TypeError: admin.initializeApp is not a function` during Firebase Functions deployment in an ES module environment.

## 3. Next Steps

*   **Complete Phase 5 (Admin Dashboard - Property Manager CRUD):**
    *   Implement the listing of existing property managers in `src/components/Admin/PropertyManagerManagement.tsx`.
    *   Develop forms/modals for editing and deleting property managers, interacting with the `updatePropertyManager` and `deletePropertyManager` Cloud Functions.
*   **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md` and `docs/02-rbac-firestore-implementation.md` (e.g., Property Management, Resident Management, Invitation System).

## 4. Active Decisions & Considerations

*   **Firebase Functions User Creation Trigger:** Switched from `beforeUserCreated` (blocking) to `functions.auth.user().onCreate` (non-blocking, 1st gen) for `processSignUp` to resolve deployment errors related to GCIP project requirements and align with user's provided documentation. This means custom claims are set *after* user creation, and a Realtime Database flag is used to prompt client-side token refresh.
*   **Logging in Firebase Functions:** Replaced `firebase-functions/logger` with standard `console.log` and `console.error` as per user instruction.
*   **Resolved TypeScript Error:** The TypeScript error `Property 'auth' does not exist on type 'typeof import("d:/repos/property-manager-pro/functions/node_modules/firebase-functions/lib/v2/index")'` for the `functions.auth.user().onCreate` trigger has been resolved. This was addressed by explicitly importing `auth` and `database` from `firebase-functions` in `functions/src/index.ts`, ensuring correct type resolution for v1 functions when mixed with v2 functions.
*   **Temporary Root `users` collection:** New direct sign-ups are temporarily stored in a root `users` collection. A future mechanism (e.g., invitation acceptance, admin assignment) will be needed to move/link these users to their respective `organizations/{orgId}/users` or `organizations/{orgId}/properties/{propId}/residents` paths.

## 5. Important Patterns & Preferences

*   (No new patterns or preferences to add at this time, existing ones from `projectRoadmap.md` and `systemPatterns.md` still apply).

## 6. Learnings & Project Insights

*   **Firebase Blocking Functions Limitations:** Learned that Firebase Blocking Functions (`beforeUserCreated`, `beforeUserSignedIn`) are restricted to GCIP (Google Cloud Identity Platform) projects, necessitating a shift to a non-blocking `onCreate` trigger for general Firebase projects when setting custom claims at user creation.
*   **Firebase Functions v1 and v2 Coexistence:** Confirmed that 1st gen functions (`functions.auth.user().onCreate`) can coexist with 2nd gen functions (`onCall` from `firebase-functions/v2/https`) in the same source file. However, TypeScript type resolution for v1 functions in an ES module v2 project can be challenging, leading to `Property 'auth' does not exist` errors.
*   **TypeScript Module Resolution with `NodeNext` and Firebase Functions v2:** Encountered significant challenges with `nodenext` module resolution for `firebase-functions/v2/auth` due to the package's `exports` map. Resolved by identifying the correct submodule (`firebase-functions/v2/identity`) and function name (`beforeUserCreated`). (Note: This specific resolution is now superseded by the change to `onCreate` but kept for historical context of previous issues).
*   **Firebase Auth Custom Claims:** Successfully integrated custom claims for RBAC, demonstrating their effectiveness for granular access control.
*   **Firestore Security Rules Complexity:** Emphasized the need for meticulous rule writing and testing for multi-tenant and RBAC systems.
*   **Firebase Admin SDK ES Module Import:** Discovered and resolved `TypeError: admin.initializeApp is not a function` by adjusting the `firebase-admin` import statement for compatibility with ES module environments in Firebase Functions.
