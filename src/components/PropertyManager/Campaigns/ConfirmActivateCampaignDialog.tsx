import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface ConfirmActivateCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaignName: string | undefined;
}

const ConfirmActivateCampaignDialog: React.FC<ConfirmActivateCampaignDialogProps> = ({
  open,
  onClose,
  onConfirm,
  campaignName,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reactivate Campaign?</DialogTitle>
      <DialogContent dividers>
        <DialogContentText>
          Are you sure you want to reactivate the campaign '{campaignName || ''}'?
          Reactivating will allow new sign-ups if the campaign is not expired and
          is within its usage limits. Any invitations that were previously
          cancelled due to deactivation will remain cancelled.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="error">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          Reactivate
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmActivateCampaignDialog;
