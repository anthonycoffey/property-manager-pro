import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Stack, Typography } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import OrganizationSelector from './OrganizationSelector'; // To select the target organization

const InviteOrganizationManagerForm: React.FC = () => {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles } = useAuth();

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleOrganizationChange = (orgId: string | null) => {
    setSelectedOrgId(orgId);
    setError(null); // Clear error when org changes
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !roles.includes('admin')) {
      setError('Permission denied. Only administrators can send invitations.');
      return;
    }

    if (!selectedOrgId) {
      setError(
        'An Organization must be selected to invite an Organization Manager.'
      );
      return;
    }

    if (!inviteeEmail || !inviteeName) {
      setError('Name and Email are required.');
      return;
    }

    setLoading(true);

    try {
      const result = await createInvitationFn({
        inviteeEmail,
        inviteeName,
        organizationId: selectedOrgId, // The organization they will manage initially
        rolesToAssign: ['organization_manager'],
        invitedByRole: 'admin',
      });

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        setSuccess(
          `Invitation sent successfully to ${inviteeEmail} to manage organization ${selectedOrgId}.`
        );
        setInviteeEmail('');
        setInviteeName('');
        // Optionally reset selectedOrgId or keep it for next invite
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
    <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant='subtitle1' gutterBottom>
        Select Organization for New Manager:
      </Typography>
      <OrganizationSelector
        selectedOrganizationId={selectedOrgId}
        onOrganizationChange={handleOrganizationChange}
      />

      <Box sx={{ mt: 2 }}>
        <Typography variant='subtitle1' gutterBottom sx={{ mt: 2 }}>
          Enter New Organization Manager's Details:
        </Typography>
        <Stack>

        <TextField
          label='Organization Manager Name'
          value={inviteeName}
          onChange={(e) => setInviteeName(e.target.value)}
          margin='normal'
          required
          fullWidth
          disabled={loading}
        />
        <TextField
          label='Organization Manager Email'
          type='email'
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          margin='normal'
          required
          fullWidth
          disabled={loading}
        />

          
        </Stack>

        <Button
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading}
          startIcon={<PersonAdd />}
          sx={{ mt: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            'Invite Organization Manager'
          )}
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default InviteOrganizationManagerForm;
