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

import { deactivateOrganization as deactivateOrganizationFunction } from './callable/deactivateOrganization.js';
export const deactivateOrganization = deactivateOrganizationFunction;

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

// Note: The firebaseAdmin.ts and handleHttpsError.ts are not directly exported
// as they are internal modules used by the functions themselves.
