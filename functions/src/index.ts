// This file serves as the entry point for all Firebase Functions.
// It re-exports functions from their individual files.

// Auth Triggers
import { processSignUp as processSignUpFunction } from './auth/processSignUp.js';
export const processSignUp = processSignUpFunction;

// Callable Functions
import { createOrganization as createOrganizationFunction } from './callable/createOrganization.js';
export const createOrganization = createOrganizationFunction;

import { updateOrganization as updateOrganizationFunction } from './callable/updateOrganization.js';
export const updateOrganization = updateOrganizationFunction;

import { deleteOrganization as deleteOrganizationFunction } from './callable/deactivateOrganization.js'; // Updated import
export const deleteOrganization = deleteOrganizationFunction; // Updated export

import { signUpWithInvitation as signUpWithInvitationFunction } from './callable/signUpWithInvitation.js';
export const signUpWithInvitation = signUpWithInvitationFunction;

import { createPropertyManager as createPropertyManagerFunction } from './callable/createPropertyManager.js';
export const createPropertyManager = createPropertyManagerFunction;

import { updatePropertyManager as updatePropertyManagerFunction } from './callable/updatePropertyManager.js';
export const updatePropertyManager = updatePropertyManagerFunction;

import { deletePropertyManager as deletePropertyManagerFunction } from './callable/deletePropertyManager.js';
export const deletePropertyManager = deletePropertyManagerFunction;

import { createInvitation as createInvitationFunction } from './callable/createInvitation.js';
export const createInvitation = createInvitationFunction;

import { createProperty as createPropertyFunction } from './callable/createProperty.js';
export const createProperty = createPropertyFunction;

import { revokeInvitation as revokeInvitationFunction } from './callable/revokeInvitation.js';
export const revokeInvitation = revokeInvitationFunction;

import { getInvitationDetails as getInvitationDetailsFunction } from './callable/getInvitationDetails.js';
export const getInvitationDetails = getInvitationDetailsFunction;

import { updateProperty as updatePropertyFunction } from './callable/updateProperty.js';
export const updateProperty = updatePropertyFunction;

import { deleteProperty as deletePropertyFunction } from './callable/deleteProperty.js';
export const deleteProperty = deletePropertyFunction;

import { updateResidentProfile as updateResidentProfileFunction } from './callable/updateResidentProfile.js';
export const updateResidentProfile = updateResidentProfileFunction;

import { createServiceRequest as createServiceRequestFunction } from './callable/createServiceRequest.js';
export const createServiceRequest = createServiceRequestFunction;

import { updateResidentDetailsByPm as updateResidentDetailsByPmFunction } from './callable/updateResidentDetailsByPm.js';
export const updateResidentDetailsByPm = updateResidentDetailsByPmFunction;

import { updateResidentDetails as updateResidentDetailsFunction } from './callable/updateResidentDetails.js'; // New export
export const updateResidentDetails = updateResidentDetailsFunction; // New export

import { addOrganizationToManager as addOrganizationToManagerFunction } from './callable/addOrganizationToManager.js';
export const addOrganizationToManager = addOrganizationToManagerFunction;

// New Callable Functions for Organization Manager Invitation Workflow
import { getOrgManagerInvitationDetails as getOrgManagerInvitationDetailsFunction } from './callable/getOrgManagerInvitationDetails.js';
export const getOrgManagerInvitationDetails = getOrgManagerInvitationDetailsFunction;

import { signUpWithOrgManagerInvitation as signUpWithOrgManagerInvitationFunction } from './callable/signUpWithOrgManagerInvitation.js';
export const signUpWithOrgManagerInvitation = signUpWithOrgManagerInvitationFunction;

import { assignOrganizationToManagerAdmin as assignOrganizationToManagerAdminFunction } from './callable/assignOrganizationToManagerAdmin.js';
export const assignOrganizationToManagerAdmin = assignOrganizationToManagerAdminFunction;

import { unassignOrganizationFromManagerAdmin as unassignOrganizationFromManagerAdminFunction } from './callable/unassignOrganizationFromManagerAdmin.js';
export const unassignOrganizationFromManagerAdmin = unassignOrganizationFromManagerAdminFunction;

import { createCampaign as createCampaignFunction } from './callable/createCampaign.js';
export const createCampaign = createCampaignFunction;

import { getCampaignDetails as getCampaignDetailsFunction } from './callable/getCampaignDetails.js';
export const getCampaignDetails = getCampaignDetailsFunction;

import { updateCampaign as updateCampaignFunction } from './callable/updateCampaign.js';
export const updateCampaign = updateCampaignFunction;

import { deactivateCampaign as deactivateCampaignFunction } from './callable/deactivateCampaign.js';
export const deactivateCampaign = deactivateCampaignFunction;

import { deleteCampaign as deleteCampaignFunction } from './callable/deleteCampaign.js';
export const deleteCampaign = deleteCampaignFunction;

import { activateCampaign as activateCampaignFunction } from './callable/activateCampaign.js';
export const activateCampaign = activateCampaignFunction;

import { processPublicCampaignLink as processPublicCampaignLinkFunction } from './callable/processPublicCampaignLink.js';
export const processPublicCampaignLink = processPublicCampaignLinkFunction;

import { getGptChatResponse as getGptChatResponseFunction } from './callable/getGptChatResponse.js';
export const getGptChatResponse = getGptChatResponseFunction;

import { requestTwilioCall as requestTwilioCallFunction } from './callable/requestTwilioCall.js';
export const requestTwilioCall = requestTwilioCallFunction;

// Dashboard Statistics Callable Functions
import { getAdminDashboardStats as getAdminDashboardStatsFunction } from './callable/getAdminDashboardStats.js';
export const getAdminDashboardStats = getAdminDashboardStatsFunction;

import { getOrgManagerDashboardStats as getOrgManagerDashboardStatsFunction } from './callable/getOrgManagerDashboardStats.js';
export const getOrgManagerDashboardStats = getOrgManagerDashboardStatsFunction;

import { getPropertyManagerDashboardStats as getPropertyManagerDashboardStatsFunction } from './callable/getPropertyManagerDashboardStats.js';
export const getPropertyManagerDashboardStats = getPropertyManagerDashboardStatsFunction;

// Phoenix Stats Callable Functions (for dashboard integration)
import { getAdminPhoenixStats as getAdminPhoenixStatsFunction } from './callable/getAdminPhoenixStats.js';
export const getAdminPhoenixStats = getAdminPhoenixStatsFunction;

import { getOrgManagerPhoenixStats as getOrgManagerPhoenixStatsFunction } from './callable/getOrgManagerPhoenixStats.js';
export const getOrgManagerPhoenixStats = getOrgManagerPhoenixStatsFunction;

import { getPropertyManagerPhoenixStats as getPropertyManagerPhoenixStatsFunction } from './callable/getPropertyManagerPhoenixStats.js';
export const getPropertyManagerPhoenixStats = getPropertyManagerPhoenixStatsFunction;

import { createViolationReport as createViolationReportFunction } from './callable/createViolationReport.js';
export const createViolationReport = createViolationReportFunction;

import { getViolations as getViolationsFunction } from './callable/getViolations.js';
export const getViolations = getViolationsFunction;

import { getUserProfiles as getUserProfilesFunction } from './callable/getUserProfiles.js';
export const getUserProfiles = getUserProfilesFunction;

// HTTP Functions
// import { handleCampaignSignUpLink as handleCampaignSignUpLinkFunction } from './http/handleCampaignSignUpLink.js'; // Commented out as it's being decommissioned
// export const handleCampaignSignUpLink = handleCampaignSignUpLinkFunction; // Commented out

// Scheduled Functions
import { cleanupProcessedCampaignCSVs as cleanupProcessedCampaignCSVsFunction } from './scheduled/cleanupProcessedCampaignCSVs.js';
export const cleanupProcessedCampaignCSVs = cleanupProcessedCampaignCSVsFunction;

// Webhooks
import { updateServiceJobStatus as updateServiceJobStatusFunction } from './webhooks/updateServiceJobStatus.js';
export const updateServiceJobStatus = updateServiceJobStatusFunction;

// Firestore Triggers
import { onNewNotification as onNewNotificationFunction } from './triggers/onNewNotification.js';
export const onNewNotification = onNewNotificationFunction;

import { updateFcmToken as updateFcmTokenFunction } from './callable/updateFcmToken.js';
export const updateFcmToken = updateFcmTokenFunction;

// Google Auth Functions
import {
  initiateGoogleOAuth as initiateGoogleOAuthFunction,
  handleGoogleOAuthCallback as handleGoogleOAuthCallbackFunction,
  disconnectGoogleAccount as disconnectGoogleAccountFunction,
} from './callable/googleAuth.js';

export const initiateGoogleOAuth = initiateGoogleOAuthFunction;
export const handleGoogleOAuthCallback = handleGoogleOAuthCallbackFunction;
export const disconnectGoogleAccount = disconnectGoogleAccountFunction;

// Note: The firebaseAdmin.ts and handleHttpsError.ts are not directly exported
// as they are internal modules used by the functions themselves.
