import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js'; // adminAuth not directly used here, but request.auth is
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import crypto from 'crypto';

// Define a more specific type for invitationData
interface InvitationData {
  name: string;
  email: string;
  organizationIds: string[] | null; // Changed from organizationId to organizationIds, can be null
  rolesToAssign: string[];
  status: 'pending' | 'accepted' | 'expired';
  createdBy: string;
  invitedByRole: 'admin' | 'property_manager' | 'organization_manager'; // Added organization_manager
  createdAt: FirebaseFirestore.FieldValue;
  expiresAt: Date | FirebaseFirestore.FieldValue;
  invitationType:
    | 'resident'
    | 'property_manager'
    | 'organization_manager'
    | string;
  targetPropertyId?: string;
}

// Define a more specific type for emailData
interface EmailTemplateData {
  inviteeName: string;
  invitationLink: string;
  appName: string;
  inviterName: string;
  organizationName?: string;
  propertyName?: string;
}

export const createInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const {
    inviteeEmail,
    inviteeName,
    organizationIds, // Expecting an array or undefined
    rolesToAssign,
    invitedByRole,
    targetPropertyId,
  } = request.data as {
    inviteeEmail: string;
    inviteeName: string | undefined | null; // Optional, can be undefined
    organizationIds?: string[]; // Optional array
    rolesToAssign: string[];
    invitedByRole: string;
    targetPropertyId?: string;
  };

  // Basic validation for universally required fields
  if (
    !inviteeEmail ||
    !rolesToAssign ||
    !Array.isArray(rolesToAssign) ||
    rolesToAssign.length === 0 ||
    !invitedByRole
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Missing or invalid required fields for invitation (email, rolesToAssign, invitedByRole).'
    );
  }

  // Specific validation for organizationIds based on role being invited
  // If inviting an organization_manager, organizationIds is optional (can be empty or undefined).
  // If inviting other roles (e.g. property_manager, resident), organizationIds must be provided and contain exactly one ID.
  if (!rolesToAssign.includes('organization_manager')) {
    if (
      !organizationIds ||
      organizationIds.length !== 1 ||
      !organizationIds[0]
    ) {
      throw new HttpsError(
        'invalid-argument',
        'A single organizationId must be provided in the organizationIds array for this type of invitation.'
      );
    }
  } else {
    // For organization_manager, organizationIds can be undefined, empty, or contain multiple.
    // No specific validation error here for organizationIds itself, as it's flexible.
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgIdFromToken = request.auth.token?.organizationId as
    | string
    | undefined; // For PM
  const callerOrgIdsFromToken =
    (request.auth.token?.organizationIds as string[]) || []; // For Org Manager

  // Extract the single orgId for non-OM invites, or handle OM invites
  const singleOrgIdForInvite =
    !rolesToAssign.includes('organization_manager') &&
    organizationIds &&
    organizationIds.length === 1
      ? organizationIds[0]
      : null;

  try {
    if (invitedByRole === 'admin') {
      if (!callerRoles.includes('admin')) {
        throw new HttpsError(
          'permission-denied',
          'Only administrators can create invitations.'
        );
      }
      // Admin inviting property_manager: singleOrgIdForInvite must be valid.
      if (rolesToAssign.includes('property_manager') && !singleOrgIdForInvite) {
        throw new HttpsError(
          'invalid-argument',
          'A single organizationId is required when an admin invites a property_manager.'
        );
      }
      // Admin inviting organization_manager: organizationIds can be empty, single, or multiple.
    } else if (invitedByRole === 'property_manager') {
      if (!singleOrgIdForInvite) {
        throw new HttpsError(
          'invalid-argument',
          'A single organizationId is required for property manager invitations.'
        );
      }
      if (
        !callerRoles.includes('property_manager') ||
        callerOrgIdFromToken !== singleOrgIdForInvite
      ) {
        throw new HttpsError(
          'permission-denied',
          'Property managers can only invite within their own organization.'
        );
      }
      if (rolesToAssign.includes('resident') && !targetPropertyId) {
        throw new HttpsError(
          'invalid-argument',
          'targetPropertyId is required for resident invitations by property managers.'
        );
      }
      if (targetPropertyId) {
        const propertyRef = db.doc(
          `organizations/${singleOrgIdForInvite}/properties/${targetPropertyId}`
        );
        const propertyDoc = await propertyRef.get();
        if (!propertyDoc.exists) {
          throw new HttpsError(
            'not-found',
            `Property ${targetPropertyId} not found in organization ${singleOrgIdForInvite}.`
          );
        }
      }
    } else if (invitedByRole === 'organization_manager') {
      if (!callerRoles.includes('organization_manager')) {
        throw new HttpsError(
          'permission-denied',
          'Caller is not an organization manager.'
        );
      }
      if (rolesToAssign.includes('resident')) {
        // OM inviting a resident
        if (!singleOrgIdForInvite) {
          throw new HttpsError(
            'invalid-argument',
            'A single organizationId is required when an organization manager invites a resident.'
          );
        }
        if (!callerOrgIdsFromToken.includes(singleOrgIdForInvite)) {
          throw new HttpsError(
            'permission-denied',
            'Organization manager cannot invite for an unassigned organization.'
          );
        }
        if (!targetPropertyId) {
          throw new HttpsError(
            'invalid-argument',
            'targetPropertyId is required for resident invitations.'
          );
        }
        const propertyRef = db.doc(
          `organizations/${singleOrgIdForInvite}/properties/${targetPropertyId}`
        );
        const propertyDoc = await propertyRef.get();
        if (!propertyDoc.exists) {
          throw new HttpsError(
            'not-found',
            `Property ${targetPropertyId} not found in organization ${singleOrgIdForInvite}.`
          );
        }
      } else if (rolesToAssign.includes('property_manager')) {
        // OM inviting a property_manager
        if (!singleOrgIdForInvite) {
          throw new HttpsError(
            'invalid-argument',
            'A single organizationId is required when an organization manager invites a property manager.'
          );
        }
        if (!callerOrgIdsFromToken.includes(singleOrgIdForInvite)) {
          throw new HttpsError(
            'permission-denied',
            'Organization manager cannot invite for an unassigned organization.'
          );
        }
      }
    } else {
      throw new HttpsError(
        'invalid-argument',
        'Invalid invitedByRole specified.'
      );
    }

    const invitationToken = crypto.randomUUID();
    let invitationPath: string;

    // All organization_manager invitations go to globalInvitations.
    // Other role invitations go under their specific organization.
    if (rolesToAssign.includes('organization_manager')) {
      invitationPath = `globalInvitations/${invitationToken}`;
    } else if (singleOrgIdForInvite) {
      invitationPath = `organizations/${singleOrgIdForInvite}/invitations/${invitationToken}`;
    } else {
      throw new HttpsError(
        'internal',
        'Could not determine invitation path due to missing organizationId for non-OM invitation.'
      );
    }

    const invitationData: InvitationData = {
      name: inviteeName || inviteeEmail,
      email: inviteeEmail,
      // For OM invites, store the array (can be empty or null if not provided). For others, store null as it's not their primary org list.
      organizationIds: rolesToAssign.includes('organization_manager')
        ? organizationIds && organizationIds.length > 0
          ? organizationIds
          : null
        : null,
      rolesToAssign: rolesToAssign,
      status: 'pending',
      createdBy: callerUid,
      invitedByRole: invitedByRole as
        | 'admin'
        | 'property_manager'
        | 'organization_manager',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: FieldValue.serverTimestamp(), // Will be overwritten
      invitationType: rolesToAssign.includes('resident')
        ? 'resident'
        : rolesToAssign.includes('property_manager')
        ? 'property_manager'
        : rolesToAssign.includes('organization_manager')
        ? 'organization_manager'
        : 'general',
    };

    // Determine and set organizationIds for the invitation document
    let finalOrganizationIdsForDoc: string[] | null = null;
    if (rolesToAssign.includes('organization_manager')) {
      // For OM invites, organizationIds can be an array (empty or populated) or null if not provided.
      finalOrganizationIdsForDoc =
        organizationIds && organizationIds.length > 0 ? organizationIds : null;
    } else {
      // For non-OM roles (e.g., property_manager, resident),
      // prior validation ensures 'organizationIds' input is an array with exactly one valid string.
      // So, organizationIds![0] is safe to access here.
      if (
        organizationIds &&
        organizationIds.length === 1 &&
        organizationIds[0]
      ) {
        finalOrganizationIdsForDoc = [organizationIds[0]];
      } else {
        // This block should ideally not be reached if input validation is effective.
        // Logging an error if this unexpected state occurs.
        console.error(
          '[createInvitation] Critical error: organizationIds not correctly validated for non-OM role before setting in document.',
          { rolesToAssign, organizationIds }
        );
        // To prevent undefined, explicitly set to null, though this indicates a logic flaw elsewhere.
        finalOrganizationIdsForDoc = null;
        // Consider throwing an error if this state is truly invalid and should halt execution.
        throw new HttpsError(
          'internal',
          'Failed to determine organizationIds for non-OM invitation due to inconsistent validation.'
        );
      }
    }
    invitationData.organizationIds = finalOrganizationIdsForDoc;

    if (targetPropertyId && rolesToAssign.includes('resident')) {
      invitationData.targetPropertyId = targetPropertyId;
    }

    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    invitationData.expiresAt = new Date(Date.now() + sevenDaysInMillis);

    await db.doc(invitationPath).set(invitationData);
    console.log(`Invitation created at ${invitationPath} for ${inviteeEmail}`);

    // Use the new paradigm for APP_DOMAIN
    const LOCAL_DOMAIN = 'http://localhost:5173';
    const PRODUCTION_DOMAIN = 'https://amenities.24hrcarunlocking.com';
    const APP_DOMAIN =
      process.env.FUNCTIONS_EMULATOR === 'true'
        ? LOCAL_DOMAIN
        : PRODUCTION_DOMAIN;

    const appName = 'Property Manager Pro';
    let emailTemplateName = '';
    let invitationLink: string;

    // Construct the rendered subject for the message fallback
    const renderedSubject = `Invitation to Manage Organization on ${appName}`;

    if (rolesToAssign.includes('organization_manager')) {
      invitationLink = `${APP_DOMAIN}/accept-org-manager-invitation?token=${invitationToken}`;
    } else {
      invitationLink = `${APP_DOMAIN}/accept-invitation?token=${invitationToken}`;
      if (singleOrgIdForInvite) {
        invitationLink += `&orgId=${singleOrgIdForInvite}`;
      }
    }

    const emailData: EmailTemplateData = {
      inviteeName: inviteeName || inviteeEmail,
      invitationLink: invitationLink,
      appName: appName,
      inviterName: '24hrcarunlocking.com',
    };

    let inviterDisplayName = request.auth.token.name || '24hrcarunlocking.com';
    if (!request.auth.token.name) {
      let inviterProfilePath = '';
      if (callerRoles.includes('admin')) {
        inviterProfilePath = `admins/${callerUid}`;
      } else if (
        callerRoles.includes('property_manager') &&
        callerOrgIdFromToken
      ) {
        inviterProfilePath = `organizations/${callerOrgIdFromToken}/users/${callerUid}`;
      } else if (
        callerRoles.includes('organization_manager') &&
        singleOrgIdForInvite
      ) {
        // If OM is inviting for a specific org (e.g. a resident)
        inviterProfilePath = `organizations/${singleOrgIdForInvite}/users/${callerUid}`;
      }
      // If OM is inviting another OM (not currently supported by this flow for OM as inviter)
      // or if admin is inviting OM without org, inviter is admin.

      if (inviterProfilePath) {
        const inviterProfile = await db.doc(inviterProfilePath).get();
        if (inviterProfile.exists && inviterProfile.data()?.displayName) {
          inviterDisplayName = inviterProfile.data()?.displayName;
        }
      }
    }
    emailData.inviterName = inviterDisplayName;

    if (rolesToAssign.includes('organization_manager')) {
      emailTemplateName = 'organizationManagerInvitation';
      if (
        invitationData.organizationIds &&
        invitationData.organizationIds.length > 0
      ) {
        // For now, just pick the first org name if multiple are assigned for the email.
        // A more sophisticated email might list them or use a generic term.
        const firstOrgId = invitationData.organizationIds[0];
        const orgDoc = await db.doc(`organizations/${firstOrgId}`).get();
        emailData.organizationName = orgDoc.exists
          ? orgDoc.data()?.name || firstOrgId
          : firstOrgId;
      } else {
        emailData.organizationName = 'an Organization Manager role';
      }
    } else if (
      rolesToAssign.includes('property_manager') &&
      singleOrgIdForInvite
    ) {
      emailTemplateName = 'propertyManagerInvitation';
      const orgDoc = await db
        .doc(`organizations/${singleOrgIdForInvite}`)
        .get();
      emailData.organizationName = orgDoc.exists
        ? orgDoc.data()?.name || singleOrgIdForInvite
        : singleOrgIdForInvite;
    } else if (
      rolesToAssign.includes('resident') &&
      targetPropertyId &&
      singleOrgIdForInvite
    ) {
      emailTemplateName = 'residentInvitation';
      const propDoc = await db
        .doc(
          `organizations/${singleOrgIdForInvite}/properties/${targetPropertyId}`
        )
        .get();
      emailData.propertyName = propDoc.exists
        ? propDoc.data()?.name || targetPropertyId
        : targetPropertyId;
    } else {
      console.error(
        'Could not determine email template for roles:',
        rolesToAssign
      );
      throw new HttpsError(
        'internal',
        'Could not determine email template for the invitation.'
      );
    }

    await db.collection('mail').add({
      to: inviteeEmail,
      message: {
        subject: renderedSubject,
        text: `Hello ${emailData.inviteeName}, you've been invited to ${appName}. Please check the HTML email.`,
        html: '<h1>Please see HTML content</h1>', // Basic HTML fallback
        attachments: [],
      },
      template: {
        name: emailTemplateName,
        data: emailData,
      },
    });
    console.log(
      `Email trigger created for invitation ${invitationToken} to ${inviteeEmail}`
    );

    return {
      success: true,
      message: 'Invitation created and email triggered successfully.',
      invitationId: invitationToken,
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create invitation.');
  }
});
