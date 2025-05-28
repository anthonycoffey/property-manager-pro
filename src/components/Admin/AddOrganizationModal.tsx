import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, CircularProgress, Alert
} from '@mui/material'; // Removed Box, Typography related to logo
import { httpsCallable } from 'firebase/functions';
// Storage imports no longer needed
import { functions } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';

const createOrganizationCallable = httpsCallable(functions, 'createOrganization');

interface AddOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  onOrganizationCreated?: (orgId: string) => void; // Callback after successful creation, now optional
  title?: string; // Optional title
  children?: React.ReactNode; // Optional children to render instead of the default form
}

const AddOrganizationModal: React.FC<AddOrganizationModalProps> = ({
  open,
  onClose,
  onOrganizationCreated,
  title,
  children,
}) => {
  const { currentUser } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed logoFile, logoPreview, uploadProgress states

  const resetForm = () => {
    setOrganizationName('');
    setError(null);
  };

  const handleCloseDialog = () => {
    if (loading && !children) return; // Prevent closing while loading if it's the internal form
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      setError('Authentication error. Please sign in again.');
      return;
    }
    if (!organizationName.trim()) {
      setError('Organization name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createOrganizationCallable({
        organizationName: organizationName.trim(),
      });

      const resultData = result.data as {
        success: boolean;
        message: string;
        organizationId?: string;
      };
      if (resultData.success && resultData.organizationId) {
        if (onOrganizationCreated) {
          onOrganizationCreated(resultData.organizationId);
        }
        handleCloseDialog();
      } else {
        setError(resultData.message || 'Failed to create organization.');
      }
    } catch (err: unknown) {
      console.error('Error creating organization:', err);
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If children are provided, render them directly within DialogContent.
  // The children are expected to manage their own form submission and actions.
  if (children) {
    return (
      <Dialog open={open} onClose={handleCloseDialog} aria-labelledby="form-dialog-title" maxWidth="md" fullWidth>
        <DialogTitle id="form-dialog-title">{title || 'Modal'}</DialogTitle>
        <DialogContent dividers>{children}</DialogContent>
        {/* Actions are expected to be part of the children, or a generic close button could be added here if needed */}
        {/* For now, assuming children like CreatePropertyForm include their own actions */}
      </Dialog>
    );
  }

  // Default behavior: Render the "Add New Organization" form
  return (
    <Dialog open={open} onClose={handleCloseDialog} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{title || 'Add New Organization'}</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>
          Enter the details for the new organization.
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          id="organizationName"
          label="Organization Name"
          type="text"
          fullWidth
          variant="outlined"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          required
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleCloseDialog}
          variant="outlined"
          color="error"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Create Organization'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddOrganizationModal;
