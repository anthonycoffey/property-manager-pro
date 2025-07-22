import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { Query } from 'firebase-admin/firestore';

export const getMyViolations = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { organizationId, propertyId, status, type, startDate, endDate, page, rowsPerPage } = request.data;
  const userId = request.auth.uid;

  if (!organizationId || !propertyId) {
    throw new HttpsError('invalid-argument', 'The function must be called with an "organizationId" and "propertyId".');
  }

  try {
    let query: Query = db.collection('organizations').doc(organizationId).collection('properties').doc(propertyId).collection('violations')
      .where('residentId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (type) {
      query = query.where('violationType', '==', type);
    }

    if (startDate) {
      query = query.where('createdAt', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('createdAt', '<=', new Date(endDate));
    }

    const totalSnapshot = await query.count().get();
    const total = totalSnapshot.data().count;

    const snapshot = await query.orderBy('createdAt', 'desc').limit(rowsPerPage).offset(page * rowsPerPage).get();
    const violations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { violations, total };
  } catch (error) {
    console.error('Error getting violations:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred.');
  }
});
