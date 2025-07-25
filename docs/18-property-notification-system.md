# Property-Wide Notification System Documentation

This document outlines the functionality and architecture of the property-wide notification system. This system allows authorized users to create and view historical, property-level announcements or logs.

## 1. System Purpose

The primary purpose of this feature is to allow authorized users (Property Managers, Organization Managers, Admins) to send a push notification to all residents of a specific property. It serves as a property-wide announcement system for important alerts and information.

When a notification is created, it is also saved as a historical record, allowing managers to review past announcements in their dashboard.

## 2. User Workflow & Technical Components

The process involves a frontend interface for creating notifications, a backend function to save the notification, and a Firestore trigger to dispatch the push notifications.

### Frontend Components

*   **`src/components/PropertyManager/Notifications/PropertyNotificationsView.tsx`**:
    *   This is the main view where a Property Manager can see a paginated list of all historical notifications for a selected property.
    *   It fetches data using the `getPaginatedPropertyNotifications` service.
    *   It contains a "Create Notification" button that opens the creation modal.

*   **`src/components/PropertyManager/Notifications/CreatePropertyNotificationModal.tsx`**:
    *   A modal form that allows the user to input a `title` and `message` for the new notification.
    *   It can optionally associate the notification with a vehicle license plate or a specific violation.
    *   On submission, it calls the `createPropertyNotification` backend function.

### Backend Components

*   **`functions/src/callable/createPropertyNotification.ts`**:
    *   An HTTPS Callable Cloud Function that handles the secure creation of a notification document.
    *   **Authorization:** It verifies that the calling user has the required role (`admin`, `organization_manager`, or `property_manager`).
    *   **Input Validation:** It ensures all required data (`organizationId`, `propertyId`, `title`, `message`) is present.
    *   **Data Creation:** It creates a new document in the appropriate Firestore collection. This action is the catalyst for the push notification.

*   **`functions/src/triggers/sendPropertyNotification.ts`**:
    *   A Firestore `onCreate` trigger that listens for new documents in any property's `notifications` subcollection.
    *   When a new notification document is created, this trigger fires automatically.
    *   **Action:** It fetches all residents registered to that property, collects their FCM tokens, and sends a multicast push notification with the notification's title and message to all of them via Firebase Cloud Messaging.

## 3. Process Flow

1.  **Initiation:** An authorized user (Admin, Org Manager, or Property Manager) fills out and submits the "Create Notification" form in the web application.
2.  **Callable Function:** The submission calls the `createPropertyNotification` Cloud Function.
3.  **Firestore Write:** The function validates the request and writes a new notification document to the `organizations/{orgId}/properties/{propId}/notifications` collection.
4.  **Firestore Trigger:** The `onCreate` trigger `sendPropertyNotification` fires in response to the new document.
5.  **Token Aggregation:** The trigger function queries all resident documents within that property and collects their `fcmTokens`.
6.  **Push Notification Dispatch:** The trigger sends a multicast push notification via Firebase Cloud Messaging (FCM) to all collected tokens.
7.  **Delivery:** All residents of the property receive the announcement on their devices.

## 4. Firestore Data Structure

Notifications created by this system are stored in a subcollection within a specific property document.

**Path:** `organizations/{organizationId}/properties/{propertyId}/notifications/{notificationId}`

**Example Document:**
```json
{
  "title": "Lobby Maintenance Scheduled",
  "message": "Please be advised that the main lobby will be closed for floor polishing on Monday from 9 AM to 5 PM.",
  "createdBy": "pm_user_uid_123",
  "createdAt": "2025-07-25T22:10:00.000Z",
  "violationId": null, // or "violation_abc" if linked
  "vehicle": null // or { "licensePlate": "XYZ-789" } if linked
}
```

This structure ensures that all notifications are neatly organized under the property they belong to, making them easy to query and display in the `PropertyNotificationsView`.
