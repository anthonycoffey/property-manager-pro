# Plan: Denormalizing `managedBy` in Property Documents

This document outlines the plan to change the `managedBy` field in property documents from a simple UID string to a denormalized object containing the manager's UID, display name, and email. This aims to improve UI performance and user experience when displaying property manager information.

## I. Data Model Change (Firestore)

1.  **`properties` Document Structure:**
    The `managedBy` field within `organizations/{organizationId}/properties/{propertyId}` will be an object or null:

    ```typescript
    // In src/types/index.ts (or similar)
    export interface ManagedByInfo {
      uid: string;
      displayName: string;
      email: string;
    }

    export interface Property {
      // ... other existing property fields (id, name, address, type, organizationId, createdAt, status, etc.)
      managedBy: ManagedByInfo | null; // Changed from string | undefined
    }
    ```
    It's assumed `managedBy` can be `null` if a property is unassigned or if the manager information cannot be retrieved during creation/update.

2.  **User Profile Source of Truth:**
    The canonical source for `displayName` and `email` remains the user's profile document:
    *   For Property Managers: `organizations/{organizationId}/users/{userId}`.
    *   For Admins/Organization Managers (if they can be set as `managedBy`): `admins/{userId}`. (Primary focus for `managedBy` will be PMs from the organization's user list).

## II. Cloud Function Modifications

1.  **`functions/src/callable/createProperty.ts`:**
    *   **Current Behavior:** Sets `managedBy: callerUid` (string).
    *   **New Logic:**
        *   When a property is created, the function must determine the initial manager (likely the `callerUid`).
        *   Fetch the `displayName` and `email` of this initial manager from their user profile (e.g., `organizations/{organizationId}/users/{callerUid}` if the caller is a PM or OM acting within that org, or `admins/{callerUid}` if an Admin is creating it and assigning themselves, though less common for direct management).
        *   Construct the `ManagedByInfo` object: `{ uid: callerUid, displayName: fetchedName, email: fetchedEmail }`.
        *   Save the new property document with this `managedBy` object.
        *   If the manager's details cannot be fetched, `managedBy` could be set to `null` or an object with only the UID and placeholder/empty strings for name/email, with a warning logged. Defaulting to `null` if details are missing might be safer.

2.  **`functions/src/callable/updateProperty.ts`:**
    *   **Input:** The `updatedData` payload should accept a field like `managedByUid: string | null`.
        *   If `managedByUid` is a string, it's the UID of the new manager.
        *   If `managedByUid` is `null`, the property is being unassigned from a manager.
    *   **New Logic:**
        *   If `updatedData.managedByUid` is provided (and is a string UID):
            *   Fetch the `displayName` and `email` for the `managedByUid` from `organizations/{organizationId}/users/{managedByUid}`.
            *   Construct the new `ManagedByInfo` object.
            *   Update the property's `managedBy` field with this new object.
        *   If `updatedData.managedByUid` is `null`:
            *   Update the property's `managedBy` field to `null`.
        *   If `updatedData.managedByUid` is not present, the `managedBy` field is not being changed by this update operation.
    *   The function should no longer accept a direct `managedBy` object in `updatedData` to prevent partial/inconsistent updates of the denormalized object from the client. Changes to `managedBy` should only be through `managedByUid`.

3.  **New Cloud Function: `syncManagedByUserInfo` (Firestore Trigger)**
    *   **Trigger:** `onUpdate` of documents in `organizations/{organizationId}/users/{userId}`.
    *   **Logic:**
        *   In the trigger, compare `change.before.data()` and `change.after.data()` to see if `displayName` or `email` fields have changed.
        *   If changed:
            *   Get `userId` and `organizationId` from `context.params`.
            *   Get the new `displayName` and `email` from `change.after.data()`.
            *   Query `organizations/{organizationId}/properties` collection for all documents where `managedBy.uid == userId`.
            *   For each matching property document, create an update object:
                ```javascript
                {
                  'managedBy.displayName': newDisplayName,
                  'managedBy.email': newEmail
                }
                ```
            *   Use batched writes to update these property documents efficiently.
    *   **Consideration for Admins/OMs:** If users from the root `admins` collection can also be set as `managedBy` on properties, a similar trigger would be needed on `admins/{userId}`. This trigger would need to iterate through all organizations and their properties, which is less efficient. It's generally better if `managedBy` UIDs on properties always refer to users within that property's organization (i.e., in `organizations/{orgId}/users/`).

## III. Frontend Component Modifications

1.  **`src/components/Admin/OrganizationPropertiesList.tsx` (and similar lists):**
    *   **Data Display:**
        *   Access `property.managedBy.displayName` and `property.managedBy.email`.
        *   Render this information, for example, using an MUI `ListItem` structure within the table cell:
            ```jsx
            <ListItem dense disableGutters>
              <ListItemAvatar>
                <Avatar /* alt={property.managedBy.displayName} src="/static/images/avatar/1.jpg" */ >
                  {property.managedBy.displayName ? property.managedBy.displayName.charAt(0) : '?'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={property.managedBy.displayName || 'N/A'}
                secondary={property.managedBy.email || 'N/A'}
              />
            </ListItem>
            ```
        *   Handle cases where `property.managedBy` might be `null` (display "Unassigned" or "N/A").

2.  **`src/components/PropertyManager/EditPropertyModal.tsx` (and similar edit forms):**
    *   **Reassigning Manager:**
        *   Add a UI element (e.g., an Autocomplete or Select dropdown) to choose a new Property Manager for the property. This dropdown should list users from `organizations/{organizationId}/users` who have the `property_manager` role.
        *   When a new manager is selected from this UI, store their UID.
        *   In the `handleSubmit` function, if the manager UID has changed, include `managedByUid: newManagerUid` (or `null` if unassigning) in the payload sent to the `updateProperty` Cloud Function.
        *   The modal should not attempt to send the full `ManagedByInfo` object for update; only the UID of the new manager.

## IV. Data Migration

*   A one-time Firestore script is required to update existing property documents.
*   **Script Logic:**
    1.  Iterate through each document in the `organizations` collection.
    2.  For each organization, iterate through its `properties` subcollection.
    3.  For each property document:
        *   Read the current `managedBy` field (which is expected to be a UID string).
        *   If it's a string UID and not already an object:
            *   Fetch the user document from `organizations/{orgId}/users/{managedByUid}`.
            *   If the user document exists, get their `displayName` and `email`.
            *   Construct the `ManagedByInfo` object: `{ uid: managedByUid, displayName, email }`.
            *   Update the property document, setting the `managedBy` field to this new object.
            *   If the user document doesn't exist, or `displayName`/`email` are missing, decide on a fallback (e.g., set `managedBy` to `null`, or an object with the UID and empty/placeholder strings, and log a warning).
*   **Execution:** This script should be run with care, ideally using a service account with necessary permissions, and tested thoroughly on a staging/development environment first. Consider batching updates to avoid exceeding Firestore limits.

## V. Testing Strategy

1.  **Property Creation:** Verify `managedBy` object is correctly populated with creator's (or initial manager's) details.
2.  **Property Update (Manager Reassignment):**
    *   Test reassigning a property to a new manager via the `EditPropertyModal`. Verify the `managedBy` object in Firestore is updated with the new manager's details.
    *   Test unassigning a manager (setting `managedBy` to `null`).
3.  **Property List Display:** Confirm `OrganizationPropertiesList` correctly displays manager's name and email (and avatar).
4.  **`syncManagedByUserInfo` Trigger:**
    *   Update a Property Manager's `displayName` or `email` in their `organizations/{orgId}/users/{uid}` profile.
    *   Verify that all properties managed by this user in that organization have their `managedBy.displayName` or `managedBy.email` fields automatically updated by the trigger.
5.  **Data Migration:** After running the script, manually inspect several property documents to ensure `managedBy` has been correctly transformed.
6.  **Edge Cases:**
    *   Property creation when manager details can't be fetched.
    *   Manager reassignment to a user whose details can't be fetched.
    *   User profile update for a manager who manages no properties.
    *   Deleting a user who is a `managedBy` on properties (the `managedBy` field on properties will become stale; the sync trigger only works for updates, not deletes. A separate strategy might be needed for user deletion, e.g., setting `managedBy` to null on their properties, or this is an accepted state of staleness).

This plan provides a robust approach to implementing the denormalization.
