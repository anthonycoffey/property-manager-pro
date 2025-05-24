# Invitation System Implementation Plan

This document outlines the plan for implementing the user invitation flows for Administrators inviting Property Managers, and Property Managers inviting Residents.

## I. Overall Invitation Architecture

The invitation system will leverage existing Firebase infrastructure and introduce new components as needed.

*   **Firestore Collection:** `organizations/{organizationId}/invitations/{invitationToken}` will store details for each invitation.
*   **Cloud Function (New/Enhanced):** `createInvitation` (HTTPS Callable) - This function will be responsible for generating invitation records in Firestore and triggering invitation emails.
*   **Cloud Function (Existing):** `signUpWithInvitation` (HTTPS Callable) - This function will continue to process sign-ups that originate from an invitation link. It will set appropriate custom claims and create user profiles in the correct multi-tenant Firestore location.
*   **Email Extension:** The `firestore-send-email` extension will be used to dispatch templated invitation emails containing unique sign-up links.

```mermaid
graph TD
    subgraph Actor Initiates Invitation
        AdminUser[Admin] -->|Invites Property Manager| CreateInvitationCF{createInvitation CF}
        PMUser[Property Manager] -->|Invites Resident| CreateInvitationCF
    end

    CreateInvitationCF -->|Writes to Firestore| InvitationsCollection[organizations/{orgId}/invitations]
    CreateInvitationCF -->|Triggers Email via Firestore| EmailExtension{firestore-send-email}

    subgraph Invitee Accepts Invitation
        InvitedUser[Invited User] -->|Clicks Email Link| AcceptInvitePage[Accept Invitation Page / Signup Form]
        AcceptInvitePage -->|Calls with Token & Credentials| SignUpWithInvitationCF{signUpWithInvitation CF}
    end

    SignUpWithInvitationCF -->|1. Validates Token| InvitationsCollection
    SignUpWithInvitationCF -->|2. Creates Auth User| FirebaseAuth[Firebase Auth]
    SignUpWithInvitationCF -->|3. Sets Custom Claims (Role, OrgID, PropID)| FirebaseAuth
    SignUpWithInvitationCF -->|4. Creates User Profile in Firestore| UserProfileLocation[User Profile in Firestore <br> (e.g., /orgs/.../users/uid or /orgs/.../properties/.../residents/uid)]
    SignUpWithInvitationCF -->|5. Updates Invitation Status| InvitationsCollection

    EmailExtension -->|Sends Templated Email| InvitedUser
```

## II. Flow 1: Admin Invites Property Manager

**Objective:** An Administrator can send an email invitation to a potential Property Manager. Upon accepting and signing up, the Property Manager is associated with a specific organization.

**A. UI Components (Admin Dashboard - e.g., in `src/components/Admin/`):**

1.  **`InvitePropertyManagerForm.tsx` (New):**
    *   A form for Admins to input:
        *   Invitee's Email Address.
        *   Organization ID (Admin selects the target organization from a list/dropdown).
    *   On submission, this form will call the `createInvitation` Cloud Function.
2.  **(Optional) `AdminInvitationsList.tsx` (New/Enhanced):**
    *   To display a list of pending and accepted invitations initiated by Admins, showing status, email, and expiration.

**B. Cloud Function (`createInvitation` - New HTTPS Callable Function in `functions/src/index.ts`):**

*   **Input Parameters:**
    *   `inviteeEmail: string`
    *   `organizationId: string`
    *   `rolesToAssign: string[]` (e.g., `['property_manager']`)
    *   `invitedByRole: 'admin' | 'property_manager'`
    *   `targetPropertyId?: string` (null for this flow)
*   **Logic for this flow:**
    1.  Verify the caller is an Admin (`context.auth.token.roles.includes('admin')`).
    2.  Validate `organizationId` (e.g., check if it exists).
    3.  Generate a unique `invitationToken` (e.g., using UUID).
    4.  Create a document in `organizations/{organizationId}/invitations/{invitationToken}` with fields:
        *   `email: inviteeEmail`
        *   `rolesToAssign: ['property_manager']`
        *   `organizationId: organizationId`
        *   `status: "pending"`
        *   `createdBy: context.auth.uid` (Admin's UID)
        *   `createdAt: serverTimestamp()`
        *   `expiresAt: serverTimestamp()` (e.g., current time + 7 days)
        *   `invitationType: 'property_manager'`
    5.  Trigger an email via `firestore-send-email` by creating a document in the root `mail` collection:
        *   `to: inviteeEmail`
        *   `template: { name: 'propertyManagerInvitation', data: { inviteeName: inviteeEmail, organizationName: '[Fetch Org Name from organizationId]', invitationLink: 'https://[YOUR_APP_DOMAIN]/accept-invitation?token={invitationToken}' } }`

**C. Invitation Acceptance & Sign-up:**

1.  The invitee receives an email containing the `invitationLink`.
2.  The link directs to a public page (e.g., `src/pages/AcceptInvitationPage.tsx` or an enhanced `src/components/SignupForm.tsx` that can handle an `invitationToken` query parameter).
3.  The page parses the `invitationToken` from the URL.
4.  The user completes the sign-up form (name, email, password).
5.  The client calls the existing `signUpWithInvitation` Cloud Function, passing the `invitationToken` and the new user's credentials.
6.  **`signUpWithInvitation` Cloud Function (Existing - Review & Ensure Functionality):**
    *   Retrieves the invitation document from `organizations/{orgId}/invitations/{token}`.
    *   Validates the invitation (e.g., token exists, status is "pending", not expired, email matches).
    *   Creates the Firebase Auth user.
    *   Sets custom claims: `{ roles: ['property_manager'], organizationId: invitation.organizationId }`.
    *   Creates the user profile document in `organizations/{invitation.organizationId}/users/{newUser.uid}`.
    *   Updates the invitation status in Firestore to `"accepted"` and records `acceptedAt: serverTimestamp()`.

## III. Flow 2: Property Manager Creates Property (Prerequisite for Inviting Residents)

**Objective:** A Property Manager can add new properties to the organization they belong to. This is a prerequisite for inviting residents to a specific property.

**A. UI Components (Property Manager Dashboard - e.g., `src/components/PropertyManager/`):**

1.  **`CreatePropertyForm.tsx` (New):**
    *   A form for Property Managers to input property details (Name, Address, Type, etc.).
    *   On submission, this form will call the `createProperty` Cloud Function.
2.  **`PropertyList.tsx` (New or Enhanced):**
    *   To list properties managed by the Property Manager and provide an interface (e.g., a button) to access the `CreatePropertyForm.tsx`.

**B. Cloud Function (`createProperty` - New HTTPS Callable Function in `functions/src/index.ts`):**

*   **Input Parameters:**
    *   `propertyName: string`
    *   `address: object` (e.g., `{ street: string, city: string, state: string, zip: string }`)
    *   `propertyType: string`
    *   *(Other relevant property details)*
*   **Logic:**
    1.  Verify the caller is a Property Manager (`context.auth.token.roles.includes('property_manager')`).
    2.  Retrieve `organizationId` from `context.auth.token.organizationId`.
    3.  Validate input data.
    4.  Generate a new unique `propertyId`.
    5.  Create a new document in `organizations/{organizationId}/properties/{newPropertyId}` with the provided details, also storing `managedBy: context.auth.uid` and `organizationId`.

**C. Firestore Security Rules (`firestore.rules`):**

*   Ensure rules for `organizations/{orgId}/properties/{propId}` allow `create` if `request.auth.token.roles.hasAny(['property_manager'])` and `request.auth.token.organizationId == orgId`. (These rules should align with the definitions in `memory-bank/systemPatterns.md`).

## IV. Flow 3: Property Manager Invites Resident

**Objective:** A Property Manager can send an email invitation to a potential Resident for a specific property they manage.

**A. UI Components (Property Manager Dashboard, likely within a specific property's detail view):**

1.  **`InviteResidentForm.tsx` (New):**
    *   A form for Property Managers to input the Invitee's Email Address.
    *   The `propertyId` and `organizationId` will be derived from the context of the property currently being viewed/managed.
    *   On submission, this form will call the `createInvitation` Cloud Function.
2.  **(Optional) `ResidentInvitationsList.tsx` (New/Enhanced):**
    *   To display a list of pending and accepted invitations for a specific property.

**B. Cloud Function (Using the same `createInvitation` as in Flow 1, with different parameters):**

*   **Input Parameters (for this flow):**
    *   `inviteeEmail: string`
    *   `organizationId: string` (from PM's token)
    *   `rolesToAssign: ['resident']`
    *   `invitedByRole: 'property_manager'`
    *   `targetPropertyId: string` (ID of the property the resident is being invited to)
*   **Logic (within `createInvitation`):**
    1.  Verify the caller is a Property Manager (`context.auth.token.roles.includes('property_manager')`) and that `context.auth.token.organizationId` matches the `organizationId` for the `targetPropertyId`.
    2.  Validate `targetPropertyId` (e.g., check if property exists within the PM's organization).
    3.  Generate a unique `invitationToken`.
    4.  Create a document in `organizations/{organizationId}/invitations/{invitationToken}`:
        *   Include `targetPropertyId: targetPropertyId`.
        *   `rolesToAssign: ['resident']`.
        *   `invitationType: 'resident'`.
        *   Other fields similar to Property Manager invitation (status, createdBy, createdAt, expiresAt).
    5.  Trigger an email via `firestore-send-email`:
        *   `to: inviteeEmail`
        *   `template: { name: 'residentInvitation', data: { inviteeName: inviteeEmail, propertyName: '[Fetch Property Name from targetPropertyId]', invitationLink: 'https://[YOUR_APP_DOMAIN]/accept-invitation?token={invitationToken}' } }`

**C. Invitation Acceptance & Sign-up:**

1.  Similar to Flow 1, the invitee receives an email and clicks the `invitationLink`.
2.  The client calls the `signUpWithInvitation` Cloud Function with the token and new user credentials.
3.  **`signUpWithInvitation` Cloud Function (Existing - Review & Ensure Functionality):**
    *   Retrieves and validates the invitation.
    *   Creates the Firebase Auth user.
    *   Sets custom claims: `{ roles: ['resident'], organizationId: invitation.organizationId, propertyId: invitation.targetPropertyId }`.
    *   Creates the user profile document in `organizations/{invitation.organizationId}/properties/{invitation.targetPropertyId}/residents/{newUser.uid}`.
    *   Updates the invitation status to `"accepted"`.

## V. Email Templates (To be created in Firestore `templates` collection)

1.  **`propertyManagerInvitation` Template:**
    *   **Subject:** Invitation to Manage Properties on [App Name]
    *   **Body (HTML/Text):**
        ```
        Hello {{ inviteeName }},

        You have been invited by [Admin Name/Organization Name] to join {{ organizationName }} on [App Name] as a Property Manager.

        Please click the following link to accept this invitation and create your account:
        {{ invitationLink }}

        This link will expire in 7 days.

        If you were not expecting this invitation, please ignore this email.

        Thanks,
        The [App Name] Team
        ```

2.  **`residentInvitation` Template:**
    *   **Subject:** Invitation to Join {{ propertyName }} on [App Name]
    *   **Body (HTML/Text):**
        ```
        Hello {{ inviteeName }},

        You have been invited to join the {{ propertyName }} community on [App Name].

        Please click the following link to accept this invitation and create your account:
        {{ invitationLink }}

        This link will expire in 7 days.

        If you were not expecting this invitation, please ignore this email.

        Thanks,
        The [App Name] Team
        ```

This plan provides a comprehensive approach to implementing the required invitation flows.
