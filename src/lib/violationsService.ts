import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  getCountFromServer,
  startAfter,
  QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { app } from '../firebaseConfig';

const db = getFirestore(app);

// Define the structure of a violation
type ViolationStatus = 'pending' | 'acknowledged' | 'escalated' | 'reported';

interface Violation {
  id: string;
  licensePlate: string;
  violationType: string;
  photoUrl: string;
  status: ViolationStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  residentId?: string;
  reporterId?: string;
}

interface GetMyViolationsParams {
  organizationId: string;
  propertyId: string;
  userId: string;
  rowsPerPage: number;
  sortBy: string;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
}

export const getMyViolations = async ({
  organizationId,
  propertyId,
  userId,
  rowsPerPage,
  sortBy,
  lastVisible,
}: GetMyViolationsParams) => {
  const violationsRef = collection(
    db,
    'organizations',
    organizationId,
    'properties',
    propertyId,
    'violations'
  );

  let q = query(violationsRef, where('residentId', '==', userId));

  // Handle sorting
  const [sortField, sortDirection] = sortBy.split('_');
  if (sortField && sortDirection) {
    q = query(q, orderBy(sortField, sortDirection as 'asc' | 'desc'));
  } else {
    // Default sort
    q = query(q, orderBy('createdAt', 'desc'));
  }

  // Get total count for pagination
  const totalSnapshot = await getCountFromServer(q);
  const total = totalSnapshot.data().count;

  // Apply pagination
  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }
  q = query(q, limit(rowsPerPage));

  const snapshot = await getDocs(q);
  const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
  const violations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate(),
    } as Violation;
  });

  return { violations, total, lastVisible: lastVisibleDoc };
};

interface GetViolationDetailsByIdParams {
  organizationId: string;
  propertyId: string;
  violationId: string;
  userId: string;
}

export const getViolationDetailsById = async ({
  organizationId,
  propertyId,
  violationId,
  userId,
}: GetViolationDetailsByIdParams) => {
  const violationRef = doc(
    db,
    'organizations',
    organizationId,
    'properties',
    propertyId,
    'violations',
    violationId
  );

  const violationSnap = await getDoc(violationRef);

  if (!violationSnap.exists()) {
    throw new Error('Violation not found.');
  }

  const violationData = violationSnap.data() as Violation;

  // Security check
  if (
    violationData.residentId !== userId &&
    violationData.reporterId !== userId
  ) {
    throw new Error('You do not have permission to view this violation.');
  }

  const data = violationSnap.data();
  const returnData: Violation = {
    id: violationSnap.id,
    licensePlate: data.licensePlate,
    violationType: data.violationType,
    photoUrl: data.photoUrl,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    acknowledgedAt: data.acknowledgedAt
      ? data.acknowledgedAt.toDate()
      : undefined,
    residentId: data.residentId,
    reporterId: data.reporterId,
  };
  return returnData;
};
