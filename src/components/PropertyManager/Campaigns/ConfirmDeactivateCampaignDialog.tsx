import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  CircularProgress,
} from '@mui/material';

interface ConfirmDeactivateCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  campaignName: string | undefined;
  loading: boolean;
}

const ConfirmDeactivateCampaignDialog: React.FC<ConfirmDeactivateCampaignDialogProps> = ({
  open,
  onClose,
  onConfirm,
  campaignName,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Deactivate Campaign: {campaignName || 'Selected Campaign'}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText>
          Are you sure you want to deactivate this campaign? 
          Deactivating will prevent new sign-ups and cancel any pending invitations associated with it. 
          This action can be reversed if needed.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="warning" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Deactivate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeactivateCampaignDialog;
