import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface DeleteOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  organizationName: string;
}

const DeleteOrganizationDialog: React.FC<DeleteOrganizationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  organizationName,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent dividers>
        <DialogContentText>
          Are you sure you want to permanently delete <b>{organizationName}</b>?{' '}
          <Alert severity='warning' sx={{ mt: 2 }}>
            This action cannot be undone. All organization data will be deleted.
          </Alert>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant='outlined' color='error'>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant='contained' color='error' autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteOrganizationDialog;
