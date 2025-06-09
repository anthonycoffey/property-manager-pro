import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Typography, Stack } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';

interface InvitePropertyManagerFormProps {
  selectedOrganizationId: string | null;
}

const InvitePropertyManagerForm: React.FC<InvitePropertyManagerFormProps> = ({
  selectedOrganizationId,
}) => {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles, organizationIds } = useAuth(); // Destructure organizationIds

  // Determine if the current user has permission to send invitations
  const canSendInvitation =
    currentUser &&
    (roles.includes('admin') ||
      (roles.includes('organization_manager') &&
        organizationIds?.includes(selectedOrganizationId || '')));

  useEffect(() => {
    // Clear any previous errors/success messages when organizationId changes or permissions change
    setError(null);
    setSuccess(null);
  }, [selectedOrganizationId, canSendInvitation]); // Add canSendInvitation to dependencies

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSendInvitation) {
      setError(
        'Permission denied. You do not have the necessary role or organization access to send invitations.'
      );
      return;
    }

    if (!selectedOrganizationId) {
      setError(
        'An Organization must be selected before sending an invitation.'
      );
      return;
    }

    if (!inviteeEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);

    try {
      const result = await createInvitationFn({
        inviteeEmail,
        inviteeName,
        organizationIds: [selectedOrganizationId],
        rolesToAssign: ['property_manager'],
        invitedByRole: roles.includes('admin')
          ? 'admin'
          : 'organization_manager',
      });

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        setSuccess(`Invitation sent successfully to ${inviteeEmail}`);
        setInviteeEmail('');
        setInviteeName('');
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

  if (!canSendInvitation) {
    return (
      <Alert severity='error'>
        You do not have permission to access property manager invitations. Only
        administrators or assigned organization managers can send invitations.
      </Alert>
    );
  }

  return (
    <Box component='form' onSubmit={handleSubmit}>
      <Typography variant='h6' gutterBottom>
        Invite Property Manager
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

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'flex-end' }} // Align items to the bottom when in a row
        sx={{ mt: 2 }} // Add some margin top for spacing from alerts
      >
        <TextField
          label='Property Manager Name'
          value={inviteeName}
          onChange={(e) => setInviteeName(e.target.value)}
          margin='none' // Stack component handles spacing
          disabled={loading}
          sx={{ flexGrow: 1, width: '100%' }} // Ensure full width when stacked, grow in row
        />
        <TextField
          label='Property Manager Email'
          type='email'
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          margin='none' // Stack component handles spacing
          required
          disabled={loading}
          sx={{ flexGrow: 1, width: '100%' }} // Ensure full width when stacked, grow in row
        />
        <Button
          size='large'
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading}
          sx={{
            width: { xs: '100%', sm: 'auto' }, // Full width on small, auto on larger
            minWidth: { sm: '180px' }, // Ensure a minimum width for the button in row layout
          }}
          startIcon={<PersonAdd />}
        >
          {loading ? <CircularProgress size={24} /> : 'Invite Manager'}
        </Button>
      </Stack>
    </Box>
  );
};

export default InvitePropertyManagerForm;
