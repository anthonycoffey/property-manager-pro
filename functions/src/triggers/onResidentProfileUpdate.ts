import { firestore } from 'firebase-functions/v1';
import { logger } from 'firebase-functions';
import { isEqual } from 'lodash-es';

// This function triggers on any write to a resident's document.
// It automatically maintains a denormalized array of license plates (`vehicleLicensePlates`)
// based on the `vehicles` array of objects, allowing for efficient querying.
export const onResidentProfileUpdate = firestore
  .document('organizations/{organizationId}/properties/{propertyId}/residents/{residentId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // If the document is deleted, there's nothing to do.
    if (!afterData) {
      return null;
    }

    const beforeVehicles = beforeData?.vehicles || [];
    const afterVehicles = afterData.vehicles || [];

    // Check if the vehicles array has actually changed to prevent unnecessary writes.
    if (isEqual(beforeVehicles, afterVehicles)) {
      return null;
    }

    const newLicensePlates = afterVehicles.map((vehicle: { plate: string }) => vehicle.plate).filter(Boolean);

    // Check if the denormalized array is already up-to-date. This is a crucial check
    // to prevent the function from entering an infinite loop of self-triggers.
    const currentLicensePlates = afterData.vehicleLicensePlates || [];
    if (isEqual(newLicensePlates, currentLicensePlates)) {
      logger.info(`No update needed for resident ${context.params.residentId}, license plates are already in sync.`);
      return null;
    }

    logger.info(`Updating license plates for resident ${context.params.residentId}`);
    return change.after.ref.update({
      vehicleLicensePlates: newLicensePlates,
    });
  });
