import  { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Card, CardContent, CardHeader, Typography, CircularProgress, Alert } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const MyAccountPage = () => {
  const { currentUser, organizationId } = useAuth();
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checkConnectionStatus = useCallback(async () => {
    if (!currentUser || !organizationId) return;
    const db = getFirestore();
    const tokenDocRef = doc(db, 'organizations', organizationId, 'googleAuth', currentUser.uid);
    const docSnap = await getDoc(tokenDocRef);
    setIsConnected(docSnap.exists());
    setIsLoading(false);
  }, [currentUser, organizationId]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('status') === 'success') {
      setSuccessMessage('Successfully connected your Google account!');
      checkConnectionStatus();
    } else if (queryParams.get('status') === 'error') {
      setError('Failed to connect Google account. Please try again.');
    }
  }, [location, checkConnectionStatus]);

  useEffect(() => {
    if (!currentUser || !organizationId) {
      setIsLoading(false);
      return;
    }
    const db = getFirestore();
    const tokenDocRef = doc(db, 'organizations', organizationId, 'googleAuth', currentUser.uid);
    const unsubscribe = onSnapshot(tokenDocRef, (doc) => {
      setIsConnected(doc.exists());
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, organizationId]);

  const handleConnect = async () => {
    if (!organizationId) {
      setError('Could not determine your organization. Please try again.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const functions = getFunctions();
    const initiateGoogleOAuth = httpsCallable(functions, 'initiateGoogleOAuth');
    try {
      const result = await initiateGoogleOAuth({ organizationId });
      const { authorizationUrl } = result.data as { authorizationUrl: string };
      window.location.href = authorizationUrl;
    } catch (err) {
      console.error('Error initiating Google OAuth:', err);
      setError('Failed to start the connection process. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!organizationId) {
      setError('Could not determine your organization. Please try again.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const functions = getFunctions();
    const disconnectGoogleAccount = httpsCallable(functions, 'disconnectGoogleAccount');
    try {
      await disconnectGoogleAccount({ organizationId });
      setSuccessMessage('Successfully disconnected your Google account.');
    } catch (err) {
      console.error('Error disconnecting Google account:', err);
      setError('Failed to disconnect the account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Card>
        <CardHeader title="My Account" />
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Google Account Connection
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
          {isLoading ? (
            <CircularProgress />
          ) : isConnected ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Your Google account is connected to this organization.
              </Typography>
              <Button variant="contained" color="secondary" onClick={handleDisconnect} disabled={isLoading}>
                Disconnect Google Account
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" gutterBottom>
                Connect your Google account to import reviews for your properties in this organization.
              </Typography>
              <Button variant="contained" color="primary" onClick={handleConnect} disabled={isLoading}>
                Connect Google Account
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MyAccountPage;
