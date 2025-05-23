# RBAC and Firestore Implementation Plan for Multi-Tenancy

This document outlines the detailed plan for implementing Role-Based Access Control (RBAC) and integrating Firestore for the multi-tenant architecture of the Property Manager Pro application. This plan aligns with the system patterns defined in `memory-bank/systemPatterns.md`.

## Phase 1: Firebase Project Setup & Initial Firestore Structure

1.  **Verify Firebase Project:** Ensure the Firebase project is correctly initialized and linked to the local environment.
2.  **Initialize Firestore:** Confirm Firestore is enabled in the Firebase project.
3.  **Create Initial Collections (Manual/Scripted):**
    *   `admins` (root collection): Manually create an initial admin user document for testing.
    *   `organizations` (root collection): Manually create a test organization document.
    *   `mail` and `templates` (root collections): These are for the `firestore-send-email` extension and should be top-level.

## Phase 2: Firebase Authentication & Custom Claims

1.  **Cloud Function for User Creation/Role Assignment:**
    *   Create a Firebase Cloud Function (e.g., `onUserCreate`) triggered by `auth.user().onCreate`.
    *   This function will:
        *   Check if the user is an initial admin (e.g., based on email whitelist or first user created).
        *   Set custom claims for the user based on their role and organization/property ID.
        *   For new sign-ups, initially assign a default role (e.g., `resident`) or no role, and then allow an admin/property manager to assign specific roles and organization/property IDs.
        *   Store the user's profile data in the appropriate Firestore collection (`admins`, `organizations/{orgId}/users`, or `organizations/{orgId}/properties/{propId}/residents`).
2.  **Update Login/Signup Flow:**
    *   Modify `src/components/LoginForm.tsx` and `src/components/SignupForm.tsx` to handle the new authentication flow.
    *   After successful authentication, ensure the client-side application refreshes the ID token to get the latest custom claims.
    *   The `useAuth` hook (or similar context) should be updated to expose the user's roles and `organizationId`/`propertyId` from the custom claims.

## Phase 3: Firestore Security Rules

1.  **Implement Comprehensive Security Rules (`firestore.rules`):**
    *   **Global Rules:** Define rules for top-level collections like `mail` and `templates`.
    *   **`admins` Collection Rules:** Only `admin` role can read/write.
    *   **`organizations` Collection Rules:**
        *   Only `admin` role can create/read/update/delete organization documents.
        *   Organization users (`property_manager`, `property_staff`, `resident`) can only read their own organization's document (if needed for context).
    *   **Nested Collection Rules (`organizations/{orgId}/...`):**
        *   **`users` (org users):**
            *   `admin` can manage all users across all organizations.
            *   `property_manager` can manage users within their `organizationId`.
            *   `property_staff` can read users within their `organizationId`.
        *   **`properties`:**
            *   `admin` can manage all properties.
            *   `property_manager` can manage properties within their `organizationId`.
            *   `property_staff` can read properties within their `organizationId`.
        *   **`residents`:**
            *   `admin` can manage all residents.
            *   `property_manager` can manage residents within their `organizationId` and specific `propertyId`.
            *   `resident` can only read/update their own resident document within their `organizationId` and `propertyId`.
        *   **`invitations`:**
            *   `property_manager` can create/read/update invitations within their `organizationId`.
            *   `admin` can manage all invitations.
        *   **`services`:**
            *   `resident` can create/read/update their own service requests within their `organizationId` and `propertyId`.
            *   `property_manager`/`property_staff` can manage service requests within their `organizationId` and specific `propertyId`.
            *   `admin` can manage all service requests.
    *   **Utilize `request.auth.token.roles`, `request.auth.token.organizationId`, `request.auth.token.propertyId`** for all access checks.

## Phase 4: Frontend Integration & UI Adaptation

1.  **Update `AuthProvider.tsx` and `useAuth.ts`:**
    *   Ensure the `AuthContext` provides the user's `roles`, `organizationId`, and `propertyId` from the Firebase Auth ID token.
    *   This will be the central source of truth for user permissions in the frontend.
2.  **Implement `ProtectedRoute.tsx`:**
    *   Modify `src/components/ProtectedRoute.tsx` to check for specific roles and/or `organizationId`/`propertyId` before allowing access to routes.
    *   Example: An admin route requires `roles.includes('admin')`. A property manager route requires `roles.includes('property_manager') && user.organizationId`.
3.  **Conditional UI Rendering:**
    *   In components like `Dashboard.tsx` and other feature components, use the `useAuth` hook to conditionally render UI elements (buttons, forms, navigation items) based on the user's roles and associated IDs.
    *   Example: Only show "Add Property" button if user has `property_manager` role for the current organization.

## Phase 5: Initial Feature Development (Admin Dashboard - Property Manager CRUD)

1.  **Admin Dashboard UI:** Start building the UI for the Admin Dashboard to manage Property Managers.
2.  **Cloud Functions for Admin Operations:**
    *   Create Cloud Functions (e.g., `createPropertyManager`, `updatePropertyManager`, `deletePropertyManager`).
    *   These functions will be callable only by `admin` users (enforced by security rules and function logic).
    *   They will interact with the `organizations/{orgId}/users` collection and potentially update Firebase Auth user records (e.g., setting custom claims).
3.  **Frontend Forms/Tables:** Develop React components for listing, adding, editing, and deleting property managers, interacting with the new Cloud Functions.
