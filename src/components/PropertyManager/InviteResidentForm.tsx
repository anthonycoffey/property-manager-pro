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

interface InviteResidentFormProps {
  propertyId: string; // This will be passed as a prop
}

const InviteResidentForm: React.FC<InviteResidentFormProps> = ({ propertyId }) => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles: userRoles, organizationId: userOrgId } = useAuth();

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !userRoles.includes('property_manager') || !userOrgId) {
      setError('Permission denied. Only property managers can send invitations.');
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
        organizationId: userOrgId, // PM's organization
        rolesToAssign: ['resident'],
        invitedByRole: 'property_manager',
        targetPropertyId: propertyId, // The specific property this resident is invited to
      });

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        setSuccess(`Invitation sent successfully to ${inviteeEmail} for property ${propertyId}. Invitation ID: ${responseData?.invitationId}`);
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
    return <Alert severity="error">You do not have permission to access this feature.</Alert>;
  }
  if (!propertyId) {
    return <Alert severity="warning">Property context is missing. Cannot invite resident.</Alert>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, maxWidth: '500px' }}>
      <Typography variant="h6" gutterBottom>
        Invite New Resident to Property: {propertyId}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TextField
        label="Invitee Email"
        type="email"
        fullWidth
        value={inviteeEmail}
        onChange={(e) => setInviteeEmail(e.target.value)}
        margin="normal"
        required
        disabled={loading}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Send Invitation'}
      </Button>
    </Box>
  );
};

export default InviteResidentForm;
