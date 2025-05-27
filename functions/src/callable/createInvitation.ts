import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../firebaseAdmin.js'; // adminAuth not directly used here, but request.auth is
import { handleHttpsError } from '../helpers/handleHttpsError.js';
import crypto from 'crypto';

// Define a more specific type for invitationData
interface InvitationData {
  name: string;
  email: string;
  organizationId: string;
  rolesToAssign: string[];
  status: 'pending' | 'accepted' | 'expired';
  createdBy: string;
  invitedByRole: 'admin' | 'property_manager';
  createdAt: FirebaseFirestore.FieldValue;
  expiresAt: Date | FirebaseFirestore.FieldValue;
  invitationType: 'resident' | 'property_manager' | string;
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
    organizationId,
    rolesToAssign, // e.g., ['property_manager'] or ['resident']
    invitedByRole, // 'admin' or 'property_manager'
    targetPropertyId, // Optional, only for resident invitations
  } = request.data;

  if (
    !inviteeEmail ||
    !organizationId ||
    !rolesToAssign ||
    !Array.isArray(rolesToAssign) ||
    rolesToAssign.length === 0 ||
    !invitedByRole
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Missing or invalid required fields for invitation.'
    );
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgId = request.auth.token?.organizationId as string | undefined;

  try {
    if (invitedByRole === 'admin') {
      if (!callerRoles.includes('admin')) {
        throw new HttpsError(
          'permission-denied',
          'Only administrators can create admin-level invitations.'
        );
      }
    } else if (invitedByRole === 'property_manager') {
      if (
        !callerRoles.includes('property_manager') ||
        callerOrgId !== organizationId
      ) {
        throw new HttpsError(
          'permission-denied',
          'Property managers can only invite within their own organization.'
        );
      }
      if (rolesToAssign.includes('resident') && !targetPropertyId) {
        throw new HttpsError(
          'invalid-argument',
          'targetPropertyId is required for resident invitations.'
        );
      }
      if (targetPropertyId) {
        const propertyRef = db.doc(
          `organizations/${organizationId}/properties/${targetPropertyId}`
        );
        const propertyDoc = await propertyRef.get();
        if (!propertyDoc.exists) {
          throw new HttpsError(
            'not-found',
            `Property ${targetPropertyId} not found in organization ${organizationId}.`
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
    const invitationPath = `organizations/${organizationId}/invitations/${invitationToken}`;

    const invitationData: InvitationData = {
      name: inviteeName || inviteeEmail, // Use email if name is not provided
      email: inviteeEmail,
      organizationId: organizationId,
      rolesToAssign: rolesToAssign,
      status: 'pending',
      createdBy: callerUid,
      invitedByRole: invitedByRole as 'admin' | 'property_manager',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: FieldValue.serverTimestamp(),
      invitationType: rolesToAssign.includes('resident')
        ? 'resident'
        : rolesToAssign.includes('property_manager')
        ? 'property_manager'
        : 'general',
    };

    if (targetPropertyId && rolesToAssign.includes('resident')) {
      invitationData.targetPropertyId = targetPropertyId;
    }

    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    invitationData.expiresAt = new Date(Date.now() + sevenDaysInMillis);

    await db.doc(invitationPath).set(invitationData);
    console.log(`Invitation created at ${invitationPath} for ${inviteeEmail}`);

    const projectId = process.env.GCLOUD_PROJECT || 'your-project-id-fallback';
    let appDomain = `${projectId}.firebaseapp.com`; // Default production domain
    let protocol = 'https'; // Default production protocol

    console.log('PROCESS.ENV: ', process.env);

    // Check if running in Firebase Emulator
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      appDomain = 'localhost:5173'; // Emulator domain and port
      protocol = 'http'; // Emulator protocol
    }

    const appName = 'Property Manager Pro';

    let emailTemplateName = '';
    const emailData: EmailTemplateData = {
      inviteeName: inviteeName || inviteeEmail,
      invitationLink: `${protocol}://${appDomain}/accept-invitation?token=${invitationToken}&orgId=${organizationId}`,
      appName: appName,
      inviterName: 'The Team', // This will be updated by subsequent logic for inviterDisplayName
    };

    let inviterDisplayName = request.auth.token.name || 'The Team';
    if (!request.auth.token.name) {
      const inviterProfilePath = callerRoles.includes('admin')
        ? `admins/${callerUid}`
        : `organizations/${callerOrgId}/users/${callerUid}`;
      const inviterProfile = await db.doc(inviterProfilePath).get();
      if (inviterProfile.exists && inviterProfile.data()?.displayName) {
        inviterDisplayName = inviterProfile.data()?.displayName;
      }
    }
    emailData.inviterName = inviterDisplayName;

    if (rolesToAssign.includes('property_manager')) {
      emailTemplateName = 'propertyManagerInvitation';
      const orgDoc = await db.doc(`organizations/${organizationId}`).get();
      emailData.organizationName = orgDoc.exists
        ? orgDoc.data()?.name || organizationId
        : organizationId;
    } else if (rolesToAssign.includes('resident') && targetPropertyId) {
      emailTemplateName = 'residentInvitation';
      const propDoc = await db
        .doc(`organizations/${organizationId}/properties/${targetPropertyId}`)
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
