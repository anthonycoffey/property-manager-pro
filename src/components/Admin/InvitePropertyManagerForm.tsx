import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth'; // Assuming useAuth provides access to the current user

// MUI Components (assuming you are using Material UI)
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

const InvitePropertyManagerForm: React.FC = () => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [organizationId, setOrganizationId] = useState(''); // Admin needs to specify this
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles } = useAuth(); // To ensure only admins can see/use this

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

    if (!inviteeEmail || !organizationId) {
      setError('Email and Organization ID are required.');
      return;
    }

    setLoading(true);

    try {
      const result = await createInvitationFn({
        inviteeEmail,
        organizationId,
        rolesToAssign: ['property_manager'],
        invitedByRole: 'admin',
      });

      if ((result.data as any)?.success) {
        setSuccess(`Invitation sent successfully to ${inviteeEmail}. Invitation ID: ${(result.data as any)?.invitationId}`);
        setInviteeEmail('');
        setOrganizationId('');
      } else {
        setError((result.data as any)?.message || 'Failed to send invitation.');
      }
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // This component should only be rendered if the user is an admin.
  // The parent component or route guard should handle this.
  if (!currentUser || !roles.includes('admin')) {
    return <Alert severity="error">You do not have permission to access this feature.</Alert>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, maxWidth: '500px' }}>
      <Typography variant="h6" gutterBottom>
        Invite New Property Manager
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
      <TextField
        label="Organization ID"
        type="text"
        fullWidth
        value={organizationId}
        onChange={(e) => setOrganizationId(e.target.value)}
        margin="normal"
        required
        disabled={loading}
        helperText="Enter the ID of the organization this manager will belong to."
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

export default InvitePropertyManagerForm;
