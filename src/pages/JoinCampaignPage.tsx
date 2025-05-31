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
import type { SignUpWithInvitationResponse, AppError, Invitation } from '../types';
import { isAppError } from '../utils/errorUtils';
import { auth } from '../firebaseConfig';

// This page is very similar to AcceptInvitationPage, but specifically for campaign-generated invitations.
// The main difference is how the invitationId and potentially campaignId are retrieved from the URL.
// The handleCampaignSignUpLink HTTP function redirects to:
// /accept-invitation?invitationId={newInvitationId}&campaignId={campaignId}
// So, this page should effectively be able to use the 'invitationId' like AcceptInvitationPage.
// The 'campaignId' on the invitation document itself will be handled by 'signUpWithInvitation' Cloud Function.

const JoinCampaignPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // invitedEmail will store the email from the invitation, if present.
  // email state will be for the input field, initialized by invitedEmail or empty.
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null); 
  const [isFetchingInvite, setIsFetchingInvite] = useState<boolean>(true);

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [invitationId, setInvitationId] = useState<string | null>(null);
  // const [campaignId, setCampaignId] = useState<string | null>(null); // Store campaignId if needed on this page
  const [organizationId, setOrganizationId] = useState<string | null>(null); // Store orgId from invitation

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const invId = queryParams.get('invitationId');
    // const campId = queryParams.get('campaignId'); // Campaign ID might also be in URL

    setInvitationId(invId);
    // setCampaignId(campId); // Store it, though primary use is invId

    if (invId) {
      const functionsInstance = getFunctions();
      // We need to get the organizationId from the invitation itself.
      // getInvitationDetails expects { invitationId, organizationId }
      // However, for a campaign link, the orgId is part of the invitation document.
      // Let's assume getInvitationDetails can fetch by invId alone if it's a global/campaign invite
      // OR, we need a different/updated cloud function.
      // For now, let's try to adapt. The invitation document should have the orgId.
      // The `handleCampaignSignUpLink` creates an invitation in `organizations/{orgId}/invitations`.
      // So, the invitation *is* under an org. The `getInvitationDetails` might need to be more flexible
      // or we need a specific `getCampaignInvitationDetails`.
      // Let's assume `getInvitationDetails` can work if we can derive orgId or it's not strictly needed for the call.
      // The invitation document itself will contain the organizationId.

      const getInvitationDetailsFn = httpsCallable(functionsInstance, 'getInvitationDetails');

      const fetchInviteDetails = async () => {
        setIsFetchingInvite(true);
        setError(null);
        try {
          // To call getInvitationDetails, we need the organizationId the invitation belongs to.
          // This is a bit of a chicken-and-egg if the URL doesn't provide it directly for this page.
          // The invitation document itself *has* the organizationId.
          // A robust `getInvitationDetails` might try to find the invitation across potential paths if orgId isn't given,
          // or this page might need a different endpoint if orgId isn't in the URL.
          // Let's assume for now the invitation object fetched will give us the orgId.
          // The `handleCampaignSignUpLink` creates an invitation that *does* have an organizationId.
          // The critical part is that `signUpWithInvitation` needs the `organizationId`.

          // We will fetch the invitation and extract organizationId from its data.
          // This requires `getInvitationDetails` to be callable with just `invitationId`
          // and for it to return the full invitation document including `organizationId`.
          // This is a deviation from AcceptInvitationPage which gets orgId from URL.
          // Let's assume getInvitationDetails is updated or a new function is used.
          // For now, we'll simulate this by trying to get it.
          // A better approach: getInvitationDetails should accept just invitationId for global/campaign invites
          // and return the full invite including its parent organizationId.

          // Let's call a hypothetical `getGenericInvitationDetails` that only needs invitationId
          // For now, we'll stick to `getInvitationDetails` and assume it can be called if we find the orgId
          // from the invitation data itself after a preliminary fetch or if the function is adapted.

          // Simplification: The `signUpWithInvitation` function will use the `organizationId`
          // stored within the invitation document in Firestore. This page primarily needs to validate the
          // invitationId and get the invited email.

          // Let's assume `getInvitationDetails` can be called with a "placeholder" orgId if it's a global invite,
          // or it's smart enough. For campaign invites, they are nested.
          // The `handleCampaignSignUpLink` creates an invitation under `organizations/{orgId}/invitations/{invId}`.
          // This means the `orgId` is implicitly known by the structure.
          // The `getInvitationDetails` function *must* be able to retrieve it.
          // The current `AcceptInvitationPage` gets `orgId` from URL. This page does not.
          // This is a problem. `getInvitationDetails` needs `organizationId`.

          // Solution: The `handleCampaignSignUpLink` should also pass the `organizationId` in the redirect URL.
          // Let's assume it does: /accept-invitation?invitationId=...&campaignId=...&organizationId=...
          // Re-checking `activeContext.md` for `handleCampaignSignUpLink`
          // It says: "redirects the user to the standard `AcceptInvitationPage` with the new invitation ID."
          // This implies `AcceptInvitationPage` is reused. If so, it needs `orgId`.
          // If this `JoinCampaignPage` is distinct, it needs a way to get `orgId`.

          // For now, let's assume `handleCampaignSignUpLink` adds `organizationId` to the redirect.
          const orgIdFromUrl = queryParams.get('organizationId');
          if (!orgIdFromUrl) {
            setError("Organization ID is missing from the campaign link. Cannot proceed.");
            setIsFetchingInvite(false);
            return;
          }
          setOrganizationId(orgIdFromUrl);


          const result = await getInvitationDetailsFn({ invitationId: invId, organizationId: orgIdFromUrl });
          const details = result.data as Invitation; 

          if (details.email) {
            setInvitedEmail(details.email); // Store the email from invitation
            setEmail(details.email);        // Pre-fill the input field
          } else {
            // No email in invitation (e.g., public campaign link), allow user to enter it.
            setInvitedEmail(null); // Explicitly set to null
            setEmail('');          // Ensure input field is empty
          }
          // organizationId is already set from orgIdFromUrl, which is necessary for the call.
          // If details contained a different/more accurate orgId, we could update here,
          // but for now, orgIdFromUrl is the source of truth for this page's context.
          // setOrganizationId(details.organizationId || orgIdFromUrl); 

        } catch (error: unknown) {
          console.error('Error fetching campaign invitation details:', error);
          let specificError = 'Failed to load campaign invitation. The link may be invalid, expired, or already used.';
          if (isAppError(error)) {
            specificError = `Failed to load invitation: ${error.message}`;
            const firebaseError = error as AppError & { code?: string; details?: { code?: string } };
            if (firebaseError.code === 'not-found' || firebaseError.details?.code === 'not-found') {
              specificError = 'Invitation not found. Please check the link.';
            } else if (firebaseError.code === 'failed-precondition' || firebaseError.details?.code === 'failed-precondition') {
              specificError = firebaseError.message || 'Invitation is not valid (it may have been accepted, revoked, or expired).';
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
      setError('Campaign invitation ID is missing from the URL.');
      setIsFetchingInvite(false);
    }
  }, [location.search]);

  const functionsInstance = getFunctions();
  const signUpWithInvitationFn = httpsCallable(functionsInstance, 'signUpWithInvitation');

  const handleAuthSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => {
      navigate('/login'); // Or /dashboard if auto-login
    }, 3000);
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
      if (genericError.code === 'auth/account-exists-with-different-credential') {
        errorMessage = `An account already exists with this email address using a different sign-in method. Please sign in with that method.`;
      } else {
        errorMessage = genericError.message;
      }
    }
    setError(errorMessage);
  };

  const processSocialSignUp = async (socialUser: UserCredential['user'], providerName: 'google' | 'microsoft') => {
    // Use the 'email' state which might be user-entered if 'invitedEmail' was null
    if (isFetchingInvite || !organizationId) { 
      setError('Please wait for invitation details to load or ensure the invitation is valid.');
      return;
    }
    if (!invitationId) {
      setError('Invitation ID is missing. Cannot proceed.');
      setSocialLoading(null);
      return;
    }
    // For social sign-up, the email from the provider is paramount.
    // If an email was invited, they must match. If no email was invited, use the provider's.
    if (!socialUser.email) {
      setError(`Could not retrieve email from ${providerName}. Please try again or use email/password.`);
      setSocialLoading(null);
      return;
    }

    const finalEmail = socialUser.email; // Use provider's email

    if (invitedEmail && finalEmail.toLowerCase() !== invitedEmail.toLowerCase()) {
      setError(`The email from ${providerName} (${finalEmail}) does not match the invited email (${invitedEmail}). Please use the account associated with the invited email.`);
      setSocialLoading(null);
      return;
    }

    setLoading(true);
    setSocialLoading(null);
    try {
      const result = await signUpWithInvitationFn({
        uid: socialUser.uid,
        email: finalEmail, // Use the email from the social provider
        displayName: socialUser.displayName || finalEmail.split('@')[0] || 'New User',
        organizationId, 
        invitationId,
        // campaignId will be on the invitation document, handled by backend
      });
      const responseData = result.data as SignUpWithInvitationResponse;
      if (responseData?.success) {
        handleAuthSuccess(responseData.message || `Account created successfully with ${providerName}! You will be redirected.`);
      } else {
        setError(responseData?.message || `Failed to create account with ${providerName} campaign invitation.`);
      }
    } catch (err) {
      console.error(`Error accepting ${providerName} campaign invitation:`, err);
      handleAuthError(err, providerName);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // Allow social sign up even if invitedEmail is null (public campaign)
    if (isFetchingInvite) return; 
    setError(null); setSuccess(null); setSocialLoading('google');
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
    // Allow social sign up even if invitedEmail is null (public campaign)
    if (isFetchingInvite) return; 
    setError(null); setSuccess(null); setSocialLoading('microsoft');
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
    // Use the 'email' state for submission, which could be user-entered
    if (isFetchingInvite || !organizationId) { 
      setError('Please wait for invitation details to load or ensure the invitation is valid.');
      return;
    }
    setError(null); setSuccess(null);
    if (!invitationId) {
      setError('Invitation ID is missing. Cannot proceed.');
      return;
    }
    if (!email || !password || !displayName) { // Check 'email' state here
      setError('Please fill in all fields: Email, Full Name, and Password.');
      return;
    }
    // If an email was part of the invitation, the submitted email must match.
    if (invitedEmail && email.toLowerCase() !== invitedEmail.toLowerCase()) {
      setError(`The email provided (${email}) does not match the invited email (${invitedEmail}). Please use the correct email address or contact support.`);
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithInvitationFn({
        email: email, // Use the 'email' state from the form
        password,
        displayName,
        organizationId, 
        invitationId,
        // campaignId will be on the invitation document, handled by backend
      });
      const responseData = result.data as SignUpWithInvitationResponse;
      if (responseData?.success) {
        handleAuthSuccess(responseData.message || 'Account created successfully! You will be redirected to login.');
      } else {
        setError(responseData?.message || 'Failed to create account with campaign invitation.');
      }
    } catch (err) {
      console.error('Error accepting campaign invitation with email/password:', err);
      handleAuthError(err, 'Email/Password');
    } finally {
      setLoading(false);
    }
  };

  if (isFetchingInvite && !error && !success) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading campaign invitation...</Typography>
        </Paper>
      </Container>
    );
  }

  // Show error if critical IDs are missing, or if there's an error and we are still fetching (or failed to fetch)
  // invitedEmail being null is okay if we are not in an error state from fetching.
  if ((!invitationId || !organizationId || error) && !success && isFetchingInvite) {
    // This covers cases where fetching is ongoing and already hit an error, or critical IDs missing.
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" color="error">Invalid Campaign Link</Typography>
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error || 'The campaign link is missing information, invalid, or has expired. Please check the link or contact support.'}
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (success && !error) {
    return (
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5">Success!</Typography>
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{success}</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>Join Campaign & Create Account</Typography>
        {error && !isFetchingInvite && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}

        <Button 
          fullWidth 
          variant="outlined" 
          startIcon={<GoogleIcon />} 
          onClick={handleGoogleSignUp} 
          disabled={loading || !!socialLoading || isFetchingInvite} 
          sx={{ mt: 1, mb: 1, borderColor: '#db4437', color: '#db4437', '&:hover': { borderColor: '#db4437', backgroundColor: 'rgba(219, 68, 55, 0.04)' } }}
        >
          {socialLoading === 'google' ? <CircularProgress size={24} /> : 'Sign up with Google'}
        </Button>
        <Button 
          fullWidth 
          variant="outlined" 
          startIcon={<AccountCircleIcon />} 
          onClick={handleMicrosoftSignUp} 
          disabled={loading || !!socialLoading || isFetchingInvite} 
          sx={{ mt: 1, mb: 2, borderColor: '#0078D4', color: '#0078D4', '&:hover': { borderColor: '#0078D4', backgroundColor: 'rgba(0, 120, 212, 0.04)' } }}
        >
          {socialLoading === 'microsoft' ? <CircularProgress size={24} /> : 'Sign up with Microsoft'}
        </Button>
        <Divider sx={{ width: '100%', my: 2 }}>OR</Divider>
        <Box component="form" onSubmit={handleEmailPasswordSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField 
            margin="normal" 
            required 
            fullWidth 
            id="email" 
            label={invitedEmail ? "Invited Email Address" : "Your Email Address"} 
            name="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{ readOnly: !!invitedEmail }} // ReadOnly if email came from invitation
            disabled={isFetchingInvite || loading || !!socialLoading || !!invitedEmail} // Also disable if invitedEmail is set
          />
          <TextField 
            margin="normal" 
            required 
            fullWidth 
            id="displayName" 
            label="Full Name" 
            name="displayName" 
            autoComplete="name" 
            autoFocus={!invitedEmail} // Autofocus if email is not pre-filled
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            disabled={isFetchingInvite || loading || !!socialLoading} 
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
            disabled={isFetchingInvite || loading || !!socialLoading} 
          />
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            sx={{ mt: 3, mb: 2 }} 
            disabled={isFetchingInvite || loading || !!socialLoading}
          >
            {loading && !socialLoading ? <CircularProgress size={24} /> : 'Create Account with Email'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default JoinCampaignPage;
