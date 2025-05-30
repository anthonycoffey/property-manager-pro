import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
// import * as admin from "firebase-admin"; // No longer needed for direct use here
import { storage } from "../firebaseAdmin.js"; // Import storage from firebaseAdmin

// Initialization is handled in firebaseAdmin.js
// const storage = admin.storage(); // Replaced by imported storage
const BUCKET_NAME = storage.bucket().name; // Get default bucket name
const PROCESSED_FOLDER = "campaign_csvs_processed";
const FAILED_FOLDER = "campaign_csvs_failed"; // Also cleanup failed attempts after a while
const RETENTION_DAYS = 30; // Delete files older than 30 days

export const cleanupProcessedCampaignCSVs = onSchedule(
  "every 24 hours", // Schedule
  async (event) => { // event is of type scheduler.ScheduledEvent
    logger.info("Starting cleanup of processed campaign CSVs (v2 scheduler)...");
    // event.id and event.timeZone are not standard properties of v2 ScheduledEvent.
    // event.jobName could be logged if needed: logger.info(`Job Name: ${event.jobName}`);
    logger.info(`Scheduled Time: ${event.scheduleTime}`);


    const now = Date.now();
    const retentionPeriodMillis = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const cleanupFolder = async (folderPath: string) => {
      const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: `${folderPath}/` });
      let deletedCount = 0;

      logger.info(`Found ${files.length} files in ${folderPath}.`);

      for (const file of files) {
        if (file.metadata && file.metadata.timeCreated) {
          const timeCreated = new Date(file.metadata.timeCreated).getTime();
          
          if (now - timeCreated > retentionPeriodMillis) {
            try {
              await file.delete();
              deletedCount++;
              logger.info(`Deleted old file: ${file.name}`);
            } catch (error) {
              logger.error(`Failed to delete file: ${file.name}`, error);
            }
          }
        } else {
          logger.warn(`File ${file.name} missing timeCreated metadata, skipping.`);
        }
      }
      return deletedCount;
    };

    try {
      const processedDeleted = await cleanupFolder(PROCESSED_FOLDER);
      logger.info(`Cleanup of ${PROCESSED_FOLDER} complete. Deleted ${processedDeleted} files.`);
      
      const failedDeleted = await cleanupFolder(FAILED_FOLDER);
      logger.info(`Cleanup of ${FAILED_FOLDER} complete. Deleted ${failedDeleted} files.`);

    } catch (error) {
      logger.error("Error during CSV cleanup (v2 scheduler):", error);
    }
    // No explicit return null needed for v2 onSchedule, it's void or Promise<void>
  }
);
