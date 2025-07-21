# Guide: Migrating Expo App to Firebase Cloud Messaging (FCM)

This guide outlines the necessary steps to update your Expo-based mobile application to use native Firebase Cloud Messaging (FCM) instead of Expo's push notification service. This change is required to align with the backend, which uses the Firebase Admin SDK to send notifications directly.

## 1. Why This Change is Necessary

The backend notification system is built on the standard Firebase Admin SDK, which sends messages using FCM tokens. Your mobile app currently generates and stores an Expo Push Token, which is only compatible with Expo's notification services (`expo-server-sdk`).

To receive notifications from the Firebase backend, the mobile app **must**:
1.  Generate a native FCM token.
2.  Store this FCM token in the user's profile in Firestore.

## 2. Required Dependencies

You will need to install and configure the React Native Firebase library.

```bash
npx expo install @react-native-firebase/app
npx expo install @react-native-firebase/messaging
```

You will also need to add the Firebase config plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ]
  }
}
```

## 3. Firebase Project Configuration

Ensure you have the `google-services.json` (for Android) and `GoogleService-Info.plist` (for iOS) files correctly configured in your Firebase project settings and downloaded into your Expo project's root directory. The `@react-native-firebase/app` plugin will automatically link these during the prebuild process.

Refer to the [React Native Firebase documentation](https://rnfirebase.io/messaging/usage#background-application-state) for detailed setup instructions.

## 4. Code Modifications

The primary change will be in your push notification registration logic. You need to replace `expo-notifications` with `@react-native-firebase/messaging` for token generation.

### File to Modify: `lib/services/notifications.ts`

You will need to rewrite the `registerForPushNotificationsAsync` function.

**Current Implementation (Using Expo):**
```typescript
import * as Notifications from 'expo-notifications';
// ...
token = (await Notifications.getExpoPushTokenAsync()).data;
// ...
await setDoc(userDocRef, { expoPushToken: token }, { merge: true });
```

**New Implementation (Using Firebase Messaging):**

```typescript
import { doc, setDoc, arrayUnion, getDoc } from 'firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { db } from '../config/firebaseConfig';
import { PermissionsAndroid, Platform } from 'react-native';

export const registerForPushNotificationsAsync = async (userId: string, organizationId: string, propertyId: string) => {
  try {
    // Request permission for iOS
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Authorization status:', authStatus);
        alert('Failed to get permission for push notification!');
        return;
      }
    } else if (Platform.OS === 'android') {
        // Request permission for Android (API 33+)
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (result !== 'granted') {
            alert('Failed to get permission for push notification!');
            return;
        }
    }


    // Check if an FCM token already exists
    const existingToken = await messaging().getToken();
    if (!existingToken) {
        console.error('Failed to get FCM token.');
        return;
    }

    console.log('FCM Token:', existingToken);

    const userDocRef = doc(
      db,
      'organizations',
      organizationId,
      'properties',
      propertyId,
      'residents',
      userId
    );

    // Check if the token is already stored to avoid duplicates
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.data();
    const storedTokens = userData?.fcmTokens || [];

    if (storedTokens.includes(existingToken)) {
      console.log('FCM token already stored.');
      return existingToken;
    }

    // Store the new token in an array field named 'fcmTokens'
    await setDoc(userDocRef, {
      fcmTokens: arrayUnion(existingToken)
    }, { merge: true });

    return existingToken;

  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
};
```

## 5. Key Changes Summarized

1.  **Token Generation:** `messaging().getToken()` replaces `Notifications.getExpoPushTokenAsync()`.
2.  **Permissions:** You now use `messaging().requestPermission()` for iOS and `PermissionsAndroid` for Android to request notification permissions.
3.  **Firestore Field:** The token is stored in a field named `fcmTokens`. This field should be an **array**, as a user can have multiple devices. The `arrayUnion` operation ensures that you add the new token without creating duplicates.
4.  **No More `expoPushToken`:** The `expoPushToken` field is no longer used by the backend and can be removed from your Firestore documents over time.

## 6. Handling Notifications

You will also need to adjust how your app handles incoming notifications.

### File to Modify: `lib/context/NotificationsContext.tsx`

You can use the `messaging().onMessage()` and `messaging().setBackgroundMessageHandler()` methods to listen for incoming notifications when the app is in the foreground and background/quit state, respectively.

```typescript
// In your main App component or a high-level context provider
useEffect(() => {
  // Handles foreground messages
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
    // You can trigger a local notification here or update the UI directly
  });

  // Handles notifications that opened the app from a background state
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log(
      'Notification caused app to open from background state:',
      remoteMessage.notification,
    );
    // Navigate to the correct screen based on remoteMessage.data
  });

  // Check if the app was opened from a quit state
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log(
          'Notification caused app to open from quit state:',
          remoteMessage.notification,
        );
        // Navigate to the correct screen based on remoteMessage.data
      }
    });

  return unsubscribe;
}, []);
```

By following this guide, you will successfully transition your mobile app to use native FCM, enabling it to receive notifications sent from the updated backend.
