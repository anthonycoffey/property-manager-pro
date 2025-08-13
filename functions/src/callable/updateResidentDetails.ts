import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore'; // Added FieldValue
import type { Resident, AppError, Vehicle } from '../types.js'; // Added Vehicle

interface UpdateResidentData {
  organizationId: string;
  propertyId: string;
  residentId: string;
  // Allow any partial update of Resident, excluding fields that shouldn't be client-editable
  updatedData: Partial<
    Omit<
      Resident,
      | 'id'
      | 'email'
      | 'organizationId'
      | 'propertyId'
      | 'roles'
      | 'createdAt'
      | 'invitedBy'
    >
  > & { unitNumber?: string };
}

export const updateResidentDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const { organizationId, propertyId, residentId, updatedData } =
    request.data as UpdateResidentData;

  if (!organizationId || !propertyId || !residentId || !updatedData) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required data: organizationId, propertyId, residentId, or updatedData.'
    );
  }

  let authorized = false;
  if (callerRoles.includes('admin')) {
    authorized = true; // Admins can update any resident
  } else if (callerRoles.includes('organization_manager')) {
    const callerOrgIds =
      (request.auth.token?.organizationIds as string[]) || [];
    if (callerOrgIds.includes(organizationId)) {
      authorized = true;
    }
  } else if (callerRoles.includes('property_manager')) {
    const callerOrgId = request.auth.token?.organizationId as
      | string
      | undefined;
    if (callerOrgId === organizationId) {
      // Further check: Does this PM manage this specific property?
      // This might require fetching the property document to check 'managedBy'.
      // For simplicity now, we assume if PM is in the org, they can edit residents in that org's properties.
      // A stricter check would involve verifying property management.
      const propertyRef = db.doc(
        `organizations/${organizationId}/properties/${propertyId}`
      );
      const propertyDoc = await propertyRef.get();
      if (propertyDoc.exists && propertyDoc.data()?.managedBy === callerUid) {
        authorized = true;
      } else if (propertyDoc.exists) {
        // If PM is not directly managing, but is an OM of the org, they should be allowed.
        // This case is covered by 'organization_manager' role check above.
        // If just a PM, not managing this specific property, then deny.
        // This logic is a bit redundant if OM check is done first.
        // Let's assume for now PMs can only edit residents of properties they directly manage.
      }
    }
  }

  if (!authorized) {
    throw new HttpsError(
      'permission-denied',
      'User does not have permission to update resident details for this property/organization.'
    );
  }

  // Refined authorization for property_manager: must manage the specific property
  if (callerRoles.includes('property_manager') && authorized) {
    // Re-check if authorized was set to true by PM role
    const propertyRef = db.doc(
      `organizations/${organizationId}/properties/${propertyId}`
    );
    const propertyDoc = await propertyRef.get();
    if (!propertyDoc.exists || propertyDoc.data()?.managedBy !== callerUid) {
      authorized = false; // Revoke authorization if PM doesn't manage this specific property
      throw new HttpsError(
        'permission-denied',
        'Property manager does not manage this specific property.'
      );
    }
  }

  const residentDocRef = db.doc(
    `organizations/${organizationId}/properties/${propertyId}/residents/${residentId}`
  );

  try {
    const residentDocSnap = await residentDocRef.get();
    if (!residentDocSnap.exists) {
      throw new HttpsError('not-found', 'Resident document not found.');
    }

    const allowedFields: Array<keyof typeof updatedData> = [
      'displayName',
      'leaseStartDate',
      'leaseEndDate',
      'vehicles',
    ];

    const sanitizedUpdateData: Partial<Resident> = {};
    let hasValidUpdate = false;

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updatedData, key)) {
        const value = updatedData[key];
        let fieldProcessed = false;

        if (key === 'leaseStartDate' || key === 'leaseEndDate') {
          if (value === null || value === undefined) {
            // Handle undefined as well for explicit clear
            sanitizedUpdateData[key] = undefined; // Firestore will remove the field if value is undefined
            fieldProcessed = true;
          } else if (
            value &&
            typeof value === 'object' &&
            'seconds' in value &&
            'nanoseconds' in value &&
            typeof (value as { seconds: unknown }).seconds === 'number' &&
            typeof (value as { nanoseconds: unknown }).nanoseconds === 'number'
          ) {
            sanitizedUpdateData[key] = new Timestamp(
              (value as { seconds: number }).seconds,
              (value as { nanoseconds: number }).nanoseconds
            );
            fieldProcessed = true;
          } else if (
            value &&
            (typeof value === 'string' || value instanceof Date)
          ) {
            const dateObj = new Date(value as string | Date); // Cast to avoid TS error with Date constructor
            if (!isNaN(dateObj.getTime())) {
              sanitizedUpdateData[key] = Timestamp.fromDate(dateObj);
            } else {
              console.warn(`Invalid date value received for ${key}:`, value);
            }
            fieldProcessed = true;
          }
        }

        if (!fieldProcessed && value !== undefined) {
          (sanitizedUpdateData as Partial<Record<keyof Resident, unknown>>)[
            key as keyof Resident
          ] = value;
        }

        if (
          value !== undefined ||
          (fieldProcessed &&
            (key === 'leaseStartDate' || key === 'leaseEndDate'))
        ) {
          hasValidUpdate = true;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatedData, 'unitNumber')) {
      const unitNumber = updatedData.unitNumber as string | undefined;
      if (unitNumber !== undefined) {
        (sanitizedUpdateData as Record<string, unknown>)['address.unit'] =
          unitNumber;
        hasValidUpdate = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updatedData, 'vehicles')) {
      const vehicles = updatedData.vehicles as Vehicle[] | undefined; // Cast for type safety

      if (vehicles !== undefined) {
        // Check if vehicles is explicitly provided (could be null or an array)
        if (
          vehicles === null ||
          (Array.isArray(vehicles) && vehicles.length === 0)
        ) {
          // If vehicles is explicitly set to null or an empty array, treat as clearing vehicles
          sanitizedUpdateData.vehicles = []; // Store empty array
          hasValidUpdate = true; // This is a valid update
        } else if (Array.isArray(vehicles)) {
          if (vehicles.length > 2) {
            throw new HttpsError(
              'invalid-argument',
              'A maximum of 2 vehicles are allowed.'
            );
          }
          for (const vehicle of vehicles) {
            if (
              !vehicle.make ||
              !vehicle.model ||
              !vehicle.year ||
              !vehicle.color ||
              !vehicle.plate
            ) {
              throw new HttpsError(
                'invalid-argument',
                'All fields (make, model, year, color, plate) are required for each vehicle.'
              );
            }
            if (
              isNaN(vehicle.year) ||
              vehicle.year < 1900 ||
              vehicle.year > new Date().getFullYear() + 2
            ) {
              throw new HttpsError(
                'invalid-argument',
                `Invalid year for vehicle: ${vehicle.make} ${vehicle.model}.`
              );
            }
          }
          // 'vehicles' field itself is already handled by the loop for allowedFields
          hasValidUpdate = true; // This is a valid update
        } else {
          // 'vehicles' is present but not an array and not null (e.g. a string, number)
          throw new HttpsError(
            'invalid-argument',
            'Invalid format for vehicles. Expected an array or null.'
          );
        }
      }
    }


    if (!hasValidUpdate) {
      throw new HttpsError(
        'invalid-argument',
        'No valid fields or actual changes provided for update.'
      );
    }

    await residentDocRef.update(sanitizedUpdateData);

    return { success: true, message: 'Resident details updated successfully.' };
  } catch (error) {
    if (error instanceof HttpsError) {
      // Check if it's already an HttpsError
      throw error;
    }
    const e = error as AppError;
    console.error(
      'Error updating resident details:',
      e.message,
      e.code ? `(${e.code})` : '',
      e
    );
    throw new HttpsError(
      'internal',
      e.message || 'An internal error occurred while updating resident details.'
    );
  }
});
