import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Container, Alert } from '@mui/material';
import { isAppError } from '../utils/errorUtils'; // Added import
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig'; // Assuming functions is exported from firebaseConfig

// Define expected result type from the callable function
interface ProcessLinkResult {
  invitationId: string;
  campaignId: string;
  organizationId: string;
  targetPropertyId: string;
  rolesToAssign: string[];
  expiresAt?: number | null;
}

const PublicCampaignHandlerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const campaignId = queryParams.get('campaign');

    if (!campaignId) {
      setError('Campaign ID not found in URL.');
      setLoading(false);
      return;
    }

    const processLink = async () => {
      try {
        setLoading(true);
        const processPublicCampaignLinkFunction = httpsCallable<
          { campaignId: string },
          ProcessLinkResult
        >(functions, 'processPublicCampaignLink');
        
        const result = await processPublicCampaignLinkFunction({ campaignId });
        const { invitationId, organizationId } = result.data;

        // Navigate to the actual JoinCampaignPage or AcceptInvitationPage
        // For now, let's assume JoinCampaignPage is the target
        // It expects invitationId, campaignId, and organizationId
        navigate(
          `/join-campaign?invitationId=${invitationId}&campaignId=${campaignId}&organizationId=${organizationId}`
        );
        // No need to setLoading(false) as we are navigating away
      } catch (err: unknown) { // Changed from any to unknown
        console.error('Error processing public campaign link:', err);
        let displayMessage = 'An unexpected error occurred while processing the campaign link.';
        if (isAppError(err)) {
          displayMessage = err.message; // Default to err.message if it's an AppError
          if (err.code) { // If it also has a code, format it nicely
            displayMessage = `Error: ${err.message} (Code: ${err.code})`;
          }
        }
        setError(displayMessage);
        setLoading(false);
      }
    };

    processLink();
  }, [location, navigate]);

  if (loading) {
    return (
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Processing your link...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
        }}
      >
        <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: '600px' }}>
          <Typography variant="h5" gutterBottom>
            Link Processing Failed
          </Typography>
          <Typography>{error}</Typography>
        </Alert>
        <Typography variant="body1">
          Please check the link or contact support if the issue persists.
        </Typography>
      </Container>
    );
  }

  return null; // Should have navigated or shown an error/loader
};

export default PublicCampaignHandlerPage;
