# Guide: CSV Import Campaigns for Resident Invitations

This guide explains how to use the CSV Import Campaign feature in Property Manager Pro to bulk invite residents to your properties. It covers the process for users (Property Managers, Organization Managers, Administrators) and provides technical details for developers.

## 1. For Users: Managing CSV Import Campaigns

### 1.1. What are CSV Import Campaigns?

CSV Import Campaigns allow you to invite multiple residents to a specific property simultaneously by uploading a Comma Separated Values (CSV) file containing their information. This is an efficient way to onboard many residents at once, for example, when a new building opens or when transitioning a large number of existing residents to the platform.

**Key Benefits:**
*   **Efficiency:** Invite hundreds of residents with a single file upload.
*   **Accuracy:** Reduces manual data entry errors by using a structured file.
*   **Trackability:** Monitor the status of invitations sent via the campaign.

### 1.2. Step-by-Step: Creating and Managing a CSV Import Campaign

#### Step 1: Prepare Your CSV File

This is the most crucial step. A correctly formatted CSV file ensures smooth processing.

**File Requirements:**
*   The file **must** be in CSV format (e.g., `my_residents.csv`).
*   The file **must** include a header row as the very first line.
*   The character encoding should be UTF-8 for best compatibility with various names and characters.

**Recognized Column Headers (Flexible Matching):**

The system is flexible with column header names. It attempts to match common variations, ignoring case and differences in spacing or separators (like underscores or hyphens).

*   **Email (Required):**
    *   This column is **mandatory** for an invitation to be sent.
    *   *Accepted header examples:* `Email`, `email`, `E-mail`, `email_address`, `EmailAddress`.
    *   If a recognizable email column is not found, or if the email value in a row is missing or empty, that row will be skipped.

*   **Display Name (Optional):**
    *   The full name of the resident.
    *   *Accepted header examples:* `DisplayName`, `display_name`, `Name`, `Full Name`, `fullname`.
    *   If provided, this name will be used. If omitted, the resident can enter it during sign-up.

*   **Street (Optional):**
    *   The street address of the resident.
    *   *Accepted header examples:* `street`, `streetaddress`, `address`.
*   **City (Optional):**
    *   The city of the resident.
    *   *Accepted header examples:* `city`.
*   **State (Optional):**
    *   The state or province of the resident.
    *   *Accepted header examples:* `state`, `province`.
*   **Zip (Optional):**
    *   The zip or postal code of the resident.
    *   *Accepted header examples:* `zip`, `zipcode`, `postalcode`.
*   **Unit (Optional):**
    *   The resident's unit or apartment number.
    *   *Accepted header examples:* `unitnumber`, `unit_number`, `unit`, `unitno`, `apt`, `apartmentnumber`, `unit_no`, `apt_number`, `apt_no`.

**Other Columns (Additional Data):**
*   Any other columns present in your CSV file that don't match the recognized fields above will still be imported.
*   Their data will be stored as "additional CSV data" associated with the invitation. This allows for future use or reference without requiring immediate system support for those specific fields.

**Example CSV Content (with varied headers):**

```csv
email_address,display_name,street,city,state,zip,unit,PhoneNumber
resident.one@example.com,Alice Wonderland,123 Main St,Anytown,CA,12345,101A,555-1234
resident.two@example.com,,456 Oak Ave,Anytown,CA,12345,202B,555-5678
another.user@example.com,Bob The Builder,789 Pine Ln,Anytown,CA,12345,,
,No Name,321 Elm St,Anytown,CA,12345,303C,555-0000
```

**Key Considerations:**
*   **Email is Key:** An invitation will only be created if a valid email is found for a row.
*   **Header Flexibility:** While flexible, it's good practice to use clear and common header names (e.g., `Email`, `Display Name` or `display_name`, `Unit Number` or `unit_number`).
*   **Additional Data:** Data from unrecognized columns (like `PhoneNumber` in the example) is captured and stored with the invitation, but not yet used for specific features unless the system is later enhanced to recognize those fields.
*   Rows completely missing a value in the column identified as the 'Email' column will be skipped.

**Best Practices for CSV Files:**
*   **Verify Email Addresses:** Ensure all email addresses are correct and active.
*   **Clear Headers:** Use descriptive headers. While the system is flexible, clear headers make your CSVs easier to manage.
*   **Consistent Data:** Check for typos or inconsistencies in your data.
*   **File Size:** While the system is designed to handle large files, extremely large files (e.g., tens of thousands of rows) might take longer to process. Consider splitting very large lists if feasible.
*   **Save as CSV:** When using spreadsheet software (like Excel or Google Sheets), make sure to "Save As" or "Export" as a CSV file.

#### Step 2: Create the Campaign in Property Manager Pro

1.  Navigate to the "Campaigns" section for the desired property.
2.  Click on "Create Campaign" (or similar button).
3.  **Campaign Name:** Enter a descriptive name (e.g., "Phase 1 Onboarding - Tower A", "Spring 2025 Resident Welcome").
4.  **Campaign Type:** Select **"CSV Import"**.
5.  **Roles to Assign:** This will typically be pre-set to "Resident".
6.  **Upload CSV File:** Select the CSV file you prepared in Step 1.
7.  **Optional Settings:**
    *   **Max Uses:** Not typically applicable for CSV imports as each row is a distinct invitation.
    *   **Expires At:** You can set an expiration date for the invitations sent through this campaign. After this date, pending invitations may no longer be valid.
8.  Submit the form to create the campaign.

#### Step 3: What Happens After Upload?

*   **File Upload & Initial Processing:** Your CSV file is securely uploaded to the system. The campaign status will initially show as **"Processing"**.
*   **Invitation Generation & Email Sending:** The system reads your CSV file row by row.
    *   For each valid entry (with an email address), an individual invitation record is created.
    *   An invitation email is automatically sent to the resident's email address. This email will contain a unique link for them to sign up.
*   **Campaign Status Update:** Once all valid rows have been processed and initial invitations are queued for sending, the campaign status will change to **"Active"**.
*   **File Archival:** Your uploaded CSV file is moved to a secure "processed" area in storage.

#### Step 4: Monitor Your Campaign

*   From the "Campaigns" list, you can see:
    *   `Total Invited from CSV`: The number of valid entries found and processed from your file.
    *   `Total Accepted`: The number of residents who have successfully signed up using an invitation from this campaign.
    *   `Status`: The current status of the campaign (e.g., Active, Completed, Expired, Error).

### 1.3. Understanding Campaign Statuses

*   **Processing:** The CSV file is currently being processed.
*   **Active:** Invitations have been sent (or are being sent), and the campaign is live.
*   **Error:** A problem occurred during the processing of the CSV file (e.g., the file was unreadable, or a system error occurred). Details may be available, or you may need to contact support. The original file might be moved to a "failed" archive.
*   **Completed:** (If applicable) The campaign might be marked as completed if all invited residents have responded or if a defined condition is met.
*   **Expired:** The campaign has passed its `expiresAt` date.
*   **Inactive:** The campaign has been manually deactivated.

### 1.4. CSV File Security and Retention

*   Uploaded CSV files are stored securely.
*   After processing, files are moved to an internal archive (`campaign_csvs_processed/` or `campaign_csvs_failed/`).
*   These archived files are automatically deleted after a set retention period (e.g., 30 days) by a scheduled cleanup process for data hygiene.

## 2. For Developers: Technical Workflow & Components

This section details the backend processes and components involved in CSV Import Campaigns.

### 2.1. System Workflow Overview

1.  **Frontend (UI):** User (PM/OM/Admin) prepares a CSV, fills out the campaign creation form in the application, selects "CSV Import," and uploads the file. The file is typically uploaded directly to Firebase Storage by the client to a `campaign_csvs_pending/` path.
2.  **`createCampaign` Cloud Function Call:** The frontend calls the `createCampaign` (v1 Callable) Firebase Function, providing campaign parameters and the `storageFilePath` of the uploaded CSV.
3.  **Campaign Document Creation:** The function creates a campaign document in Firestore: `organizations/{orgId}/properties/{propId}/campaigns/{campaignId}`.
4.  **CSV Download & Parsing:** The function downloads the CSV from `storageFilePath`, parses it using `csv-parse/sync`.
5.  **Invitation Batch Creation:** For each valid CSV row, an `invitation` document is created in `organizations/{orgId}/invitations/`. These are linked to the `campaignId`.
6.  **Email Trigger:** The creation of `invitation` documents (if configured with the `firestore-send-email` extension) triggers individual invitation emails.
7.  **Campaign Update & File Archival:** The campaign document is updated (status to 'active', `totalInvitedFromCsv`). The CSV file in Storage is moved from `pending` to `processed` (or `failed`).
8.  **Resident Sign-up:** The resident uses the email link, leading to the `signUpWithInvitation` function, which updates the invitation and campaign (`totalAccepted`).
9.  **Scheduled Cleanup:** The `cleanupProcessedCampaignCSVs` scheduled function periodically deletes old CSVs from `processed` and `failed` folders in Storage.

### 2.2. Key Components

*   **`createCampaign.ts` (Firebase Callable Function v1):**
    *   Orchestrates the CSV import process.
    *   Handles authentication, authorization, input validation.
    *   Interacts with Firestore to create/update campaign and invitation documents.
    *   Interacts with Firebase Storage to download and move CSV files.
*   **Firebase Storage:**
    *   `campaign_csvs_pending/{userId}/{fileId}`: Initial upload location (example path).
    *   `campaign_csvs_processed/{userId}/{campaignId}/{originalFileName}`: Archive for successfully processed files.
    *   `campaign_csvs_failed/{userId}/{campaignId}/{originalFileName}`: Archive for files that failed processing.
*   **Cloud Firestore:**
    *   `organizations/{orgId}/properties/{propId}/campaigns/{campaignId}`: Stores campaign details, status, and aggregate counts.
    *   `organizations/{orgId}/invitations/{invitationId}`: Stores individual invitations generated from the CSV, linked by `campaignId`.
*   **`firestore-send-email` Extension (Assumed):**
    *   Monitors the `invitations` collection (or a dedicated `mail` collection triggered by invitation creation) to send emails.
*   **`cleanupProcessedCampaignCSVs.ts` (Firebase Scheduled Function v2):**
    *   Runs periodically (e.g., daily) to delete files older than a defined retention period (e.g., 30 days) from the `campaign_csvs_processed/` and `campaign_csvs_failed/` folders.

### 2.3. CSV Parsing Details

The `csv-parse/sync` library is configured with:
*   `columns: true`: Uses the first row as headers to create key-value pairs for each record.
*   `skip_empty_lines: true`: Ignores blank lines.
*   `trim: true`: Removes leading/trailing whitespace from cell values.

The system then normalizes these headers (converts to lowercase, standardizes separators to underscores) and attempts to map them to known internal fields (`email`, `displayName`, `unitNumber`) based on a predefined list of common variations (e.g., `email_address`, `display_name`, `unit_no`). Columns that do not map to a known field are stored in an `additionalCsvData` field on the invitation document.

### 2.4. Error Handling & File Management

*   **Row-Level Errors:** Rows missing an `Email` are skipped silently (logged on the server).
*   **File-Level Errors:** If the CSV file cannot be downloaded or parsed, or a major system error occurs during processing:
    *   The campaign `status` is set to `'error'`.
    *   `errorDetails` may be written to the campaign document.
    *   The original CSV file is moved to the `campaign_csvs_failed/` folder in Storage.
    *   The `createCampaign` function throws an `HttpsError('internal', ...)` to the client.
*   **File Movement Errors:** If moving the file to `processed` or `failed` folders encounters an issue, this is logged, but the primary operation (invitation creation) might still be considered successful. For processed files, metadata (`processed: 'true'`) is set on the original file as a fallback.

### 2.5. Security and Permissions

*   The `createCampaign` function enforces that only authorized users (Admin, Org Manager, Property Manager with correct organizational scope) can create campaigns.
*   Firebase Storage rules should be configured to:
    *   Allow authenticated users to upload to a designated `pending` path.
    *   Restrict direct public read access to these files.
    *   Allow the Cloud Function's service account to read from `pending` and write/delete in `processed` and `failed` paths.
*   Firestore rules protect campaign and invitation data.

## 3. Best Practices & Troubleshooting

### For All Users:

*   **Clear CSV Headers:** While the system is flexible, using clear headers like `Email`, `Display Name`, `Unit Number` (or `email`, `display_name`, `unit_number`) is recommended for your own clarity.
*   **Validate Email Addresses:** Use a tool or spot-check emails for common typos before uploading.
*   **Small Test File:** Before uploading a large list, try a small CSV with 2-3 rows to ensure the process works as expected.
*   **Check Campaign Status:** If invitations aren't received, check the campaign status in the application. If it's "Error," there might be an issue with the file or system.
*   **Patience with Large Files:** Processing large CSVs and sending many emails can take some time. Monitor the campaign status for updates.

### For Developers:

*   **Monitor Cloud Function Logs:** Check Firebase console logs for `createCampaign` for detailed error messages or processing information.
*   **Check Storage Folders:** If issues arise, inspect the `pending`, `processed`, and `failed` folders in Firebase Storage.
*   **Review Firestore Data:** Examine campaign and invitation documents in Firestore for debugging.
*   **Test `firestore-send-email`:** Ensure the email sending extension is correctly configured and processing emails.

This guide should provide a comprehensive understanding of the CSV Import Campaign feature.
