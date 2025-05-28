import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { PersonAdd } from '@mui/icons-material';

export interface InviteResidentFormProps {
  propertyId: string;
  propertyName?: string;
  organizationId: string;
  onInvitationSent?: () => void; // New callback
}

const InviteResidentForm: React.FC<InviteResidentFormProps> = ({
  propertyId,
  propertyName,
  organizationId,
  onInvitationSent, // New callback
}) => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles: userRoles } = useAuth();

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    let inviterRole = '';
    if (userRoles.includes('admin')) {
      inviterRole = 'admin';
    } else if (userRoles.includes('organization_manager')) {
      inviterRole = 'organization_manager';
    } else if (userRoles.includes('property_manager')) {
      inviterRole = 'property_manager';
    }

    if (!currentUser || !inviterRole || !organizationId) {
      setError('Permission denied, unrecognized role, or organization context missing.');
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
        organizationIds: [organizationId], // For residents, this is the org they belong to
        rolesToAssign: ['resident'],
        invitedByRole: inviterRole, // Dynamic role
        targetPropertyId: propertyId,
        // No need to pass inviterName explicitly if the template can use auth user's display name
      });

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        setSuccess(
          `Invitation sent successfully to ${inviteeEmail} for ${propertyName || 'the selected property'}.`
        );
        setInviteeEmail('');
        if (onInvitationSent) {
          onInvitationSent(); // Call the callback
        }
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

  const canInvite = userRoles.includes('property_manager') || userRoles.includes('organization_manager') || userRoles.includes('admin');

  if (!currentUser || !canInvite) {
    return (
      <Alert severity='error'>
        You do not have permission to invite residents.
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
      <Typography variant='subtitle1' gutterBottom sx={{ mt: 2 }}>
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <TextField
          label='Enter Resident Email'
          type='email'
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          margin='none'
          required
          disabled={loading}
          sx={{ flexGrow: 1 }}
        />
        <Button
          size='large'
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading}
          sx={{ flexGrow: 1 }}
          startIcon={<PersonAdd />}
        >
          {loading ? <CircularProgress size={24} /> : 'Invite Resident'}
        </Button>
      </Box>
    </Box>
  );
};

export default InviteResidentForm;
