import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

// MUI Components
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { PersonAdd } from '@mui/icons-material';

export interface InviteResidentFormProps {
  // Exporting for potential use elsewhere
  propertyId: string;
  propertyName?: string; // Added propertyName
  organizationId: string; // Added organizationId
}

const InviteResidentForm: React.FC<InviteResidentFormProps> = ({
  propertyId,
  propertyName,
  organizationId,
}) => {
  // Destructure organizationId
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles: userRoles } = useAuth(); // Removed userOrgId from here

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !currentUser ||
      !userRoles.includes('property_manager') ||
      !organizationId
    ) {
      // Use prop organizationId
      setError('Permission denied or organization context missing.');
      return;
    }

    if (!inviteeEmail) {
      setError('Invitee Email is required.');
      return;
    }
    if (!propertyId) {
      setError('Property ID is missing. Cannot send invitation.');
      return;
    }

    setLoading(true);

    try {
      const result = await createInvitationFn({
        inviteeEmail,
        organizationId: organizationId, // Use prop organizationId
        rolesToAssign: ['resident'],
        invitedByRole: 'property_manager',
        targetPropertyId: propertyId, // The specific property this resident is invited to
      });

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        setSuccess(
          `Invitation sent successfully to ${inviteeEmail} for ${propertyName}.`
        );
        setInviteeEmail('');
      } else {
        setError(responseData?.message || 'Failed to send invitation.');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      const appError = err as AppError;
      setError(appError.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !userRoles.includes('property_manager')) {
    return (
      <Alert severity='error'>
        You do not have permission to access this feature.
      </Alert>
    );
  }
  if (!propertyId) {
    return (
      <Alert severity='warning'>
        Property context is missing. Cannot invite resident.
      </Alert>
    );
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {/* Adjusted maxWidth for potentially wider row */}
      <Typography variant='subtitle1' gutterBottom sx={{ mt: 2 }}>
        {/* Changed variant, adjusted margin */}
        Inviting Resident to: {propertyName || `Property ID: ${propertyId}`}
      </Typography>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label='Enter Resident Email'
          type='email'
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          margin='none' // Changed margin to none as Box handles spacing
          required
          disabled={loading}
          sx={{ flexGrow: 1, minWidth: '75%' }} // Allow TextField to grow in the row
        />
        <Button
          size='large'
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading}
          sx={{ flexGrow: 1 }} // Allow TextField to grow in the row
          startIcon={<PersonAdd />}
        >
          {loading ? <CircularProgress size={24} /> : 'Invite Resident'}
        </Button>
      </Box>
    </Box>
  );
};

export default InviteResidentForm;
