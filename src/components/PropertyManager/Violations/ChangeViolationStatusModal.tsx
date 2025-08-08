import { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import type { Violation, ViolationStatus } from '../../../types';
import { updateViolationStatus } from '../../../lib/violationsService';

interface ChangeViolationStatusModalProps {
  open: boolean;
  onClose: () => void;
  violation: Violation | null;
  onStatusChanged: () => void;
}

const availableStatuses: ViolationStatus[] = [
  'reported',
  'claimed',
  'acknowledged',
  'resolved',
  'pending_tow',
  'towed',
];

const ChangeViolationStatusModal = ({
  open,
  onClose,
  violation,
  onStatusChanged,
}: ChangeViolationStatusModalProps) => {
  const [newStatus, setNewStatus] = useState<ViolationStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async () => {
    if (!violation || !newStatus) return;

    setLoading(true);
    setError(null);

    try {
      await updateViolationStatus(
        violation.id,
        newStatus,
        violation.organizationId,
        violation.propertyId
      );
      onStatusChanged();
      onClose();
    } catch (err) {
      setError('Failed to update violation status. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" component="h2">
          Change Violation Status
        </Typography>
        {violation && (
          <Typography sx={{ mt: 2 }}>
            Current Status: <strong>{violation.status.toUpperCase()}</strong>
          </Typography>
        )}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={newStatus}
            label="New Status"
            onChange={(e) => setNewStatus(e.target.value as ViolationStatus)}
          >
            {availableStatuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status.replace(/_/g, ' ').toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            disabled={loading || !newStatus}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ChangeViolationStatusModal;
