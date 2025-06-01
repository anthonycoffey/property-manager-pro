# Plan: Trigger Resident Invitation Emails from CSV Import in Campaigns (Revised)

**Date:** 2025-05-31

**Objective:**
Modify the `functions/src/callable/createCampaign.ts` Cloud Function so that for each resident imported via a CSV file during campaign creation:
1.  A unique invitation document is created in Firestore. The document ID for this invitation will be a UUID generated using `crypto.randomUUID()`.
2.  This invitation document includes a `campaignId` field, linking it back to the parent campaign document for analytics and tracking.
3.  An email is triggered via the `firestore-send-email` extension. This email will use the `residentInvitation` template, populated with dynamic data specific to each resident.
4.  The email contains an invitation link targeting the `/accept-invitation` frontend route. This link will include the generated UUID as a `token` query parameter and the `organizationId` as an `orgId` query parameter, ensuring compatibility with the existing `src/pages/AcceptInvitationPage.tsx`.

**Plan Details:**

The modifications will be made within the `functions/src/callable/createCampaign.ts` file.

## 1. Imports
Ensure `crypto` is available for `randomUUID()`:
```typescript
import crypto from 'crypto';
```
(This is already present in `functions/src/callable/createInvitation.ts`, so it should be fine, but good to note).

## 2. Pre-Loop Data Fetching & Setup
Before processing the CSV rows, the following data points will be fetched or determined once:

*   **Determine `appDomain`**:
    *   Leverage the existing logic within `createCampaign.ts` that determines the application's base URL (this logic is already used for constructing `accessUrl` for public link campaigns, typically sourcing from `functions.config().app.domain`).
*   **Fetch `propertyNameForEmail`**:
    *   Retrieve the name of the property using `campaignParams.propertyId`.
    *   Firestore query: `db.collection('organizations').doc(campaignParams.organizationId).collection('properties').doc(campaignParams.propertyId).get()`.
*   **Fetch `inviterNameForEmail`**:
    *   Retrieve the display name of the authenticated user (the one creating the campaign) using `context.auth.uid`.
    *   The Firestore query path will depend on the inviter's role:
        *   If Admin or Organization Manager: `db.collection('admins').doc(authUid).get()`.
        *   If Property Manager: `db.collection('organizations').doc(userOrganizationId).collection('users').doc(authUid).get()`.
*   **Set `appNameForEmail`**:
    *   Use the static string "Property Manager Pro".

## 3. CSV Processing Loop (For Each Resident)
For each valid resident row processed from the CSV file:

*   **Generate `invitationToken`**:
    ```typescript
    const invitationToken = crypto.randomUUID();
    ```
*   **Define `invitationRef` (Path to the invitation document in Firestore)**:
    ```typescript
    const invitationRef = db
      .collection('organizations')
      .doc(campaignParams.organizationId)
      .collection('invitations')
      .doc(invitationToken); // Use the generated UUID as the document ID
    ```
*   **Prepare `invitationData` (Content for the invitation document)**:
    ```typescript
    const invitationData = {
      email: /* resident's email from CSV */,
      displayName: /* resident's displayName from CSV, or null */,
      unitNumber: /* resident's unitNumber from CSV, or null */,
      rolesToAssign: campaignParams.rolesToAssign,
      organizationId: campaignParams.organizationId, // Store orgId on the invite itself
      targetPropertyId: campaignParams.propertyId,
      status: 'pending',
      createdBy: authUid, // UID of the user creating the campaign
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: newCampaignData.expiresAt, // expiresAt from the main campaign document data
      campaignId: campaignRef.id, // ID of the parent campaign document (e.g., campaignRef is from db.collection(...).doc())
      // The invitationToken (UUID) is the document ID, so not stored as a field.
      additionalCsvData: /* any other CSV data collected */,
    };
    ```
*   **Construct `invitationLink` (URL for the email)**:
    ```typescript
    const invitationLink = `${appDomain}/accept-invitation?token=${invitationToken}&orgId=${campaignParams.organizationId}`;
    ```
*   **Determine `inviteeName` for Email**:
    *   Use the `displayName` from the CSV for the current resident.
    *   If `displayName` is missing or empty, use the resident's `email` (from CSV) as a fallback.
*   **Prepare `mailData` (Content for the `/mail` collection document)**:
    *   This object will trigger the `firestore-send-email` extension.
    ```typescript
    const mailDocRef = db.collection('mail').doc(); // Firestore auto-generates ID for the mail document
    const mailData = {
      to: [/* resident's email from CSV */.trim()],
      template: {
        name: "residentInvitation",      // Name of the email template in Firestore's /templates collection
        data: {                          // Dynamic data for populating the template
          appName: appNameForEmail,
          propertyName: propertyNameForEmail,
          inviteeName: inviteeName,        // Determined above (displayName or email fallback)
          inviterName: inviterNameForEmail,
          invitationLink: invitationLink   // Constructed above
        }
      }
      // Optional: Add audit fields like createdBy: authUid, createdAt: FieldValue.serverTimestamp()
    };
    ```
*   **Add to Firestore Batch**:
    *   `batch.set(invitationRef, invitationData);`
    *   `batch.set(mailDocRef, mailData);`

## 4. Post-Loop Operations
*   Commit the Firestore batch (`batch.commit()`).
*   Update the main campaign document (`campaignRef`) with `totalInvitedFromCsv` and set its `status` to `active`.
*   Move the processed CSV file in Firebase Storage to the appropriate folder (e.g., `campaign_csvs_processed/`).

## Diagram of Key Data Flow for Email Triggering

```mermaid
graph TD
    A[CSV Uploaded] --> B(createCampaign Function);
    B -- Generates UUID --> BA(invitationToken);
    B -- Processes CSV Row --> C{For Each Resident};
    C -- Uses BA & orgId --> D[Invitation Document in /invitations/\{invitationToken\}];
    D -- Contains --> DA[campaignId];
    C -- Fetches/Determines --> E[appName, propertyName, inviterName, appDomain];
    C -- Constructs Link using BA & orgId --> F[invitationLink: /accept-invitation?token=UUID&orgId=...];
    C -- Creates Mail Data --> G{Mail Document Data};
    G -- Uses Template Name --> H(residentInvitation);
    G -- Populates With --> I[E.appName, E.propertyName, E.inviterName, F.invitationLink, Resident.inviteeName];
    B -- Writes Batch --> J[Firestore];
    J -- Includes --> K[D: Invitation Document];
    J -- Includes --> L[Mail Document in /mail collection using G];
    L -- Triggers --> M(firestore-send-email Extension);
    M -- Uses Template --> H;
    M -- Uses Data --> I;
    M -- Sends --> N[Email to Resident];
    N -- Clicks Link --> O(AcceptInvitationPage.tsx);
    O -- Uses token & orgId from F --> P[Processes Sign-up];
    P -- Calls signUpWithInvitation --> Q[signUpWithInvitation Cloud Function];
    Q -- Reads D using token & orgId --> R[Retrieves campaignId from DA];
    R -- Updates --> S[Campaign Analytics];
```

## Assumptions:
*   The `firestore-send-email` Firebase extension is correctly installed and configured to monitor the `/mail` collection.
*   An email template named `residentInvitation` exists in the `/templates` collection in Firestore and uses the placeholders as identified.
*   The Cloud Function (`createCampaign`) has the necessary IAM permissions for Firestore reads/writes and Storage operations.
*   `crypto.randomUUID()` is available and functional in the Cloud Functions environment.