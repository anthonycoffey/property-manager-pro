import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Typography } from '@mui/material';
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
  const { currentUser, roles } = useAuth();

  useEffect(() => {}, [selectedOrganizationId]);

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !roles.includes('admin')) {
      setError('Permission denied. Only administrators can send invitations.');
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
        organizationId: selectedOrganizationId,
        rolesToAssign: ['property_manager'],
        invitedByRole: 'admin',
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

  if (!currentUser || !roles.includes('admin')) {
    return (
      <Alert severity='error'>
        You do not have permission to access this feature.
      </Alert>
    );
  }

  return (
    <Box component='form' onSubmit={handleSubmit}>
      <Typography variant='h6' gutterBottom>
        Send Invite Email
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
          label='Property Manager Name'
          value={inviteeName}
          onChange={(e) => setInviteeName(e.target.value)}
          margin='none'
          required
          disabled={loading}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          label='Property Manager Email'
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
          {loading ? <CircularProgress size={24} /> : 'Invite Property Manager'}
        </Button>
      </Box>
    </Box>
  );
};

export default InvitePropertyManagerForm;
