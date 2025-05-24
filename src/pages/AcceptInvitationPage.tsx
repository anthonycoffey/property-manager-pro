import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { useAuth } from '../hooks/useAuth';
import type { SignUpWithInvitationResponse, AppError } from '../types';
import { auth } from '../firebaseConfig';

const AcceptInvitationPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    'google' | 'microsoft' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  // To store the email from the invitation, which we'll need to compare against.
  // For now, this will be validated server-side by signUpWithInvitation.
  // const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const orgId = queryParams.get('orgId');

    if (token && orgId) {
      setInvitationToken(token);
      setOrganizationId(orgId);
      // TODO (Future): Fetch invitation details here to get invitedEmail for client-side pre-check
      // and prefill display name if available.
      // For now, server-side validation of email match is primary.
    } else {
      setError('Invitation token or organization ID is missing from the URL.');
    }
  }, [location.search]);

  const functions = getFunctions();
  const signUpWithInvitationFn = httpsCallable(
    functions,
    'signUpWithInvitation'
  );

  const handleAuthSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => {
      navigate('/login'); // Or /dashboard if auto-login occurs
    }, 3000);
  };

  const handleAuthError = (err: any, providerName: string) => {
    console.error(`Error during ${providerName} sign-up:`, err);
    let errorMessage = `An unexpected error occurred with ${providerName} sign-up.`;
    if (err.code === 'auth/account-exists-with-different-credential') {
      errorMessage = `An account already exists with this email address using a different sign-in method. Please sign in with that method.`;
    } else if (err.message) {
      errorMessage = err.message;
    }
    setError(errorMessage);
  };

  const processSocialSignUp = async (
    socialUser: UserCredential['user'],
    providerName: 'google' | 'microsoft'
  ) => {
    if (!invitationToken || !organizationId) {
      setError('Invitation details are missing. Cannot proceed.');
      setSocialLoading(null);
      return;
    }
    if (!socialUser.email) {
      setError(
        `Could not retrieve email from ${providerName}. Please try again or use email/password.`
      );
      setSocialLoading(null);
      return;
    }

    // Client-side check (optional, server will enforce this too)
    // if (invitedEmail && socialUser.email.toLowerCase() !== invitedEmail.toLowerCase()) {
    //   setError(`The email from ${providerName} (${socialUser.email}) does not match the invited email (${invitedEmail}).`);
    //   setSocialLoading(null);
    //   return;
    // }

    setLoading(true); // General loading for the function call
    setSocialLoading(null); // Clear specific social loading

    try {
      const result = await signUpWithInvitationFn({
        uid: socialUser.uid, // Pass UID for social sign-on
        email: socialUser.email, // Pass email from social provider
        displayName:
          socialUser.displayName ||
          socialUser.email?.split('@')[0] ||
          'New User', // Use social display name
        organizationId,
        invitationId: invitationToken,
        // No password for social sign-on
      });

      const responseData = result.data as SignUpWithInvitationResponse;

      if (responseData?.success) {
        handleAuthSuccess(
          responseData.message ||
            `Account created successfully with ${providerName}! You will be redirected.`
        );
      } else {
        setError(
          responseData?.message ||
            `Failed to create account with ${providerName} invitation.`
        );
      }
    } catch (err) {
      console.error(`Error accepting ${providerName} invitation:`, err);
      const appError = err as AppError;
      setError(
        appError.message ||
          'An unexpected error occurred during social sign up.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setSuccess(null);
    setSocialLoading('google');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await processSocialSignUp(result.user, 'google');
    } catch (err) {
      handleAuthError(err, 'Google');
      setSocialLoading(null);
    }
  };

  const handleMicrosoftSignUp = async () => {
    setError(null);
    setSuccess(null);
    setSocialLoading('microsoft');
    const provider = new OAuthProvider('microsoft.com');
    // Optional: Add custom parameters if needed, e.g., for specific tenants
    // provider.setCustomParameters({ tenant: 'YOUR_TENANT_ID' });
    try {
      const result = await signInWithPopup(auth, provider);
      await processSocialSignUp(result.user, 'microsoft');
    } catch (err) {
      handleAuthError(err, 'Microsoft');
      setSocialLoading(null);
    }
  };

  const handleEmailPasswordSubmit = async (event: React.FormEvent) => {
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

      const responseData = result.data as SignUpWithInvitationResponse;

      if (responseData?.success) {
        handleAuthSuccess(
          responseData.message ||
            'Account created successfully! You will be redirected to login.'
        );
      } else {
        setError(
          responseData?.message || 'Failed to create account with invitation.'
        );
      }
    } catch (err) {
      console.error('Error accepting invitation with email/password:', err);
      const appError = err as AppError;
      setError(appError.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!invitationToken || (!organizationId && !success)) {
    // Check success to prevent flicker if error was due to missing token
    return (
      <Container component='main' maxWidth='xs'>
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component='h1' variant='h5' color='error'>
            Invalid Invitation Link
          </Typography>
          <Alert severity='error' sx={{ mt: 2, width: '100%' }}>
            {error ||
              'The invitation link is missing necessary information. Please check the link or contact support.'}
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (success && !error) {
    // Ensure error doesn't also show if success is set then an error occurs
    return (
      <Container component='main' maxWidth='xs'>
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component='h1' variant='h5'>
            Success!
          </Typography>
          <Alert severity='success' sx={{ mt: 2, width: '100%' }}>
            {success}
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component='main' maxWidth='xs'>
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component='h1' variant='h5' sx={{ mb: 2 }}>
          Accept Invitation & Create Account
        </Typography>

        {error && (
          <Alert severity='error' sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant='outlined'
          color='primary'
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignUp}
          disabled={loading || !!socialLoading}
          sx={{ mt: 1, mb: 1 }}
        >
          {socialLoading === 'google' ? (
            <CircularProgress size={24} />
          ) : (
            'Sign up with Google'
          )}
        </Button>
        <Button
          fullWidth
          variant='outlined'
          color='primary'
          startIcon={<AccountCircleIcon />} // Using placeholder, replace with actual Microsoft icon if available
          onClick={handleMicrosoftSignUp}
          disabled={loading || !!socialLoading}
          sx={{ mt: 1, mb: 2 }}
        >
          {socialLoading === 'microsoft' ? (
            <CircularProgress size={24} />
          ) : (
            'Sign up with Microsoft'
          )}
        </Button>

        <Divider sx={{ width: '100%', my: 2 }}>OR</Divider>

        <Box
          component='form'
          onSubmit={handleEmailPasswordSubmit}
          sx={{ mt: 1, width: '100%' }}
        >
          <TextField
            margin='normal'
            required
            fullWidth
            id='displayName'
            label='Full Name'
            name='displayName'
            autoComplete='name'
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading || !!socialLoading}
          />
          <TextField
            margin='normal'
            required
            fullWidth
            id='email'
            label='Email Address (for manual sign up)'
            name='email'
            autoComplete='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || !!socialLoading}
            helperText='If signing up manually, use the email address where you received the invitation.'
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password (for manual sign up)'
            type='password'
            id='password'
            autoComplete='new-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !!socialLoading}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !!socialLoading}
          >
            {loading && !socialLoading ? (
              <CircularProgress size={24} />
            ) : (
              'Create Account with Email'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AcceptInvitationPage;
