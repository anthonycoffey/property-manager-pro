# User Anonymization and Deletion Process: `anonymizeAndDeleteUser.ts`

This document outlines the functionality of the `anonymizeAndDeleteUser` Firebase Callable Function, which is responsible for handling user account deletion requests. The process involves two main stages: anonymizing the user's data in Firestore and then permanently deleting the user from Firebase Authentication.

## 1. Invocation

This function is designed to be called directly by an authenticated user from the client-side application, specifically from the **Delete Account** page (likely `src/pages/DeleteAccountPage.tsx`). When a user confirms they want to delete their account, the frontend application makes a call to this function.

## 2. Core Workflow

The function ensures that a user can only delete their own account by using the UID from the authentication context of the call.

```mermaid
graph TD
    A[User clicks "Delete My Account" in App] --> B{Calls `anonymizeAndDeleteUser` CF};
    B --> C{Function retrieves UID from Auth Context};
    C --> D{Fetch User Record & Custom Claims (Roles)};
    D --> E{Switch based on User Role};
    E -- "admin" or "organization_manager" --> F[Anonymize document in `admins` collection];
    E -- "property_manager" --> G[Anonymize document in `organizations/{orgId}/users`];
    E -- "resident" --> H[Anonymize document in `organizations/{orgId}/properties/{propId}/residents`];
    F --> I{Delete User from Firebase Auth};
    G --> I;
    H --> I;
    I --> J[Return Success to Client];
```

## 3. Step-by-Step Functional Breakdown

1.  **Authentication Check:** The function first verifies that the request is coming from an authenticated user. If not, it throws an `unauthenticated` error.
2.  **User Identification:** It securely identifies the user by extracting their `uid` from the `request.auth` object.
3.  **Role-Based Anonymization:** The function fetches the user's record from Firebase Auth to determine their roles from custom claims. It then performs a targeted update to the relevant Firestore document(s) to anonymize personally identifiable information (PII). This step is crucial for maintaining data integrity (e.g., preserving historical records) while removing personal data.
    *   **Admins / Organization Managers:** The corresponding document in the root `admins` collection is updated. `displayName` is set to "Deleted Admin" and `email` is changed to a placeholder like `deleted+<uid>@example.com`.
    *   **Property Managers:** The function queries the `users` subcollection across all organizations to find the user's profile. It updates `displayName` to "Deleted Property Manager", `email` to a placeholder, and `phone` to "000-000-0000".
    *   **Residents:** The function queries the `residents` subcollection across all properties. It updates `displayName` to "Deleted Resident", `email` and `phone` to placeholders, and critically, it removes vehicle data by setting `vehicles` to an empty array and deleting the `vehicleLicensePlates` field.
4.  **Authentication Deletion:** After successfully anonymizing the Firestore records, the function calls `adminAuth.deleteUser(uid)`. This is the final, irreversible step that permanently removes the user's credentials, login methods, and UID from the Firebase Authentication system.
5.  **Success Response:** A success message is returned to the client, confirming that the account has been deleted.

## 4. Error Handling

The entire process is wrapped in a `try...catch` block. If any step (fetching user record, updating Firestore, deleting from Auth) fails, the `handleHttpsErrorV2` helper is used to log the error and throw a structured `HttpsError` back to the client, preventing the process from being left in an inconsistent state.
