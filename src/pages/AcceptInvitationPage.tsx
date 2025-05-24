import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Box, TextField, Button, Typography, Container, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth'; // To redirect if already logged in

const AcceptInvitationPage: React.FC = () => {
  const [email, setEmail] = useState(''); // Email might be pre-filled or confirmed
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard'); // Redirect if already logged in
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const orgId = queryParams.get('orgId');

    if (token && orgId) {
      setInvitationToken(token);
      setOrganizationId(orgId);
      // Potentially fetch invitation details here to pre-fill email, but for now, user enters it.
      // Or, the Cloud Function `signUpWithInvitation` can use the token to find the invited email.
    } else {
      setError('Invitation token or organization ID is missing from the URL.');
    }
  }, [location.search]);

  const functions = getFunctions();
  const signUpWithInvitationFn = httpsCallable(functions, 'signUpWithInvitation');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!invitationToken || !organizationId) {
      setError('Invitation details are missing. Cannot proceed.');
      return;
    }
    if (!email || !password || !displayName) {
        setError('Please fill in all fields: Email, Password, and Display Name.');
        return;
    }

    setLoading(true);
    try {
      const result = await signUpWithInvitationFn({
        email,
        password,
        displayName,
        organizationId,
        invitationId: invitationToken,
      });

      if ((result.data as any)?.success) {
        setSuccess('Account created successfully! You will be redirected to login.');
        // Firebase Auth state change should handle redirect via AuthProvider,
        // or navigate to login page after a delay.
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError((result.data as any)?.message || 'Failed to create account with invitation.');
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!invitationToken || !organizationId) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" color="error">
            Invalid Invitation Link
          </Typography>
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error || 'The invitation link is missing necessary information. Please check the link or contact support.'}
          </Alert>
        </Paper>
      </Container>
    );
  }
  
  if (success) {
     return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5">
            Success!
          </Typography>
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{success}</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Accept Invitation & Create Account
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="displayName"
            label="Full Name"
            name="displayName"
            autoComplete="name"
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            helperText="Please use the email address where you received the invitation."
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AcceptInvitationPage;
