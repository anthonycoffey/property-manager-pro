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

// Note: The firebaseAdmin.ts and handleHttpsError.ts are not directly exported
// as they are internal modules used by the functions themselves.
