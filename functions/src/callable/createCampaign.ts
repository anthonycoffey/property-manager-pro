import * as functions from 'firebase-functions';
import { https as v1Https } from 'firebase-functions/v1';
import { HttpsError, CallableContext } from 'firebase-functions/v1/https';
import { parse } from 'csv-parse/sync';
import { db, storage, FieldValue, Timestamp } from '../firebaseAdmin.js';
import crypto from 'crypto';

interface CampaignData {
  organizationId: string;
  propertyId: string;
  campaignName: string;
  campaignType: 'csv_import' | 'public_link';
  rolesToAssign: string[];
  maxUses?: number | null;
  expiresAt?: Timestamp | null;
  storageFilePath?: string;
  sourceFileName?: string;
}

interface CreateCampaignParams {
  organizationId: string;
  propertyId: string;
  campaignName: string;
  campaignType: 'csv_import' | 'public_link';
  rolesToAssign: string[];
  maxUses?: number;
  expiresAt?: number;
  storageFilePath?: string;
  sourceFileName?: string;
}

// Interface for defining how known CSV fields are processed
interface FieldConfig {
  canonicalName: 'email' | 'displayName' | 'unitNumber' | string; // Core fields + allows future string keys
  expectedCsvHeaders: string[]; // Possible CSV header names (after normalization)
  isRequired?: boolean;
}

// Configuration for known CSV fields
const KNOWN_FIELDS_CONFIG: FieldConfig[] = [
  {
    canonicalName: 'email',
    expectedCsvHeaders: ['email', 'e_mail', 'emailaddress', 'email_address'],
    isRequired: true,
  },
  {
    canonicalName: 'displayName',
    expectedCsvHeaders: ['displayname', 'display_name', 'name', 'fullname', 'full_name'],
  },
  {
    canonicalName: 'unitNumber',
    expectedCsvHeaders: [
      'unitnumber',
      'unit_number',
      'unit',
      'unitno',
      'apt',
      'apartmentnumber',
      'unit_no',
      'apt_number',
      'apt_no',
    ],
  },
];

// Helper function to normalize CSV headers for matching
// Converts to lowercase, replaces spaces and hyphens with underscores, removes other non-alphanumeric characters (except underscore)
function normalizeHeader(header: string): string {
  if (!header || typeof header !== 'string') return '';
  return header
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export const createCampaign = v1Https.onCall(
  // Use v1Https
  async (
    data: CreateCampaignParams, // Changed to CreateCampaignParams
    context: CallableContext // Use imported CallableContext
  ) => {
    const campaignParams = data; // No longer need to cast

    // Correct CallableContext type
    if (!context.auth) {
      throw new HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    // context.auth is now guaranteed to be defined
    const { uid: authUid, token: authToken } = context.auth;

    // Determine appDomain (frontendAppBaseUrl) once for constructing links
    let appDomain: string;
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      const configuredDomain = functions.config().app?.domain;
      if (configuredDomain) {
        if (configuredDomain.toLowerCase() === "localhost") {
          appDomain = 'http://localhost:5173'; // Default Vite dev server port
        } else {
          appDomain = configuredDomain.startsWith('http') ? configuredDomain : `http://${configuredDomain}`;
        }
      } else {
        appDomain = 'http://localhost:5173'; // Default emulator frontend
      }
    } else {
      const prodDomain = functions.config().app?.domain;
      if (!prodDomain) {
        functions.logger.error(
          "CRITICAL: functions.config().app.domain is not set for production environment! Public campaign links and invitation emails will use hardcoded fallback. This MUST be configured."
        );
        appDomain = 'https://phoenix-property-manager-pro.web.app'; // Default production frontend
      } else {
        appDomain = prodDomain.startsWith('http') ? prodDomain : `https://${prodDomain}`;
      }
    }

    // Validate roles - Admin, Organization Manager, Property Manager
    const roles = authToken.roles as string[] | undefined; // Roles from custom claims
    const userOrganizationId = authToken.organizationId as string | undefined; // Used for PM inviter name fetch
    const userOrganizationIds = authToken.organizationIds as
      | string[]
      | undefined; // For Org Managers

    const isAdmin = roles?.includes('admin') ?? false;
    const isOrganizationManager =
      roles?.includes('organization_manager') ?? false;
    const isPropertyManager = roles?.includes('property_manager') ?? false;

    let authorized = false;
    if (isAdmin) {
      authorized = true;
    } else if (isOrganizationManager) {
      if (userOrganizationIds?.includes(campaignParams.organizationId)) {
        // Use campaignParams
        authorized = true;
      }
    } else if (isPropertyManager) {
      if (userOrganizationId === campaignParams.organizationId) {
        // Use campaignParams
        // Further check if PM is assigned to this specific property if needed,
        // For now, org-level access is sufficient for creating a campaign for a property in their org.
        authorized = true;
      }
    }

    if (!authorized) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to create a campaign for this organization/property.'
      );
    }

    // Validate input data (basic checks, more detailed in Firestore rules)
    if (
      !campaignParams.organizationId || // Use campaignParams
      !campaignParams.propertyId || // Use campaignParams
      !campaignParams.campaignName || // Use campaignParams
      !campaignParams.campaignType || // Use campaignParams
      !campaignParams.rolesToAssign || // Use campaignParams
      campaignParams.rolesToAssign.length === 0
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required campaign data.'
      );
    }
    if (
      campaignParams.campaignType === 'csv_import' &&
      !campaignParams.storageFilePath
    ) {
      // Use campaignParams
      throw new HttpsError(
        'invalid-argument',
        'storageFilePath is required for csv_import campaigns.'
      );
    }
    if (campaignParams.rolesToAssign[0] !== 'resident') {
      // Use campaignParams
      throw new HttpsError(
        'invalid-argument',
        "Currently, campaigns only support assigning the 'resident' role."
      );
    }

    const campaignRef = db
      .collection('organizations')
      .doc(campaignParams.organizationId) // Use campaignParams
      .collection('properties')
      .doc(campaignParams.propertyId) // Use campaignParams
      .collection('campaigns')
      .doc(); // Auto-generate ID

    const newCampaignData: Omit<
      CampaignData,
      'organizationId' | 'propertyId'
    > & {
      // Base fields for Firestore
      createdBy: string;
      createdAt: FirebaseFirestore.FieldValue; // Use FieldValue from firebaseAdmin
      status: 'active' | 'processing' | 'error'; // Initial status
      totalAccepted: 0;
      targetPropertyId: string; // For clarity in the document
      propertyId: string; // For clarity in the document
      organizationId: string; // For clarity in the document
      id: string; // Store the document ID as a field
      // Optional fields based on type
      accessUrl?: string;
      totalInvitedFromCsv?: number;
      storageFilePath?: string;
      sourceFileName?: string;
      maxUses?: number | null; // Match CampaignData
      expiresAt?: Timestamp | null; // Match CampaignData // Changed to use imported Timestamp
    } = {
      campaignName: campaignParams.campaignName, // Use campaignParams
      campaignType: campaignParams.campaignType, // Use campaignParams
      rolesToAssign: campaignParams.rolesToAssign, // Use campaignParams
      maxUses:
        campaignParams.maxUses !== undefined ? campaignParams.maxUses : null, // Use campaignParams
      expiresAt: campaignParams.expiresAt
        ? Timestamp.fromMillis(campaignParams.expiresAt) // Correctly use imported Timestamp.fromMillis
        : null,
      createdBy: authUid,
      createdAt: FieldValue.serverTimestamp(), // Correct use of FieldValue
      status:
        campaignParams.campaignType === 'csv_import' ? 'processing' : 'active', // Use campaignParams
      totalAccepted: 0,
      targetPropertyId: campaignParams.propertyId, // Use campaignParams
      propertyId: campaignParams.propertyId, // Use campaignParams
      organizationId: campaignParams.organizationId, // Use campaignParams
      id: campaignRef.id, // Add the document ID here
    };


    let accessUrl: string | undefined = undefined;

    // Type-specific setup
    if (campaignParams.campaignType === 'public_link') {
      // The accessUrl points to the new frontend handler page, using the already determined appDomain
      accessUrl = `${appDomain}/join-public-campaign?campaign=${campaignRef.id}`;
      newCampaignData.accessUrl = accessUrl;
    } else if (campaignParams.campaignType === 'csv_import') {
      // Use campaignParams
      if (!campaignParams.storageFilePath || !campaignParams.sourceFileName) {
        // Use campaignParams
        throw new HttpsError(
          'invalid-argument',
          'storageFilePath and sourceFileName are required for CSV imports.'
        );
      }
      newCampaignData.storageFilePath = campaignParams.storageFilePath; // Use campaignParams
      newCampaignData.sourceFileName = campaignParams.sourceFileName; // Use campaignParams
      newCampaignData.totalInvitedFromCsv = 0; // Will be updated after parsing
    }

    // Create the campaign document
    await campaignRef.set(newCampaignData);
    functions.logger.info(`Campaign ${campaignRef.id} created by ${authUid}.`);

    // --- CSV Processing (if applicable) ---
    if (
      campaignParams.campaignType === 'csv_import' &&
      campaignParams.storageFilePath
    ) {
      // Use campaignParams
      const filePath = campaignParams.storageFilePath; // Use campaignParams
      const bucket = storage.bucket(); // Default bucket
      const file = bucket.file(filePath);

      // --- Pre-Loop Data Fetching for Email Template (specific to CSV import) ---
      let propertyNameForEmail = 'Your Property'; // Fallback
      let inviterNameForEmail = 'The Management Team'; // Fallback
      const appNameForEmail = 'Property Manager Pro'; // As per plan

      try {
        // Fetch Property Name
        const propertyDoc = await db
          .collection('organizations')
          .doc(campaignParams.organizationId)
          .collection('properties')
          .doc(campaignParams.propertyId)
          .get();
        if (propertyDoc.exists) {
          propertyNameForEmail = propertyDoc.data()?.name || propertyNameForEmail;
        } else {
          functions.logger.warn(`Property ${campaignParams.propertyId} not found for campaign ${campaignRef.id}. Using fallback name for email.`);
        }

        // Fetch Inviter's Name
        // Ensure userOrganizationId is available for Property Manager role check
        const currentPMUserOrgId = isPropertyManager ? userOrganizationId : null;

        let inviterProfileDoc;
        if (isAdmin || isOrganizationManager) {
          inviterProfileDoc = await db.collection('admins').doc(authUid).get();
        } else if (isPropertyManager && currentPMUserOrgId) { // Check currentPMUserOrgId
          inviterProfileDoc = await db.collection('organizations').doc(currentPMUserOrgId).collection('users').doc(authUid).get();
        }


        if (inviterProfileDoc?.exists) {
          inviterNameForEmail = inviterProfileDoc.data()?.displayName || inviterProfileDoc.data()?.name || inviterNameForEmail;
        } else {
          functions.logger.warn(`Inviter profile ${authUid} not found (or org ID missing for PM). Using fallback name for email.`);
        }
      } catch (fetchError) {
        functions.logger.error(`Error fetching property/inviter details for campaign ${campaignRef.id} emails:`, fetchError);
        // Proceeding with fallback names.
      }
      // --- End Pre-Loop Data Fetching for Email Template ---

      try {
        const [fileBuffer] = await file.download();
        // Parse CSV. `columns: true` makes each record an object keyed by header names.
        const rawRecords: Record<string, string>[] = parse(fileBuffer, {
          columns: true, // Headers become keys
          skip_empty_lines: true,
          trim: true,
        });

        let invitedCount = 0;
        const batch = db.batch(); // Initialize batch here, once before the loop.

        for (const rawRecord of rawRecords) {
          const processedData: { [key: string]: string | null } = {};
          const additionalCsvData: { [key: string]: string | null } = {};

          // Get all headers from the current raw record
          const originalCsvHeaders = Object.keys(rawRecord);
          const remainingNormalizedHeaders: { [key: string]: string } = {};
          originalCsvHeaders.forEach(header => {
            remainingNormalizedHeaders[normalizeHeader(header)] = header;
          });

          let skipRecord = false;

          // Populate processedData based on KNOWN_FIELDS_CONFIG
          for (const fieldConfig of KNOWN_FIELDS_CONFIG) {
            let foundValue: string | null = null;
            let matchedNormalizedHeaderKey: string | undefined = undefined;

            for (const expectedNormalizedHeader of fieldConfig.expectedCsvHeaders) {
              if (
                remainingNormalizedHeaders[expectedNormalizedHeader] &&
                rawRecord[remainingNormalizedHeaders[expectedNormalizedHeader]] !== undefined
              ) {
                foundValue = rawRecord[remainingNormalizedHeaders[expectedNormalizedHeader]]?.trim() || null;
                matchedNormalizedHeaderKey = expectedNormalizedHeader;
                break;
              }
            }

            if (foundValue) {
              processedData[fieldConfig.canonicalName] = foundValue;
              if (matchedNormalizedHeaderKey) {
                delete remainingNormalizedHeaders[matchedNormalizedHeaderKey]; // Remove processed header
              }
            } else if (fieldConfig.isRequired) {
              functions.logger.warn(
                `Skipping record for campaign ${campaignRef.id}. Required field '${fieldConfig.canonicalName}' not found or empty. Original record:`,
                rawRecord
              );
              skipRecord = true;
              break; // Stop processing this record
            }
          }

          if (skipRecord) {
            continue; // Move to the next rawRecord
          }

          // Check for email specifically after attempting to map it via KNOWN_FIELDS_CONFIG
          const emailValue = processedData['email'];
          if (!emailValue || typeof emailValue !== 'string' || emailValue.trim() === '') {
            functions.logger.warn(
              `Skipping record due to missing or invalid email after mapping for campaign ${campaignRef.id}:`,
              rawRecord
            );
            continue;
          }
          
          // Populate additionalCsvData with remaining columns
          for (const normalizedHeaderKey in remainingNormalizedHeaders) {
            const originalHeader = remainingNormalizedHeaders[normalizedHeaderKey];
            additionalCsvData[originalHeader] = rawRecord[originalHeader]?.trim() || null;
          }

          const invitationToken = crypto.randomUUID();
          const invitationRef = db
            .collection('organizations')
            .doc(campaignParams.organizationId)
            .collection('invitations')
            .doc(invitationToken); // Use UUID as document ID

          const invitationData = {
            email: emailValue.trim(), // Already validated
            displayName: (processedData['displayName'] as string)?.trim() || null,
            unitNumber: (processedData['unitNumber'] as string)?.trim() || null,
            rolesToAssign: campaignParams.rolesToAssign,
            organizationId: campaignParams.organizationId, // Keep for direct reference if needed
            organizationIds: [campaignParams.organizationId], // Add the array for consistency
            targetPropertyId: campaignParams.propertyId,
            status: 'pending',
            createdBy: authUid,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: newCampaignData.expiresAt,
            campaignId: campaignRef.id,
            additionalCsvData: Object.keys(additionalCsvData).length > 0 ? additionalCsvData : null, // Add if not empty
          };
          batch.set(invitationRef, invitationData);

          // --- Add Mail Document to Batch for this resident ---
          const invitationLink = `${appDomain}/accept-invitation?token=${invitationToken}&orgId=${campaignParams.organizationId}`;
          const inviteeName = (processedData['displayName'] as string)?.trim() || emailValue.trim(); // Fallback to email if displayName is not present

          const mailDocRef = db.collection('mail').doc(); // Auto-generate ID for mail document
          const mailData = {
            to: [emailValue.trim()],
            template: {
              name: "residentInvitation", // Name of the template in Firestore /templates collection
              data: {
                appName: appNameForEmail,
                propertyName: propertyNameForEmail,
                inviteeName: inviteeName,
                inviterName: inviterNameForEmail,
                invitationLink: invitationLink,
              }
            },
            // Optional: Add audit fields for the mail document itself
            // createdBy: authUid,
            // createdAt: FieldValue.serverTimestamp(),
          };
          batch.set(mailDocRef, mailData);
          // --- End Add Mail Document ---

          invitedCount++;
        }

        if (invitedCount > 0) {
          await batch.commit();
        } else {
          functions.logger.info(`No valid records found to process for campaign ${campaignRef.id}.`);
        }
        functions.logger.info(
          `Processed ${invitedCount} invitations for campaign ${campaignRef.id}.`
        );

        // Update campaign with total invited and set status to active
        await campaignRef.update({
          totalInvitedFromCsv: invitedCount,
          status: 'active',
        });

        // Move processed file to "processed" folder
        const originalFileName =
          campaignParams.sourceFileName ||
          filePath.split('/').pop() ||
          'unknownfile.csv'; // Use campaignParams
        const newPath = `campaign_csvs_processed/${authUid}/${campaignRef.id}/${originalFileName}`;
        try {
          await file.move(newPath);
          functions.logger.info(
            `Moved processed CSV from ${filePath} to ${newPath}`
          );
        } catch (moveError) {
          functions.logger.error(
            `Error moving CSV from ${filePath} to ${newPath}:`,
            moveError
          );
          // If moving fails, don't fail the whole operation, but log it.
          // The cleanup function can potentially find it based on metadata if we add it.
          // Or, we can add metadata to the original file indicating it's processed.
          await file.setMetadata({
            metadata: { processed: 'true', campaignId: campaignRef.id },
          });
        }
      } catch (error) {
        functions.logger.error(
          'Error processing CSV for campaign ' + campaignRef.id + ':',
          error
        );
        await campaignRef.update({
          status: 'error',
          errorDetails: 'Failed to process CSV file.',
        });
        // Optionally move to a "failed" folder
        const originalFileName =
          campaignParams.sourceFileName ||
          filePath.split('/').pop() ||
          'unknownfile.csv'; // Use campaignParams
        const failedPath = `campaign_csvs_failed/${authUid}/${campaignRef.id}/${originalFileName}`;
        try {
          await file.move(failedPath);
        } catch (moveError) {
          functions.logger.error(
            `Error moving CSV to failed folder ${failedPath}:`,
            moveError
          );
        }
        throw new HttpsError('internal', 'Error processing CSV file.', error);
      }
    }

    return {
      campaignId: campaignRef.id,
      accessUrl: accessUrl, // Will be undefined for csv_import
    };
  }
);
