# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

The current focus is on the active implementation of Role-Based Access Control (RBAC) and Cloud Firestore for the multi-tenant architecture, as outlined in `docs/02-rbac-firestore-implementation.md`. This involves setting up backend functions, defining security rules, and integrating these features into the React frontend.

## 2. Recent Changes & Activities

*   **RBAC and Firestore Implementation Plan Documented:** Created `docs/02-rbac-firestore-implementation.md` detailing the comprehensive plan for multi-tenant RBAC and Firestore integration.
*   **Firebase Project Setup & Initial Firestore Structure (Phase 1 Completed):**
    *   Confirmed Firebase project initialization and Firestore enablement.
*   **Firebase Authentication & Custom Claims (Phase 2 Completed):**
    *   Implemented `onUserCreate` Cloud Function (`functions/src/index.ts`) to set default `resident` roles and create user profiles in a temporary root `users` collection upon new user sign-up.
    *   Resolved persistent TypeScript module resolution errors for `firebase-functions/v2/identity` by identifying the correct import (`beforeUserCreated` from `firebase-functions/v2/identity`) and ensuring `tsconfig.json` was correctly configured (`skipLibCheck: true`, `types: ["node", "firebase-functions"]`, `moduleResolution: "nodenext"`).
    *   Updated `src/hooks/useAuth.ts` (`CustomUser` type, `AuthContextType` with roles/IDs) and `src/providers/AuthProvider.tsx` (fetching and providing custom claims from `getIdTokenResult`).
*   **Firestore Security Rules (Phase 3 Completed):**
    *   Implemented comprehensive multi-tenant and RBAC security rules in `firestore.rules`. These rules control access to `admins`, `organizations`, and their nested `users`, `properties`, `residents`, `invitations`, and `services` collections based on user roles (`request.auth.token.roles`) and assigned IDs (`request.auth.token.organizationId`, `request.auth.token.propertyId`).
*   **Frontend Integration & UI Adaptation (Phase 4 Completed):**
    *   Updated `src/components/ProtectedRoute.tsx` to enforce route protection based on `allowedRoles`, `requiredOrgId`, and `requiredPropertyId`.
    *   Modified `src/components/Dashboard.tsx` to conditionally render content based on the logged-in user's roles and assigned IDs.
*   **Initial Feature Development (Admin Dashboard - Property Manager CRUD) (Phase 5 Started/Partially Completed):**
    *   Created the `src/components/Admin` directory and the `src/components/Admin/PropertyManagerManagement.tsx` component as a starting point for the Admin Dashboard.
    *   Implemented `createPropertyManager`, `updatePropertyManager`, and `deletePropertyManager` Cloud Functions in `functions/src/index.ts` to handle backend operations for property manager management.
    *   Integrated the "Add New Property Manager" form in `src/components/Admin/PropertyManagerManagement.tsx` to interact with the `createPropertyManager` Cloud Function.
*   **Deployment Configuration Updated:** Modified `apphosting.yaml` to include `build` and `release` configurations for Firebase App Hosting, ensuring correct deployment of the Vite application.

## 3. Next Steps

*   **Complete Phase 5 (Admin Dashboard - Property Manager CRUD):**
    *   Implement the listing of existing property managers in `src/components/Admin/PropertyManagerManagement.tsx`.
    *   Develop forms/modals for editing and deleting property managers, interacting with the `updatePropertyManager` and `deletePropertyManager` Cloud Functions.
*   **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md` and `docs/02-rbac-firestore-implementation.md` (e.g., Property Management, Resident Management, Invitation System).

## 4. Active Decisions & Considerations

*   **Firebase Functions v2 `identity` module:** Confirmed `beforeUserCreated` from `firebase-functions/v2/identity` is the correct trigger for user creation events in v2, resolving previous module resolution issues.
*   **Temporary Root `users` collection:** New direct sign-ups are temporarily stored in a root `users` collection. A future mechanism (e.g., invitation acceptance, admin assignment) will be needed to move/link these users to their respective `organizations/{orgId}/users` or `organizations/{orgId}/properties/{propId}/residents` paths.

## 5. Important Patterns & Preferences

*   (No new patterns or preferences to add at this time, existing ones from `projectRoadmap.md` and `systemPatterns.md` still apply).

## 6. Learnings & Project Insights

*   **TypeScript Module Resolution with `NodeNext` and Firebase Functions v2:** Encountered significant challenges with `nodenext` module resolution for `firebase-functions/v2/auth` due to the package's `exports` map. Resolved by identifying the correct submodule (`firebase-functions/v2/identity`) and function name (`beforeUserCreated`). This highlights the importance of thoroughly checking `node_modules` `package.json` `exports` for `nodenext` compatibility.
*   **Firebase Auth Custom Claims:** Successfully integrated custom claims for RBAC, demonstrating their effectiveness for granular access control.
*   **Firestore Security Rules Complexity:** Emphasized the need for meticulous rule writing and testing for multi-tenant and RBAC systems.
