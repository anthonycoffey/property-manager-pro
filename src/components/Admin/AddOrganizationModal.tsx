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
  onOrganizationCreated: (orgId: string) => void; // Callback after successful creation
}

const AddOrganizationModal: React.FC<AddOrganizationModalProps> = ({ open, onClose, onOrganizationCreated }) => {
  const { currentUser } = useAuth(); // Still needed for createdBy logic if desired, or just auth check
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed logoFile, logoPreview, uploadProgress states

  const resetForm = () => {
    setOrganizationName('');
    setError(null);
    // Removed logo related resets
  };

  const handleCloseDialog = () => {
    if (loading) return; // Prevent closing while loading
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      setError("Authentication error. Please sign in again.");
      return;
    }
    if (!organizationName.trim()) {
      setError("Organization name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    // Removed uploadProgress reset and tempLogoStoragePath

    try {
      // Logo upload logic removed

      const result = await createOrganizationCallable({
        organizationName: organizationName.trim(),
        // tempLogoStoragePath is no longer passed
      });

      const resultData = result.data as { success: boolean; message: string; organizationId?: string }; // Ensure Cloud Function returns this structure
      if (resultData.success && resultData.organizationId) {
        onOrganizationCreated(resultData.organizationId);
        handleCloseDialog(); // Resets form and closes
      } else {
        setError(resultData.message || "Failed to create organization.");
      }
    } catch (err: unknown) {
      console.error("Error creating organization:", err);
      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseDialog} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">Add New Organization</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{mb:2}}>
          Enter the details for the new organization.
        </DialogContentText>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
      {/* Logo related UI removed */}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} variant="outlined" color="error" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Create Organization"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddOrganizationModal;
