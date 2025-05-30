import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';

interface ConfirmDeleteCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  campaignName: string | undefined;
  campaignStatus: string | undefined;
  loading: boolean;
}

const ConfirmDeleteCampaignDialog: React.FC<ConfirmDeleteCampaignDialogProps> = ({
  open,
  onClose,
  onConfirm,
  campaignName,
  campaignStatus,
  loading,
}) => {
  const canDelete = campaignStatus === 'inactive';

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Campaign: {campaignName || 'Selected Campaign'}</DialogTitle>
      <DialogContent dividers>
        {!canDelete && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This campaign cannot be deleted because it is not inactive. Please deactivate it first.
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to permanently delete this campaign? 
          This action will remove the campaign and any associated pending or cancelled invitations. 
          Accepted and expired invitations will remain for historical purposes.
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          disabled={loading || !canDelete}
        >
          {loading ? <CircularProgress size={24} /> : 'Delete Permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeleteCampaignDialog;
