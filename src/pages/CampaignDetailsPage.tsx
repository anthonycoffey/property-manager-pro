import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import type { Campaign, Invitation } from '../types';
import { useAuth } from '../hooks/useAuth';
import { isAppError } from '../utils/errorUtils';
import { 
  Box, CircularProgress, Typography, Paper, Button, Divider, Alert, Stack,
  List, ListItem, ListItemIcon, ListItemText, Chip, TextField, InputAdornment, IconButton, Snackbar
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import LinkIcon from '@mui/icons-material/Link';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIcon from '@mui/icons-material/Assignment'; // For CSV import specific
import PublicIcon from '@mui/icons-material/Public'; // For Public Link specific
import BusinessIcon from '@mui/icons-material/Business'; // For Organization ID
import HomeWorkIcon from '@mui/icons-material/HomeWork'; // For Property ID
import VpnKeyIcon from '@mui/icons-material/VpnKey'; // For Campaign ID

interface CampaignDetailsResult {
  campaign: Campaign;
  invitations: Invitation[];
}

interface CampaignRouteState { // Added interface for route state
  organizationId: string;
  propertyId: string;
}

const CampaignDetailsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Added useLocation hook
  const { currentUser } = useAuth();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  console.log('[CampaignDetailsPage] Loaded. CampaignId from params:', campaignId);
  console.log('[CampaignDetailsPage] Location state:', location.state);

  const [campaignDetails, setCampaignDetails] = useState<Campaign | null>(null); // For full details from function
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage('Access URL copied to clipboard!');
      setSnackbarOpen(true);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      setSnackbarMessage('Failed to copy URL.');
      setSnackbarOpen(true);
    });
  };

  useEffect(() => {
    if (!campaignId) {
      setError('Campaign ID is missing.');
      setLoading(false);
      return;
    }
    if (!currentUser) {
        setError('User information is missing.');
        setLoading(false);
        return;
    }

    // Step 1: Fetch the campaign document directly to get its orgId and propId
    // This assumes campaigns are globally unique by ID or the path structure is known
    // For this project, campaigns are under organizations/{orgId}/properties/{propId}/campaigns/{campaignId}
    // This is problematic if we don't know orgId/propId upfront.
    // The Cloud Function `getCampaignDetails` expects orgId and propId.
    // This page needs a way to get those.
    // Option: Pass orgId/propId via route state from where this page is linked (CampaignsTable).
    // Option: If campaignId is globally unique, have a root collection `campaignMetadata/{campaignId}` storing orgId/propId. (Not current structure)
    // For now, let's assume we need to find the campaign. This is inefficient.
    // A better approach: The component linking to this page (e.g., CampaignsTable) should pass
    // campaign.organizationId and campaign.propertyId via route state.

    // SIMPLIFICATION for now: Assume `getCampaignDetails` can find it with just campaignId,
    // or that the user's current context (orgId from PM/OM) is sufficient.
    // The Cloud Function `getCampaignDetails` was designed to take orgId and propId.
    // This page needs them. Let's assume they are passed via route state or fetched.

    // Placeholder: This logic needs to be robust. For now, we'll try to get it from initialCampaignData if set,
    // otherwise, this page won't work correctly without orgId and propId.
    // This is a common challenge with deeply nested data.

    // Let's assume for now that the `CampaignsTable` will pass `organizationId` and `propertyId`
    // in the navigation state.
    // For this iteration, I will simulate this by trying to fetch the campaign doc
    // if initialCampaignData is not set (which it won't be initially).
    // This is NOT ideal for production.

    const fetchAndSetDetails = async () => {
      try {
        const routeState = location.state as CampaignRouteState | null; // Use location.state

        const stateOrgId = routeState?.organizationId;
        const statePropId = routeState?.propertyId;

        console.log('[CampaignDetailsPage] Route state orgId:', stateOrgId, 'propId:', statePropId);

        const orgIdToUse = stateOrgId || currentUser?.customClaims?.organizationId || 'ERROR_NO_ORG_ID'; // Keep fallback logic for now
        const propIdToUse = statePropId || 'ERROR_NO_PROP_ID'; 

        if (orgIdToUse === 'ERROR_NO_ORG_ID' || propIdToUse === 'ERROR_NO_PROP_ID') {
            setError('Organization ID or Property ID for the campaign could not be determined. Ensure they are passed via route state.');
            console.error('[CampaignDetailsPage] Missing orgId or propId. orgIdToUse:', orgIdToUse, 'propIdToUse:', propIdToUse);
            setLoading(false);
            return;
        }

        const getDetails = httpsCallable<{ campaignId: string; organizationId: string; propertyId: string }, CampaignDetailsResult>(
          functions,
          'getCampaignDetails'
        );

        const paramsForFunction = { campaignId: campaignId!, organizationId: orgIdToUse, propertyId: propIdToUse };
        console.log('[CampaignDetailsPage] Calling getCampaignDetails with params:', paramsForFunction);

        const result = await getDetails(paramsForFunction);
        setCampaignDetails(result.data.campaign);
        setInvitations(result.data.invitations);
      } catch (err: unknown) {
        console.error('Error fetching campaign details:', err);
        if (isAppError(err)) {
          setError(err.message);
        } else {
          setError('Failed to fetch campaign details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAndSetDetails();

  }, [campaignId, currentUser, location.state]); // Use location.state in dependency array

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', marginTop: 5 }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ margin: 2 }}>{error}</Alert>;
  }

  if (!campaignDetails) {
    return <Typography sx={{ margin: 2 }}>Campaign data not available or not found.</Typography>;
  }

  return (
    <Paper sx={{ padding: 3, margin: 2 }}>
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ marginBottom: 2 }}>
        Go Back
      </Button>
      <Typography variant="h4" gutterBottom>
        Campaign Details: {campaignDetails.campaignName}
      </Typography>
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ marginBottom: 3 }} divider={<Divider orientation="vertical" flexItem />}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <InfoIcon sx={{ mr: 1 }} /> Settings
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><VpnKeyIcon /></ListItemIcon>
              <ListItemText primary="Campaign ID" secondary={campaignDetails.id} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {campaignDetails.campaignType === 'csv_import' ? <AssignmentIcon /> : <PublicIcon />}
              </ListItemIcon>
              <ListItemText primary="Type" secondary={campaignDetails.campaignType === 'csv_import' ? 'CSV Import' : 'Public Link'} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                {campaignDetails.status === 'active' && <CheckCircleOutlineIcon color="success" />}
                {campaignDetails.status === 'inactive' && <ErrorOutlineIcon color="error" />}
                {campaignDetails.status === 'completed' && <CheckCircleOutlineIcon color="primary" />}
                {campaignDetails.status === 'expired' && <EventBusyIcon color="warning" />}
                {['processing', 'error'].includes(campaignDetails.status) && <HourglassEmptyIcon color="action" />}
              </ListItemIcon>
              <ListItemText primary="Status" secondary={<Chip label={campaignDetails.status.charAt(0).toUpperCase() + campaignDetails.status.slice(1)} size="small" color={
                campaignDetails.status === 'active' ? 'success' :
                campaignDetails.status === 'inactive' ? 'error' :
                campaignDetails.status === 'completed' ? 'primary' :
                campaignDetails.status === 'expired' ? 'warning' : 'default'
              } />} />
            </ListItem>
            <ListItem>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              <ListItemText primary="Created By (UID)" secondary={campaignDetails.createdBy} />
            </ListItem>
            <ListItem>
              <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
              <ListItemText primary="Created At" secondary={new Date(campaignDetails.createdAt.seconds * 1000).toLocaleString()} />
            </ListItem>
            {campaignDetails.expiresAt && (
              <ListItem>
                <ListItemIcon><EventBusyIcon /></ListItemIcon>
                <ListItemText primary="Expires At" secondary={new Date(campaignDetails.expiresAt.seconds * 1000).toLocaleString()} />
              </ListItem>
            )}
            <ListItem>
              <ListItemIcon>{campaignDetails.maxUses === null ? <AllInclusiveIcon /> : <GroupAddIcon />}</ListItemIcon>
              <ListItemText primary="Max Uses" secondary={campaignDetails.maxUses === null ? 'Unlimited' : campaignDetails.maxUses?.toString()} />
            </ListItem>
            <ListItem>
              <ListItemIcon><GroupAddIcon color="success" /></ListItemIcon>
              <ListItemText primary="Total Accepted" secondary={campaignDetails.totalAccepted.toString()} />
            </ListItem>
            {campaignDetails.campaignType === 'csv_import' && (
              <ListItem>
                <ListItemIcon><AssignmentIcon /></ListItemIcon>
                <ListItemText primary="Total Invited (CSV)" secondary={campaignDetails.totalInvitedFromCsv?.toString() ?? 'N/A'} />
              </ListItem>
            )}
            {campaignDetails.campaignType === 'public_link' && campaignDetails.accessUrl && (
              <>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <ListItemText 
                    primary="Access URL" 
                    primaryTypographyProps={{ sx: { mb: 0.5, display: 'flex', alignItems: 'center' } }}
                    sx={{ width: '100%'}}
                  >
                     <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Access URL
                  </ListItemText>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={campaignDetails.accessUrl}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="copy access url"
                            onClick={() => handleCopyToClipboard(campaignDetails.accessUrl!)}
                            edge="end"
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mt: 0.5 }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><QrCode2Icon /></ListItemIcon>
                  <ListItemText primary="QR Code" />
                </ListItem>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1 }}>
                  <Box ref={qrCodeRef} sx={{ mb: 1 }}>
                    <QRCodeSVG value={campaignDetails.accessUrl} size={160} includeMargin={true} />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      if (qrCodeRef.current) {
                        const svgElement = qrCodeRef.current.querySelector('svg');
                        if (svgElement) {
                          const svgData = new XMLSerializer().serializeToString(svgElement);
                          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
                          const link = document.createElement('a');
                          link.href = dataUrl;
                          link.download = `campaign-${campaignDetails.id}-qrcode.svg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }
                    }}
                  >
                    Download QR
                  </Button>
                </Box>
              </>
            )}
          </List>
        </Box>
        
        <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon sx={{ mr: 1 }} /> Context
            </Typography>
            <List dense>
                <ListItem>
                    <ListItemIcon><BusinessIcon /></ListItemIcon>
                    <ListItemText primary="Organization ID" secondary={campaignDetails.organizationId} />
                </ListItem>
                <ListItem>
                    <ListItemIcon><HomeWorkIcon /></ListItemIcon>
                    <ListItemText primary="Property ID" secondary={campaignDetails.propertyId} />
                </ListItem>
                {/* TODO: Fetch and display Organization Name and Property Name */}
            </List>
        </Box>
      </Stack>

      <Divider sx={{ marginY: 2 }} />

      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
        <GroupAddIcon sx={{ mr: 1 }} /> Invitations ({invitations.length})
      </Typography>
      {invitations.length > 0 ? (
        <List>
          {invitations.map(inv => (
            <ListItem key={inv.id} sx={{ 
              border: (theme) => `1px solid ${theme.palette.divider}`, 
              borderRadius: 1, 
              mb: 1,
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <ListItemText 
                primary={inv.email} 
                secondary={`Status: ${inv.status}`} 
                primaryTypographyProps={{ fontWeight: 'medium' }}
              />
              <ListItemText 
                secondary={`Invited: ${new Date(inv.createdAt.seconds * 1000).toLocaleString()}${inv.expiresAt ? ` | Expires: ${new Date(inv.expiresAt.seconds * 1000).toLocaleString()}` : ''}`} 
                secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>No invitations found for this campaign.</Alert>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Paper>
  );
};

export default CampaignDetailsPage;
