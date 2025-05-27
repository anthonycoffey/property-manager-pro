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
import { isAppError } from '../utils/errorUtils';
import { auth } from '../firebaseConfig';

const AcceptInvitationPage: React.FC = () => {
  const [email, setEmail] = useState(''); // This will be set by invitedEmail
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false); // For form submission
  const [socialLoading, setSocialLoading] = useState<
    'google' | 'microsoft' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [invitedEmail, setInvitedEmail] = useState<string>(''); // Store the authoritative email from invite
  const [isFetchingInvite, setIsFetchingInvite] = useState<boolean>(true); // Loading state for invite details

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const orgId = queryParams.get('orgId');

    const functionsInstance = getFunctions();
    const getInvitationDetailsFn = httpsCallable(
      functionsInstance,
      'getInvitationDetails'
    );

    if (token && orgId) {
      setInvitationToken(token);
      setOrganizationId(orgId);

      const fetchInviteDetails = async () => {
        setIsFetchingInvite(true);
        setError(null);
        try {
          const result = await getInvitationDetailsFn({
            invitationId: token,
            organizationId: orgId,
          });
          const details = result.data as {
            email: string;
            displayName?: string;
          };

          if (details.email) {
            setInvitedEmail(details.email);
            setEmail(details.email);
            // if (details.displayName) setDisplayName(details.displayName); // Optional: prefill display name
          } else {
            setError(
              'Could not retrieve invitation details. The link may be invalid or expired.'
            );
          }
        } catch (error: unknown) {
          console.error('Error fetching invitation details:', error);
          let specificError =
            'Failed to load invitation. The link may be invalid, expired, or already used.';

          if (isAppError(error)) {
            specificError = `Failed to load invitation: ${error.message}`;
            // Attempt to access Firebase-specific codes if they exist
            const firebaseError = error as AppError & { code?: string; details?: { code?: string } };
            if (firebaseError.code === 'not-found' || firebaseError.details?.code === 'not-found') {
              specificError = 'Invitation not found. Please check the link.';
            } else if (firebaseError.code === 'failed-precondition' || firebaseError.details?.code === 'failed-precondition') {
              specificError = firebaseError.message || 'Invitation is not valid (it may have been accepted, revoked, or expired).';
            }
          } else if (error instanceof Error) {
            // Fallback for generic errors
            specificError = `Failed to load invitation: ${error.message}`;
          }
          setError(specificError);
        } finally {
          setIsFetchingInvite(false);
        }
      };

      fetchInviteDetails();
    } else {
      setError('Invitation token or organization ID is missing from the URL.');
      setIsFetchingInvite(false);
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
      navigate('/login');
    }, 3000);
  };

  const handleAuthError = (error: unknown, providerName: string) => {
    console.error(`Error during ${providerName} sign-up:`, error);
    let errorMessage = `An unexpected error occurred with ${providerName} sign-up.`;

    if (isAppError(error)) {
      // Check for specific Firebase Auth error codes
      const authError = error as AppError & { code?: string };
      if (authError.code === 'auth/account-exists-with-different-credential') {
        errorMessage = `An account already exists with this email address using a different sign-in method. Please sign in with that method.`;
      } else {
        errorMessage = authError.message;
      }
    } else if (error instanceof Error) {
      // Fallback for generic errors, also try to check for the code
      const genericError = error as Error & { code?: string };
      if (genericError.code === 'auth/account-exists-with-different-credential') {
        errorMessage = `An account already exists with this email address using a different sign-in method. Please sign in with that method.`;
      } else {
        errorMessage = genericError.message;
      }
    }
    setError(errorMessage);
  };

  const processSocialSignUp = async (
    socialUser: UserCredential['user'],
    providerName: 'google' | 'microsoft'
  ) => {
    if (isFetchingInvite || !invitedEmail) {
      setError('Please wait for invitation details to load.');
      return;
    }
    if (!invitationToken) {
      setError('Invitation token is missing. Cannot proceed.');
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

    console.log("Invited Email:", invitedEmail, "Social Email:", socialUser.email);
    if (socialUser.email.toLowerCase() !== invitedEmail.toLowerCase()) {
      console.error("EMAIL MISMATCH DETECTED. Error set. Attempting to return from processSocialSignUp.");
      setError(
        `The email from ${providerName} (${socialUser.email}) does not match the invited email (${invitedEmail}). Please use the account associated with the invited email.`
      );
      setSocialLoading(null);
      return;
    }

    console.log("Proceeding to call backend (signUpWithInvitationFn) in processSocialSignUp.");
    setLoading(true);
    setSocialLoading(null);

    try {
      const result = await signUpWithInvitationFn({
        uid: socialUser.uid,
        email: invitedEmail, // Use the authoritative invitedEmail
        displayName:
          socialUser.displayName || invitedEmail.split('@')[0] || 'New User',
        organizationId,
        invitationId: invitationToken,
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
    if (isFetchingInvite) return;
    setError(null);
    setSuccess(null);
    setSocialLoading('google');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await processSocialSignUp(result.user, 'google');
    } catch (err) {
      handleAuthError(err, 'Google');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleMicrosoftSignUp = async () => {
    if (isFetchingInvite) return;
    setError(null);
    setSuccess(null);
    setSocialLoading('microsoft');
    const provider = new OAuthProvider('microsoft.com');
    try {
      const result = await signInWithPopup(auth, provider);
      await processSocialSignUp(result.user, 'microsoft');
    } catch (err) {
      handleAuthError(err, 'Microsoft');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isFetchingInvite || !invitedEmail) {
      setError(
        'Please wait for invitation details to load or ensure the invitation is valid.'
      );
      return;
    }
    setError(null);
    setSuccess(null);

    if (!invitationToken) {
      setError('Invitation token is missing. Cannot proceed.');
      return;
    }
    // Email is now pre-filled and readonly, so we use `invitedEmail`
    if (!password || !displayName) {
      setError('Please fill in all fields: Full Name and Password.');
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithInvitationFn({
        email: invitedEmail, // Use the authoritative invitedEmail
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

  // Initial loading state or critical error display
  if (isFetchingInvite && !error && !success) {
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
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading invitation details...</Typography>
        </Paper>
      </Container>
    );
  }

  // If critical error during fetch or missing token (and not yet successful)
  if (
    (!invitationToken || !organizationId || (error && !invitedEmail)) &&
    !success
  ) {
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
            Invalid or Expired Invitation
          </Typography>
          <Alert severity='error' sx={{ mt: 2, width: '100%' }}>
            {error ||
              'The invitation link is missing necessary information, is invalid, or has expired. Please check the link or contact support.'}
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (success && !error) {
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

        {error && ( // General error display, might be redundant if specific error UI is shown above
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
          disabled={
            loading || !!socialLoading || isFetchingInvite || !invitedEmail
          }
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
          startIcon={<AccountCircleIcon />}
          onClick={handleMicrosoftSignUp}
          disabled={
            loading || !!socialLoading || isFetchingInvite || !invitedEmail
          }
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
            id='email'
            label='Invited Email Address'
            name='email'
            value={email} // Will be pre-filled by `invitedEmail` from state
            InputProps={{
              readOnly: true,
            }}
            disabled={isFetchingInvite || loading || !!socialLoading} // Also disable if fetching invite
          />
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
            disabled={
              isFetchingInvite || loading || !!socialLoading || !invitedEmail
            }
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password'
            type='password'
            id='password'
            autoComplete='new-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={
              isFetchingInvite || loading || !!socialLoading || !invitedEmail
            }
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2 }}
            disabled={
              isFetchingInvite || loading || !!socialLoading || !invitedEmail
            }
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
