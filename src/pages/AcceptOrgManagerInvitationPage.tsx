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

const AcceptOrgManagerInvitationPage: React.FC = () => {
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
  // organizationId is not needed for OM invites in the URL
  // const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    // orgId is not expected for OM invites
    // const orgId = queryParams.get('orgId');

    const functionsInstance = getFunctions();
    const getOrgManagerInvitationDetailsFn = httpsCallable(
      functionsInstance,
      'getOrgManagerInvitationDetails'
    );

    if (token) {
      // Only token is strictly required for OM invites
      setInvitationToken(token);

      const fetchInviteDetails = async () => {
        setIsFetchingInvite(true);
        setError(null);
        try {
          const result = await getOrgManagerInvitationDetailsFn({
            invitationId: token,
          });
          const details = result.data as {
            email: string;
            displayName?: string;
            rolesToAssign: string[]; // Expected from backend
            organizationIds: string[] | null; // Expected from backend
          };

          if (
            details.email &&
            details.rolesToAssign.includes('organization_manager')
          ) {
            setInvitedEmail(details.email);
            setEmail(details.email);
            // if (details.displayName) setDisplayName(details.displayName); // Optional: prefill display name
          } else {
            setError(
              'Could not retrieve organization manager invitation details. The link may be invalid or expired, or not for an Organization Manager.'
            );
          }
        } catch (error: unknown) {
          console.error(
            'Error fetching organization manager invitation details:',
            error
          );
          let specificError =
            'Failed to load organization manager invitation. The link may be invalid, expired, or already used.';

          if (isAppError(error)) {
            specificError = `Failed to load invitation: ${error.message}`;
            const firebaseError = error as AppError & {
              code?: string;
              details?: { code?: string };
            };
            if (
              firebaseError.code === 'not-found' ||
              firebaseError.details?.code === 'not-found'
            ) {
              specificError =
                'Organization Manager Invitation not found. Please check the link.';
            } else if (
              firebaseError.code === 'failed-precondition' ||
              firebaseError.details?.code === 'failed-precondition'
            ) {
              specificError =
                firebaseError.message ||
                'Organization Manager Invitation is not valid (it may have been accepted, revoked, or expired).';
            }
          } else if (error instanceof Error) {
            specificError = `Failed to load invitation: ${error.message}`;
          }
          setError(specificError);
        } finally {
          setIsFetchingInvite(false);
        }
      };

      fetchInviteDetails();
    } else {
      setError('Invitation token is missing from the URL.');
      setIsFetchingInvite(false);
    }
  }, [location.search]);

  const functions = getFunctions();
  const signUpWithOrgManagerInvitationFn = httpsCallable(
    functions,
    'signUpWithOrgManagerInvitation'
  );

  const handleAuthSuccess = (message: string) => {
    setSuccess(message + ' Redirecting to dashboard...');
    // Navigate directly to dashboard.
    // The token refresh should ensure claims are fresh for ProtectedRoute.
    // The useEffect watching currentUser should ideally handle the redirect to dashboard
    // once the token is refreshed and useAuth provides the updated currentUser.
    navigate('/dashboard');
  };

  const handleAuthError = (error: unknown, providerName: string) => {
    console.error(`Error during ${providerName} sign-up:`, error);
    let errorMessage = `An unexpected error occurred with ${providerName} sign-up.`;

    if (isAppError(error)) {
      const authError = error as AppError & { code?: string };
      if (authError.code === 'auth/account-exists-with-different-credential') {
        errorMessage = `An account already exists with this email address using a different sign-in method. Please sign in with that method.`;
      } else {
        errorMessage = authError.message;
      }
    } else if (error instanceof Error) {
      const genericError = error as Error & { code?: string };
      if (
        genericError.code === 'auth/account-exists-with-different-credential'
      ) {
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

    console.log(
      'Invited Email:',
      invitedEmail,
      'Social Email:',
      socialUser.email
    );
    if (socialUser.email.toLowerCase() !== invitedEmail.toLowerCase()) {
      console.error(
        'EMAIL MISMATCH DETECTED. Error set. Attempting to return from processSocialSignUp.'
      );
      setError(
        `The email from ${providerName} (${socialUser.email}) does not match the invited email (${invitedEmail}). Please use the account associated with the invited email.`
      );
      setSocialLoading(null);
      return;
    }

    console.log(
      'Proceeding to call backend (signUpWithOrgManagerInvitationFn) in processSocialSignUp.'
    );
    setLoading(true);
    setSocialLoading(null);

    try {
      const result = await signUpWithOrgManagerInvitationFn({
        uid: socialUser.uid,
        email: invitedEmail,
        displayName:
          socialUser.displayName || invitedEmail.split('@')[0] || 'New User',
        invitationId: invitationToken,
      });

      const responseData = result.data as SignUpWithInvitationResponse; // Re-use type, but it's for OM now

      if (responseData?.success) {
        // Attempt to get current user and refresh token
        const user = auth.currentUser;
        if (user) {
          try {
            await user.getIdToken(true); // Force refresh
            console.log('Token refreshed after social OM sign-up.');
          } catch (refreshError) {
            console.error('Error refreshing token after social OM sign-up:', refreshError);
          }
        }
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
      const result = await signUpWithOrgManagerInvitationFn({
        email: invitedEmail,
        password,
        displayName,
        invitationId: invitationToken,
      });

      const responseData = result.data as SignUpWithInvitationResponse; // Re-use type, but it's for OM now

      if (responseData?.success) {
        // Attempt to get current user and refresh token
        const user = auth.currentUser;
        if (user) {
          try {
            await user.getIdToken(true); // Force refresh
            console.log('Token refreshed after email/password OM sign-up.');
          } catch (refreshError) {
            console.error('Error refreshing token after email/password OM sign-up:', refreshError);
          }
        }
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
  if ((!invitationToken || (error && !invitedEmail)) && !success) {
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
          Accept Organization Manager Invitation & Create Account
        </Typography>

        {error && ( // General error display, might be redundant if specific error UI is shown above
          <Alert severity='error' sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant='outlined'
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignUp}
          disabled={
            loading || !!socialLoading || isFetchingInvite || !invitedEmail
          }
          sx={{
            mt: 1,
            mb: 1,
            borderColor: '#db4437',
            color: '#db4437',
            '&:hover': {
              borderColor: '#db4437',
              backgroundColor: 'rgba(219, 68, 55, 0.04)',
            },
          }}
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
          startIcon={<AccountCircleIcon />}
          onClick={handleMicrosoftSignUp}
          disabled={
            loading || !!socialLoading || isFetchingInvite || !invitedEmail
          }
          sx={{
            mt: 1,
            mb: 2,
            borderColor: '#0078D4',
            color: '#0078D4',
            '&:hover': {
              borderColor: '#0078D4',
              backgroundColor: 'rgba(0, 120, 212, 0.04)',
            },
          }}
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

export default AcceptOrgManagerInvitationPage;
