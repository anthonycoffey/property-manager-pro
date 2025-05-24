import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  CircularProgress, Alert, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import type { Organization } from './OrganizationManagementPanel'; // Changed to type-only import

// It's good practice to define the expected request and response types for callable functions.
interface UpdateOrganizationRequest {
  organizationId: string;
  name: string;
  status: string;
}

interface UpdateOrganizationResponse {
  success: boolean;
  message: string;
  organizationId?: string; // Optional: if you want to confirm which org was updated
}

// Define the callable function once
const updateOrganizationCallable = httpsCallable<UpdateOrganizationRequest, UpdateOrganizationResponse>(functions, 'updateOrganization');

interface EditOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  onOrganizationUpdated: (updatedOrgData: Partial<Organization>) => void;
}

const EditOrganizationModal: React.FC<EditOrganizationModalProps> = ({ open, onClose, organization, onOrganizationUpdated }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(''); // e.g., 'active', 'inactive', 'suspended'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setStatus(organization.status || 'active'); // Default to 'active' if status is not set
    } else {
      // Reset form if no organization is provided (e.g., modal closed and reopened without new data)
      setName('');
      setStatus('active');
    }
  }, [organization, open]); // Rerun effect if organization or open state changes

  const handleCloseDialog = () => {
    if (loading) return;
    // No need to reset form here as useEffect handles it based on `organization` prop
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organization) {
      setError("No organization selected for editing.");
      return;
    }
    if (!name.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (!status.trim()) {
        setError("Organization status is required.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateOrganizationCallable({
        organizationId: organization.id,
        name: name.trim(),
        status: status.trim(),
      });

      if (result.data.success) {
        onOrganizationUpdated({ id: organization.id, name: name.trim(), status: status.trim() });
        handleCloseDialog();
      } else {
        setError(result.data.message || "Failed to update organization.");
      }
    } catch (err: any) {
      console.error("Error updating organization:", err);
      setError(err.message || "An unexpected error occurred while updating the organization.");
    } finally {
      setLoading(false);
    }
  };

  // Available statuses - could be fetched or configured elsewhere
  const availableStatuses = ['active', 'inactive', 'suspended', 'trial'];

  return (
    <Dialog open={open} onClose={handleCloseDialog} aria-labelledby="edit-organization-dialog-title">
      <DialogTitle id="edit-organization-dialog-title">Edit Organization</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          id="organizationName"
          label="Organization Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth margin="dense" disabled={loading}>
          <InputLabel id="organizationStatusLabel">Status</InputLabel>
          <Select
            labelId="organizationStatusLabel"
            id="organizationStatus"
            value={status}
            label="Status"
            onChange={(e) => setStatus(e.target.value)}
            variant="outlined"
          >
            {availableStatuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditOrganizationModal;
