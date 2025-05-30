import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  // TableCell, // Will be used in CampaignRow
  TableContainer,
  TableHead,
  // TableRow, // Will be used in CampaignRow
  Paper,
  TableCell, // Moved here for TableHead, also used in CampaignRow
  TableRow, // Moved here for TableHead, also used in CampaignRow
  Typography,
  CircularProgress,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Snackbar, // Added for notifications
  Alert, // Added for notifications
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOffIcon from '@mui/icons-material/ToggleOff'; // For Deactivate
import PlayArrowIcon from '@mui/icons-material/PlayArrow'; // For Activate
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db, functions } from '../../../firebaseConfig'; // Adjust path as necessary
import { httpsCallable } from 'firebase/functions';
import type { Campaign, CampaignActionResult, DeactivateCampaignData, DeleteCampaignData, ActivateCampaignData } from '../../../types'; // Use type-only import
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth'; // For permission checks
import { isAppError } from '../../../utils/errorUtils';
import EditCampaignModal from './EditCampaignModal';
import ConfirmDeactivateCampaignDialog from './ConfirmDeactivateCampaignDialog';
import ConfirmActivateCampaignDialog from './ConfirmActivateCampaignDialog'; // Added
import ConfirmDeleteCampaignDialog from './ConfirmDeleteCampaignDialog';

// Utility functions moved outside the component for stable references
const getStatusChipColor = (status: Campaign['status']) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'processing':
      return 'info';
    case 'completed':
    case 'expired':
      return 'default';
    case 'inactive':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const formatDate = (timestamp: Timestamp | null | undefined) => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface CampaignRowProps {
  campaign: Campaign;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => void;
}

const CampaignRow = React.memo<CampaignRowProps>(({ campaign, onMenuOpen }) => {
  return (
    <TableRow
      key={campaign.id} // key is on CampaignRow now, but good to have it here too if map was direct
      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
    >
      <TableCell component="th" scope="row">
        {campaign.campaignName}
      </TableCell>
      <TableCell>
        {campaign.campaignType === 'csv_import' ? 'CSV Import' : 'Public Link'}
      </TableCell>
      <TableCell>
        <Chip
          label={campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          color={getStatusChipColor(campaign.status)}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        {`${campaign.totalAccepted} / ${campaign.maxUses ?? '∞'}`}
        {campaign.campaignType === 'csv_import' && campaign.totalInvitedFromCsv !== undefined && (
            <Typography variant="caption" display="block">
                (Invited: {campaign.totalInvitedFromCsv})
            </Typography>
        )}
      </TableCell>
      <TableCell>{formatDate(campaign.createdAt)}</TableCell>
      <TableCell>{formatDate(campaign.expiresAt)}</TableCell>
      <TableCell align="right">
        <IconButton
          aria-label="actions"
          aria-controls={`actions-menu-${campaign.id}`}
          aria-haspopup="true"
          onClick={(event) => onMenuOpen(event, campaign)}
        >
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});
CampaignRow.displayName = 'CampaignRow';


interface CampaignsTableProps {
  organizationId: string;
  propertyId: string;
}

const CampaignsTable: React.FC<CampaignsTableProps> = ({ organizationId, propertyId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [errorTable, setErrorTable] = useState<string | null>(null);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false); // Added
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false); // For modal/dialog actions
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null); // For Snackbar
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info'); // For Snackbar


  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  }, []); // setAnchorEl and setSelectedCampaign are stable

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    // Keep selectedCampaign for modals until they are closed,
    // or clear it if menu close means action is abandoned.
    // For now, let's assume modals will use selectedCampaign and close will clear it if needed.
    // If menu is closed without action, selectedCampaign should ideally be cleared.
    // Let's clear it here for simplicity, modal open handlers will re-set it if needed.
    // setSelectedCampaign(null); // This might be too aggressive if modals rely on it being set before they fully open.
    // Let's stick to the original logic: menu items set modal states, and they use the `selectedCampaign` from when menu was opened.
    // Closing the menu itself shouldn't clear `selectedCampaign` if a modal is about to use it.
  }, []); // No dependencies, stable function

  const handleViewDetails = useCallback(() => {
    if (selectedCampaign) {
      navigate(`/campaigns/${selectedCampaign.id}`, { 
        state: { 
          organizationId: selectedCampaign.organizationId, 
          propertyId: selectedCampaign.propertyId 
        } 
      });
    }
    setAnchorEl(null); // Close menu after action
  }, [navigate, selectedCampaign]);

  const handleOpenEditModal = useCallback(() => {
    if (selectedCampaign) {
      setIsEditModalOpen(true);
    }
    setAnchorEl(null); // Close menu
  }, [selectedCampaign]);

  const handleOpenDeactivateDialog = useCallback(() => {
    if (selectedCampaign) {
      setIsDeactivateDialogOpen(true);
    }
    setAnchorEl(null); // Close menu
  }, [selectedCampaign]);

  const handleOpenActivateDialog = useCallback(() => { // Added
    if (selectedCampaign) {
      setIsActivateDialogOpen(true);
    }
    setAnchorEl(null); // Close menu
  }, [selectedCampaign]);

  const handleOpenDeleteDialog = useCallback(() => {
    if (selectedCampaign && selectedCampaign.status === 'inactive') {
      setIsDeleteDialogOpen(true);
    } else if (selectedCampaign) {
        setSnackbarMessage("Campaign must be inactive to be deleted.");
        setSnackbarSeverity('warning');
    }
    setAnchorEl(null); // Close menu
  }, [selectedCampaign]);
  
  const handleSnackbarClose = () => {
    setSnackbarMessage(null);
  };

  const confirmDeactivate = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    setSnackbarMessage(null);
    try {
      const deactivateFn = httpsCallable<DeactivateCampaignData, CampaignActionResult>(functions, 'deactivateCampaign');
      const result = await deactivateFn({ 
        campaignId: selectedCampaign.id, 
        organizationId: selectedCampaign.organizationId, 
        propertyId: selectedCampaign.propertyId 
      });
      setSnackbarMessage(result.data.message || 'Campaign deactivated successfully!');
      setSnackbarSeverity('success');
    } catch (err: unknown) {
      console.error("Error deactivating campaign", err);
      if (isAppError(err)) {
        setSnackbarMessage(err.message);
      } else {
        setSnackbarMessage("Failed to deactivate campaign.");
      }
      setSnackbarSeverity('error');
    } finally {
      setActionLoading(false);
      setIsDeactivateDialogOpen(false);
    }
  };

  const confirmActivate = async () => { // Added
    if (!selectedCampaign) return;
    setActionLoading(true);
    setSnackbarMessage(null);
    try {
      const activateFn = httpsCallable<ActivateCampaignData, CampaignActionResult>(functions, 'activateCampaign');
      const result = await activateFn({
        campaignId: selectedCampaign.id,
        organizationId: selectedCampaign.organizationId,
        propertyId: selectedCampaign.propertyId
      });
      setSnackbarMessage(result.data.message || 'Campaign reactivated successfully!');
      setSnackbarSeverity('success');
    } catch (err: unknown) {
      console.error("Error activating campaign", err);
      if (isAppError(err)) {
        setSnackbarMessage(err.message);
      } else {
        setSnackbarMessage("Failed to activate campaign.");
      }
      setSnackbarSeverity('error');
    } finally {
      setActionLoading(false);
      setIsActivateDialogOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedCampaign || selectedCampaign.status !== 'inactive') return;
    setActionLoading(true);
    setSnackbarMessage(null);
    try {
      const deleteFn = httpsCallable<DeleteCampaignData, CampaignActionResult>(functions, 'deleteCampaign');
      const result = await deleteFn({ 
        campaignId: selectedCampaign.id, 
        organizationId: selectedCampaign.organizationId, 
        propertyId: selectedCampaign.propertyId 
      });
      setSnackbarMessage(result.data.message || 'Campaign deleted successfully!');
      setSnackbarSeverity('success');
    } catch (err: unknown) {
      console.error("Error deleting campaign", err);
      if (isAppError(err)) {
        setSnackbarMessage(err.message);
      } else {
        setSnackbarMessage("Failed to delete campaign.");
      }
      setSnackbarSeverity('error');
    } finally {
      setActionLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };


  useEffect(() => {
    if (!organizationId || !propertyId) {
      setLoadingTable(false);
      setErrorTable("Organization ID or Property ID is missing.");
      setCampaigns([]);
      return;
    }
    setLoadingTable(true);
    setErrorTable(null);

    const campaignsRef = collection(
      db,
      'organizations',
      organizationId,
      'properties',
      propertyId,
      'campaigns'
    );
    const q = query(campaignsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const campaignsData: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          campaignsData.push({ id: doc.id, ...doc.data() } as Campaign);
        });
        setCampaigns(campaignsData);
        setLoadingTable(false);
      },
      (err) => {
        console.error('Error fetching campaigns:', err);
        setErrorTable('Failed to fetch campaigns.');
        setLoadingTable(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId, propertyId]);

  if (loadingTable) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100px">
        <CircularProgress />
      </Box>
    );
  }

  if (errorTable) {
    return <Typography color="error">{errorTable}</Typography>;
  }
  
  if (campaigns.length === 0 && !loadingTable) {
    return <Typography>No campaigns found for this property.</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table sx={{ minWidth: 650 }} aria-label="campaigns table">
        <TableHead>
          <TableRow>
            <TableCell>Campaign Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Usage (Accepted/Max)</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Expires At</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onMenuOpen={handleMenuOpen}
            />
          ))}
        </TableBody>
      </Table>
      <Menu
        id={`actions-menu-${selectedCampaign?.id}`}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose} // Using useCallback version of handleMenuClose
        keepMounted
      >
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem 
          onClick={handleOpenEditModal} 
          disabled={!selectedCampaign || !(currentUser?.uid === selectedCampaign.createdBy || currentUser?.customClaims?.roles?.includes('admin') || (currentUser?.customClaims?.roles?.includes('organization_manager') && currentUser?.customClaims?.organizationIds?.includes(selectedCampaign.organizationId)))}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem 
          onClick={handleOpenDeactivateDialog} 
          disabled={!selectedCampaign || !(currentUser?.customClaims?.roles?.includes('admin') || (currentUser?.customClaims?.roles?.includes('organization_manager') && currentUser?.customClaims?.organizationIds?.includes(selectedCampaign.organizationId)) || (currentUser?.customClaims?.roles?.includes('property_manager') && currentUser?.customClaims?.organizationId === selectedCampaign.organizationId))}
        >
          <ListItemIcon>
            <ToggleOffIcon fontSize="small" />
          </ListItemIcon>
          Deactivate
        </MenuItem>
        <MenuItem // Added Activate option
          onClick={handleOpenActivateDialog}
          disabled={!selectedCampaign || selectedCampaign.status !== 'inactive' || !(currentUser?.customClaims?.roles?.includes('admin') || (currentUser?.customClaims?.roles?.includes('organization_manager') && currentUser?.customClaims?.organizationIds?.includes(selectedCampaign.organizationId)) || (currentUser?.customClaims?.roles?.includes('property_manager') && currentUser?.customClaims?.organizationId === selectedCampaign.organizationId))}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Reactivate
        </MenuItem>
        <MenuItem 
          onClick={handleOpenDeleteDialog} 
          disabled={!selectedCampaign || selectedCampaign.status !== 'inactive' || !(currentUser?.uid === selectedCampaign.createdBy || currentUser?.customClaims?.roles?.includes('admin') || (currentUser?.customClaims?.roles?.includes('organization_manager') && currentUser?.customClaims?.organizationIds?.includes(selectedCampaign.organizationId)))}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {selectedCampaign && (
        <EditCampaignModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          campaign={selectedCampaign}
          onCampaignUpdated={() => {
            // refreshCampaigns(); // onSnapshot should handle this
            setIsEditModalOpen(false);
            setSnackbarMessage("Campaign updated successfully!");
            setSnackbarSeverity('success');
          }}
        />
      )}

      {selectedCampaign && (
        <ConfirmDeactivateCampaignDialog
          open={isDeactivateDialogOpen}
          onClose={() => setIsDeactivateDialogOpen(false)}
          onConfirm={confirmDeactivate}
          campaignName={selectedCampaign?.campaignName}
          loading={actionLoading}
        />
      )}

      {selectedCampaign && ( // Added Activate Dialog
        <ConfirmActivateCampaignDialog
          open={isActivateDialogOpen}
          onClose={() => setIsActivateDialogOpen(false)}
          onConfirm={confirmActivate}
          campaignName={selectedCampaign?.campaignName}
          // loading={actionLoading} // Add if needed, but activate is simpler
        />
      )}

      {selectedCampaign && (
        <ConfirmDeleteCampaignDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          campaignName={selectedCampaign?.campaignName}
          campaignStatus={selectedCampaign?.status}
          loading={actionLoading}
        />
      )}
      
      <Snackbar 
        open={Boolean(snackbarMessage)} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

    </TableContainer>
  );
};

export default CampaignsTable;
