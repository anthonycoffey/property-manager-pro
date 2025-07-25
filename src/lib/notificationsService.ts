import {
  collection,
  query,
  onSnapshot,
  orderBy,
  getDocs,
  limit,
  startAfter,
  type DocumentSnapshot,
  type Query,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Define the structure of a Property Notification
export interface PropertyNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  createdBy: string;
  violationId?: string;
  vehicle?: {
    licensePlate?: string;
  };
}

export interface PaginatedNotificationsResult {
  notifications: PropertyNotification[];
  lastVisible: DocumentSnapshot | null;
  firstVisible: DocumentSnapshot | null;
}

/**
 * Fetches a paginated list of property-wide notifications.
 *
 * @param organizationId - The ID of the organization.
 * @param propertyId - The ID of the property.
 * @param pageLimit - The number of notifications to fetch per page.
 * @param startAfterDoc - The document snapshot to start after for the next page.
 * @returns A promise that resolves with the paginated notifications result.
 */
export const getPaginatedPropertyNotifications = async (
  organizationId: string,
  propertyId: string,
  pageLimit: number,
  startAfterDoc: DocumentSnapshot | null = null
): Promise<PaginatedNotificationsResult> => {
  if (!organizationId || !propertyId) {
    throw new Error(
      'Organization ID and Property ID must be provided to fetch notifications.'
    );
  }

  const notificationsRef = collection(
    db,
    `organizations/${organizationId}/properties/${propertyId}/notifications`
  );

  let q: Query<DocumentData>;
  if (startAfterDoc) {
    q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      startAfter(startAfterDoc),
      limit(pageLimit)
    );
  } else {
    q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );
  }

  const documentSnapshots = await getDocs(q);

  const notifications: PropertyNotification[] = [];
  documentSnapshots.forEach((doc) => {
    const data = doc.data();
    notifications.push({
      id: doc.id,
      title: data.title,
      message: data.message,
      createdAt: data.createdAt.toDate(),
      createdBy: data.createdBy,
      violationId: data.violationId,
      vehicle: data.vehicle,
    });
  });

  const lastVisible =
    documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;
  const firstVisible = documentSnapshots.docs[0] || null;

  return { notifications, lastVisible, firstVisible };
};


/**
 * Fetches property-wide notifications for a specific property in real-time.
 *
 * @param organizationId - The ID of the organization.
 * @param propertyId - The ID of the property.
 * @param callback - A function to be called with the notifications array whenever it updates.
 * @returns An unsubscribe function to detach the listener.
 */
export const getPropertyNotifications = (
  organizationId: string,
  propertyId: string,
  callback: (notifications: PropertyNotification[]) => void
) => {
  if (!organizationId || !propertyId) {
    console.error(
      'Organization ID and Property ID must be provided to fetch notifications.'
    );
    return () => {}; // Return a no-op unsubscribe function
  }

  const notificationsRef = collection(
    db,
    `organizations/${organizationId}/properties/${propertyId}/notifications`
  );
  const q = query(notificationsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const notifications: PropertyNotification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          violationId: data.violationId,
          vehicle: data.vehicle,
        });
      });
      callback(notifications);
    },
    (error) => {
      console.error('Error fetching property notifications:', error);
      callback([]);
    }
  );

  return unsubscribe;
};
