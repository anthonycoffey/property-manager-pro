import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOffIcon from '@mui/icons-material/ToggleOff'; // For Deactivate
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db, functions } from '../../../firebaseConfig'; // Adjust path as necessary
import { httpsCallable } from 'firebase/functions';
import type { Campaign, CampaignActionResult, DeactivateCampaignData, DeleteCampaignData } from '../../../types'; // Use type-only import
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth'; // For permission checks
import { isAppError } from '../../../utils/errorUtils';
import EditCampaignModal from './EditCampaignModal';
import ConfirmDeactivateCampaignDialog from './ConfirmDeactivateCampaignDialog';
import ConfirmDeleteCampaignDialog from './ConfirmDeleteCampaignDialog';
// TODO: Add Snackbar for notifications

interface CampaignsTableProps {
  organizationId: string;
  propertyId: string;
}

// No longer need temporary Campaign type here

const CampaignsTable: React.FC<CampaignsTableProps> = ({ organizationId, propertyId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingTable, setLoadingTable] = useState(true); // Renamed for clarity
  const [errorTable, setErrorTable] = useState<string | null>(null); // Renamed for clarity
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false); // For modal/dialog actions
  const [actionError, setActionError] = useState<string | null>(null); // For modal/dialog actions

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handleViewDetails = () => {
    if (selectedCampaign) {
      // Crucial: Pass organizationId and propertyId via route state for CampaignDetailsPage
      navigate(`/campaigns/${selectedCampaign.id}`, { 
        state: { 
          organizationId: selectedCampaign.organizationId, 
          propertyId: selectedCampaign.propertyId 
        } 
      });
    }
    handleMenuClose();
  };

  const handleOpenEditModal = () => {
    if (selectedCampaign) {
      setIsEditModalOpen(true);
    }
    handleMenuClose();
  };

  const handleOpenDeactivateDialog = () => {
    if (selectedCampaign) {
      setIsDeactivateDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleOpenDeleteDialog = () => {
    if (selectedCampaign && selectedCampaign.status === 'inactive') {
      setIsDeleteDialogOpen(true);
    } else if (selectedCampaign) {
        alert("Campaign must be inactive to be deleted."); // TODO: Replace with Snackbar
        setActionError("Campaign must be inactive to be deleted.");
    }
    handleMenuClose();
  };
  
  const refreshCampaigns = () => {
    // This is a simple way to trigger a re-fetch by the useEffect.
    // A more sophisticated approach might involve direct state update or a dedicated fetch function.
    // For now, relying on the existing onSnapshot to pick up changes.
    // If onSnapshot doesn't pick up changes immediately (e.g. due to local cache),
    // a manual re-fetch or state update might be needed.
    console.log("Campaign action successful, list should refresh via onSnapshot.");
    // Potentially, force a re-render or clear and re-fetch if onSnapshot is not responsive enough.
  };


  const confirmDeactivate = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const deactivateFn = httpsCallable<DeactivateCampaignData, CampaignActionResult>(functions, 'deactivateCampaign');
      await deactivateFn({ 
        campaignId: selectedCampaign.id, 
        organizationId: selectedCampaign.organizationId, 
        propertyId: selectedCampaign.propertyId 
      });
      // alert('Campaign deactivated successfully!'); // TODO: Replace with Snackbar
      refreshCampaigns(); 
    } catch (err: unknown) {
      console.error("Error deactivating campaign", err);
      if (isAppError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to deactivate campaign.");
      }
      // alert(`Error: ${err.message || "Failed to deactivate campaign."}`); // TODO: Replace with Snackbar
    } finally {
      setActionLoading(false);
      setIsDeactivateDialogOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedCampaign || selectedCampaign.status !== 'inactive') return;
    setActionLoading(true);
    setActionError(null);
    try {
      const deleteFn = httpsCallable<DeleteCampaignData, CampaignActionResult>(functions, 'deleteCampaign');
      await deleteFn({ 
        campaignId: selectedCampaign.id, 
        organizationId: selectedCampaign.organizationId, 
        propertyId: selectedCampaign.propertyId 
      });
      // alert('Campaign deleted successfully!'); // TODO: Replace with Snackbar
      refreshCampaigns();
    } catch (err: unknown) {
      console.error("Error deleting campaign", err);
      if (isAppError(err)) {
        setActionError(err.message);
      } else {
        setActionError("Failed to delete campaign.");
      }
      // alert(`Error: ${err.message || "Failed to delete campaign."}`); // TODO: Replace with Snackbar
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

  // TODO: Implement Snackbar for actionError messages

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
  
  if (actionError) { // Display action errors prominently if they occur
    // This is a simple way; a Snackbar would be better.
    // setTimeout(() => setActionError(null), 5000); // Clear error after some time
    // return <Alert severity="error" sx={{mt: 2}}>{actionError}</Alert>; 
    // For now, let's log it and it will be handled by a potential global error handler/snackbar
    console.error("Action Error:", actionError); 
  }


  if (campaigns.length === 0) {
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
          {campaigns.map((campaign) => {

            return (
              <TableRow
                key={campaign.id}
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
                    onClick={(event) => handleMenuOpen(event, campaign)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Menu
        id={`actions-menu-${selectedCampaign?.id}`} // Ensure ID is unique if multiple menus could exist
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
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
            refreshCampaigns();
            setIsEditModalOpen(false);
            // alert("Campaign updated successfully!"); // TODO: Snackbar
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

    </TableContainer>
  );
};

export default CampaignsTable;
