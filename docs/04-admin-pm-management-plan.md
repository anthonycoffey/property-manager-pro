# Step 4: Admin Property Manager Management Panel Overhaul

This document outlines the plan to overhaul the Administrator's panel for managing Property Managers (PMs) and their invitations. The key changes are to remove manual PM creation by Admins (favoring invitation flows for security) and to implement a unified view for active PMs and pending invitations, scoped by a selectable organization context.

## Phase 0: Organization Context Switcher (Prerequisite)

Admins can manage all organizations. Therefore, a mechanism is needed for the Admin to select which organization's PMs and invitations they want to view and manage.

1.  **UI Component: `OrganizationSelector.tsx` (New)**
    *   **Purpose:** Allows Admins to select an active organization context.
    *   **Location:** Likely integrated into the Admin section of `Dashboard.tsx`, rendered above or alongside the `PropertyManagerManagement.tsx` component.
    *   **Functionality:**
        *   Fetches all documents from the root `organizations` collection in Firestore.
        *   Displays these organizations in a dropdown (e.g., MUI `Select`), showing organization name (and perhaps ID).
        *   When an Admin selects an organization, its ID is stored in a state variable (e.g., within `Dashboard.tsx` or a dedicated Admin context provider).
        *   This selected `organizationId` is then passed as a prop to `PropertyManagerManagement.tsx`.
    *   **Initial State:** Can default to "No Organization Selected" or the first organization in the list. If no organization is selected, `PropertyManagerManagement.tsx` should prompt the user to select one.

## Phase 1: Backend Adjustments

1.  **New Cloud Function: `revokeInvitation`**
    *   **Purpose:** Allows Admins to revoke a pending invitation.
    *   **Type:** HTTPS Callable Function (`onCall`).
    *   **File:** `functions/src/index.ts`
    *   **Input Parameters:**
        *   `organizationId: string`
        *   `invitationId: string`
    *   **Logic:**
        1.  **Authentication & Authorization:** Verify the caller is an authenticated Admin (`request.auth.token.roles.includes('admin')`).
        2.  **Input Validation:** Ensure `organizationId` and `invitationId` are provided.
        3.  **Fetch Invitation:** Retrieve the invitation document from `organizations/{organizationId}/invitations/{invitationId}`.
        4.  **Validation:**
            *   Confirm the invitation exists.
            *   Confirm the invitation `status` is "pending". If not (e.g., "accepted", "expired", "revoked"), return an appropriate error.
        5.  **Action:** Delete the invitation document from Firestore. (Alternatively, could update status to "revoked", but deletion is cleaner for a truly revoked/cancelled invite).
        6.  **Logging:** Log the revocation action with relevant IDs.
        7.  **Return:** A success or failure message.

## Phase 2: Frontend UI/UX Overhaul (`src/components/Admin/PropertyManagerManagement.tsx`)

This component will be significantly refactored.

1.  **Props:**
    *   Will now accept `organizationId: string | null` as a prop.
    *   If `organizationId` is `null` or undefined, the component should display a message like "Please select an organization to view and manage Property Managers."

2.  **Removal of Manual PM Creation Form:**
    *   The existing UI form for Admins to manually input PM details and create an account (which called `createPropertyManager`) will be removed entirely.
    *   The `createPropertyManager` Cloud Function can remain in the backend if it serves other purposes or for potential future internal tools, but it will not be callable from this Admin UI panel.

3.  **Data Fetching (Conditional on `organizationId` prop):**
    *   When a valid `organizationId` is provided via props:
        *   **Fetch Active Property Managers:**
            *   Subscribe to real-time updates from `organizations/{organizationId}/users`.
            *   Filter these users client-side or server-side (if using a more complex query via a Cloud Function) to include only those with an `organizationRoles` array containing `property_manager`.
        *   **Fetch Pending Property Manager Invitations:**
            *   Subscribe to real-time updates from `organizations/{organizationId}/invitations`.
            *   Filter these invitations to include only those where `status` is "pending" AND (`invitationType` is "property_manager" OR `rolesToAssign` contains "property_manager").
    *   Combine these two data sources into a single list for display.

4.  **Unified List Display:**
    *   Use an MUI `Table` or a `List` with `ListItem` components.
    *   **Columns/Data Points for each item:**
        *   **Identifier:** `displayName` and `email` for active PMs. `inviteeEmail` for pending invitations.
        *   **Status:**
            *   Active PM: MUI `Chip` (e.g., color="success", label="Active").
            *   Pending Invitation: MUI `Chip` (e.g., color="info" or "warning", label="Invite Sent"). Display `expiresAt` if available.
        *   **Date:** `createdAt` for active PMs. `createdAt` (invitation creation date) for pending invitations.
        *   **Actions:** A column with relevant action buttons/icons.

5.  **Actions Implementation (per list item):**

    *   **For Active Property Managers (Status: "Active"):**
        *   **Update PM:**
            *   "Edit" button/icon.
            *   Opens an MUI `Modal` or `Dialog` pre-filled with the PM's current details (e.g., `displayName`, `email`).
            *   Admin can modify these details.
            *   On submit, the modal calls the existing `updatePropertyManager` Cloud Function, passing the `uid`, `organizationId`, and updated fields.
            *   Password changes are not handled here. Role changes (if any) would also be a separate consideration.
        *   **Delete PM:**
            *   "Delete" button/icon.
            *   Opens a confirmation `Dialog`.
            *   On confirmation, calls the existing `deletePropertyManager` Cloud Function, passing `uid` and `organizationId`.

    *   **For Pending Invitations (Status: "Invite Sent"):**
        *   **Revoke Invitation:**
            *   "Revoke" button/icon.
            *   Opens a confirmation `Dialog`.
            *   On confirmation, calls the new `revokeInvitation` Cloud Function, passing `organizationId` and `invitationId`.
        *   **(Future Enhancement) Resend Invitation:** Could involve creating a new invitation or updating the `expiresAt` of the current one. Not in scope for this immediate phase.

6.  **State Management:**
    *   Use React `useState` and `useEffect` for managing:
        *   Fetched lists of PMs and invitations.
        *   Loading states for data fetching and actions.
        *   Error and success messages/notifications.
        *   Visibility of modals/dialogs for update/delete/revoke actions.
        *   The currently selected item for an action.

## Phase 3: Visual Design & User Experience

*   The unified list should be clearly organized and easy to scan.
*   Status chips should be visually distinct.
*   Action buttons should be intuitive.
*   Implement loading spinners during data fetches and Cloud Function calls.
*   Use MUI `Alert` or `Snackbar` components for user feedback on actions (success/error).

## Diagrammatic Representation

```mermaid
graph TD
    AdminDashboard[Admin Dashboard] --> OrgSelector[OrganizationSelector.tsx]
    OrgSelector --> |Admin selects OrgX (ID: 'orgX')| DashboardState[Dashboard State: selectedOrgId = 'orgX']
    DashboardState --> PropertyManagerManagementComp[PropertyManagerManagement.tsx props: { organizationId: 'orgX' }]

    subgraph PropertyManagerManagementComp
        direction LR
        CheckOrgId{Has organizationId?}
        CheckOrgId -- Yes --> FetchData[Fetch PM Users & Invitations for 'orgX']
        CheckOrgId -- No --> ShowSelectOrgMsg[Display "Please select an organization"]
        
        FetchData --> UnifiedList[Display Unified List for 'orgX']
        UnifiedList --> |Item: Active PM| ActivePMActions[Actions: Update, Delete]
        UnifiedList --> |Item: Pending Invite| PendingInviteActions[Actions: Revoke]

        ActivePMActions -- Update --> UpdatePMModal[Update PM Modal for user in 'orgX']
        UpdatePMModal --> CallUpdatePMCF[Calls 'updatePropertyManager' CF with 'orgX']

        ActivePMActions -- Delete --> DeletePMConfirm[Delete PM Confirmation for user in 'orgX']
        DeletePMConfirm --> CallDeletePMCF[Calls 'deletePropertyManager' CF with 'orgX']

        PendingInviteActions -- Revoke --> RevokeInviteConfirm[Revoke Invite Confirmation for invite in 'orgX']
        RevokeInviteConfirm --> CallRevokeInviteCF[Calls 'revokeInvitation' CF with 'orgX']
    end
```

This plan focuses on enhancing security by removing manual admin-driven PM creation and improving the admin's ability to manage existing PMs and pending invitations within a selected organizational context.
