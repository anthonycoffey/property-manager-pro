# Violation Status Workflow Documentation

This document outlines the updated workflow for handling parking violations, including the new status types and the automated process for escalating unassigned violations.

## 1. Violation Status Types

The `ViolationStatus` type has been updated to simplify the workflow and introduce new statuses for handling towing. The new statuses are:

-   `reported`: The initial status for all new violations.
-   `claimed`: A property manager has claimed the violation and is handling it.
-   `acknowledged`: A resident has acknowledged the violation.
-   `resolved`: The violation has been resolved.
-   `pending_tow`: The violation has been escalated and is pending tow.
-   `towed`: The vehicle has been towed.

The `pending` and `escalated` statuses have been removed.

## 2. Violation Creation

The `createViolationReport` Cloud Function has been updated to always set the status of a new violation to `reported`, regardless of whether a resident is matched to the license plate.

-   If a resident is matched, a notification is sent to the resident.
-   If no resident is matched, a notification is sent to the property manager.

## 3. Automated Escalation

A new scheduled function, `processUnassignedViolations`, runs every minute to automatically escalate unassigned violations.

-   The function queries for all violations with a status of `reported` that were created more than 5 minutes ago.
-   For each found violation, it updates the status to `pending_tow`.
-   It then creates a notification for the property manager who originally reported the violation, informing them that the violation is now pending tow.

This replaces the previous `checkUnacknowledgedViolations` function.

## 4. Frontend Updates

The frontend components have been updated to reflect the new workflow:

-   `MyViolationsListView.tsx`: The violation list now correctly displays the new statuses with appropriate labels and colors.
-   `ViolationDetailView.tsx`: Residents can now acknowledge violations with the `reported` status.
-   `violationsService.ts`: The service has been updated to use the new `ViolationStatus` type and handle the updated data structure.

This new workflow simplifies the violation management process and provides a clear path for escalating unassigned violations.
