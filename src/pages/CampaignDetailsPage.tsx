import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { functions, db } from '../firebaseConfig';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Campaign, Invitation, Property } from '../types';
import { useAuth } from '../hooks/useAuth';
import { isAppError } from '../utils/errorUtils';
import { 
  Box, CircularProgress, Typography, Paper, Button, Divider, Alert, Stack,
  List, ListItem, ListItemIcon, ListItemText, Chip, TextField, InputAdornment, IconButton, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
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
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LabelIcon from '@mui/icons-material/Label';
import CampaignIcon from '@mui/icons-material/Campaign';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

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
  const [propertyName, setPropertyName] = useState<string | null>(null); // Added state for property name
  const [page, setPage] = useState(0); // Added for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Added for pagination
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

    const fetchAndSetDetails = async () => {
      try {
        const routeState = location.state as CampaignRouteState | null; 

        const stateOrgId = routeState?.organizationId;
        const statePropId = routeState?.propertyId;

        console.log('[CampaignDetailsPage] Route state orgId:', stateOrgId, 'propId:', statePropId);

        const orgIdToUse = stateOrgId || currentUser?.customClaims?.organizationId || 'ERROR_NO_ORG_ID'; 
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
        const fetchedCampaign = result.data.campaign;
        setCampaignDetails(fetchedCampaign);
        setInvitations(result.data.invitations);

        if (fetchedCampaign && fetchedCampaign.organizationId && fetchedCampaign.propertyId) {
          try {
            const propertyRef = doc(db, 'organizations', fetchedCampaign.organizationId, 'properties', fetchedCampaign.propertyId);
            const propertySnap = await getDoc(propertyRef);
            if (propertySnap.exists()) {
              setPropertyName((propertySnap.data() as Property).name);
            } else {
              console.warn(`Property not found: ${fetchedCampaign.propertyId}`);
              setPropertyName('N/A');
            }
          } catch (propError) {
            console.error('Error fetching property name:', propError);
            setPropertyName('Error loading name');
          }
        }

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

  }, [campaignId, currentUser, location.state]); 

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', marginTop: 5 }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ margin: 2 }}>{error}</Alert>;
  }

  if (!campaignDetails) {
    return <Typography sx={{ margin: 2 }}>Campaign data not available or not found.</Typography>;
  }

  const formatTimestamp = (timestampInput: Timestamp | null | undefined): string => {
    if (!timestampInput) return 'N/A';
    
    let secondsValue: number | undefined = undefined;

    if (timestampInput && typeof (timestampInput as Timestamp).seconds === 'number') {
      secondsValue = (timestampInput as Timestamp).seconds;
    } else {
      const potentiallyPlainObject = timestampInput as unknown as { _seconds?: number };
      if (typeof potentiallyPlainObject._seconds === 'number') {
        secondsValue = potentiallyPlainObject._seconds;
      }
    }

    if (typeof secondsValue === 'number') {
      return new Date(secondsValue * 1000).toLocaleString();
    }
    
    return 'Invalid Date';
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - invitations.length) : 0;

  return (
    <Paper sx={{ padding: 3, margin: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', mb: 0 /* Remove bottom margin from Typography as Box handles it */ }}>
          <CampaignIcon sx={{ mr: 1.5, fontSize: '2.2rem' }} /> Campaign Details
        </Typography>
        <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<ArrowBackIosIcon />}>
          Go Back
        </Button>
      </Box>
      
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ marginBottom: 3 }} divider={<Divider orientation="vertical" flexItem />}>
        <Box sx={{ flex: 1 }}>
        
          <List dense>
            <ListItem>
              <ListItemIcon><AssignmentIcon /></ListItemIcon>
              <ListItemText primary="Campaign Name" secondary={campaignDetails.campaignName} />
            </ListItem>
            <ListItem>
              <ListItemIcon><VpnKeyIcon /></ListItemIcon>
              <ListItemText primary="Campaign ID" secondary={campaignDetails.id} />
            </ListItem>
            <ListItem>
              <ListItemIcon><LabelIcon /></ListItemIcon>
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
              <ListItemText 
                primary="Status" 
                secondary={<Chip label={campaignDetails.status.charAt(0).toUpperCase() + campaignDetails.status.slice(1)} size="small" color={
                  campaignDetails.status === 'active' ? 'success' :
                  campaignDetails.status === 'inactive' ? 'error' :
                  campaignDetails.status === 'completed' ? 'primary' :
                  campaignDetails.status === 'expired' ? 'warning' : 'default'
                } />} 
                secondaryTypographyProps={{ component: 'span' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              <ListItemText primary="Created By (UID)" secondary={campaignDetails.createdBy} />
            </ListItem>
            <ListItem>
              <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
              <ListItemText primary="Created At" secondary={formatTimestamp(campaignDetails.createdAt)} />
            </ListItem>
            {campaignDetails.expiresAt && (
              <ListItem>
                <ListItemIcon><EventBusyIcon /></ListItemIcon>
                <ListItemText primary="Expires At" secondary={formatTimestamp(campaignDetails.expiresAt)} />
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
                    <ListItemIcon><HomeWorkIcon /></ListItemIcon>
                    <ListItemText primary="Property Name" secondary={propertyName || campaignDetails.propertyId} />
                </ListItem>
            
            </List>
        </Box>
      </Stack>

      <Divider sx={{ marginY: 2 }} />

      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
        <GroupAddIcon sx={{ mr: 1 }} /> Invitations ({invitations.length})
      </Typography>
      {invitations.length > 0 ? (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table aria-label="invitations table">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invited At</TableCell>
                <TableCell>Expires At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell component="th" scope="row">
                    {inv.email}
                  </TableCell>
                  <TableCell>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</TableCell>
                  <TableCell>{formatTimestamp(inv.createdAt)}</TableCell>
                  <TableCell>{inv.expiresAt ? formatTimestamp(inv.expiresAt) : 'N/A'}</TableCell>
                </TableRow>
              ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={4} />
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={invitations.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
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
