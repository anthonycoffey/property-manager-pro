import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  // Grid, // Removing Grid
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { functions } from '../../firebaseConfig';
import type { Resident, AppError } from '../../types';

interface EditResidentModalProps {
  open: boolean;
  onClose: () => void;
  residentData: Resident | null;
  organizationId: string;
  propertyId: string;
  onSuccess: () => void;
}

// Define helper and interface at module scope
interface FirestoreTimestampLike {
  seconds: number;
  nanoseconds: number;
}

const convertToDateOrNull = (
  field?: Timestamp | Date | FirestoreTimestampLike | string | number | null
): Date | null => {
  if (!field) return null; // Handles null and undefined by returning null
  if (field instanceof Timestamp) return field.toDate();
  if (field instanceof Date) return field;

  // Check for Firestore Timestamp-like plain object
  if (
    typeof field === 'object' && // Already checked not null by !field
    'seconds' in field && // Check if properties exist
    'nanoseconds' in field &&
    typeof (field as FirestoreTimestampLike).seconds === 'number' && // Then assert and check type
    typeof (field as FirestoreTimestampLike).nanoseconds === 'number'
  ) {
    const tsLike = field as FirestoreTimestampLike;
    return new Timestamp(tsLike.seconds, tsLike.nanoseconds).toDate();
  }

  // Try to parse if it's a string or number
  if (typeof field === 'string' || typeof field === 'number') {
    const d = new Date(field);
    if (!isNaN(d.getTime())) return d;
  }
  return null; // Return null if parsing failed or type not matched
};

const EditResidentModal: React.FC<EditResidentModalProps> = ({
  open,
  onClose,
  residentData,
  organizationId,
  propertyId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<Resident>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info'
  >('success');

  useEffect(() => {
    if (residentData && open) {
      setFormData({
        displayName: residentData.displayName || '',
        unitNumber: residentData.unitNumber || '',
        leaseStartDate: convertToDateOrNull(residentData.leaseStartDate),
        leaseEndDate: convertToDateOrNull(residentData.leaseEndDate),
        vehicleMake: residentData.vehicleMake || '',
        vehicleModel: residentData.vehicleModel || '',
        vehicleColor: residentData.vehicleColor || '',
        licensePlate: residentData.licensePlate || '',
      });
    } else if (!open) {
      setFormData({});
      setError(null);
    }
  }, [residentData, open]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (
    name: 'leaseStartDate' | 'leaseEndDate',
    newValue: Date | null
  ) => {
    // newValue is Date | null from DatePicker.
    // formData state for dates should be Date | null.
    // Resident type now allows null for dates.
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!residentData) {
      setError('Resident data is missing.');
      return;
    }

    const updatedDetails: Partial<Resident> = {};
    let changed = false;

    // Compare and collect changed fields
    if (
      formData.displayName !== undefined &&
      formData.displayName !== residentData.displayName
    ) {
      updatedDetails.displayName = formData.displayName;
      changed = true;
    }
    if (
      formData.unitNumber !== undefined &&
      formData.unitNumber !== (residentData.unitNumber || '')
    ) {
      updatedDetails.unitNumber = formData.unitNumber;
      changed = true;
    }
    if (
      formData.vehicleMake !== undefined &&
      formData.vehicleMake !== (residentData.vehicleMake || '')
    ) {
      updatedDetails.vehicleMake = formData.vehicleMake;
      changed = true;
    }
    if (
      formData.vehicleModel !== undefined &&
      formData.vehicleModel !== (residentData.vehicleModel || '')
    ) {
      updatedDetails.vehicleModel = formData.vehicleModel;
      changed = true;
    }
    if (
      formData.vehicleColor !== undefined &&
      formData.vehicleColor !== (residentData.vehicleColor || '')
    ) {
      updatedDetails.vehicleColor = formData.vehicleColor;
      changed = true;
    }
    if (
      formData.licensePlate !== undefined &&
      formData.licensePlate !== (residentData.licensePlate || '')
    ) {
      updatedDetails.licensePlate = formData.licensePlate;
      changed = true;
    }

    // Date comparison is more complex
    // originalStartDateJs and originalEndDateJs will be Date | null
    const originalStartDateJs = convertToDateOrNull(residentData.leaseStartDate);
    const originalEndDateJs = convertToDateOrNull(residentData.leaseEndDate);

    // Handle leaseStartDate
    if (Object.prototype.hasOwnProperty.call(formData, 'leaseStartDate')) {
      // newStartDateValue is Date | null from formData state (via handleDateChange)
      const newStartDateValue = formData.leaseStartDate as Date | null | undefined; // Cast to include undefined due to Partial<Resident>

      if (newStartDateValue === null) { // Date was explicitly cleared
        if (originalStartDateJs !== null) { // It was cleared from a previously set value
          updatedDetails.leaseStartDate = null; 
          changed = true;
        }
      } else if (newStartDateValue instanceof Date) { // It's a valid Date object
        if (!originalStartDateJs || newStartDateValue.getTime() !== originalStartDateJs.getTime()) {
          updatedDetails.leaseStartDate = Timestamp.fromDate(newStartDateValue);
          changed = true;
        }
      }
      // If newStartDateValue is undefined (field not touched), this block is skipped by hasOwnProperty
    }

    // Handle leaseEndDate
    if (Object.prototype.hasOwnProperty.call(formData, 'leaseEndDate')) {
      const newEndDateValue = formData.leaseEndDate as Date | null | undefined;

      if (newEndDateValue === null) {
        if (originalEndDateJs !== null) {
          updatedDetails.leaseEndDate = null;
          changed = true;
        }
      } else if (newEndDateValue instanceof Date) {
        if (!originalEndDateJs || newEndDateValue.getTime() !== originalEndDateJs.getTime()) {
          updatedDetails.leaseEndDate = Timestamp.fromDate(newEndDateValue);
          changed = true;
        }
      }
    }

    if (!changed) {
      setSnackbarMessage('No changes detected.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      onClose();
      return;
    }

    setLoading(true);

    const updateResidentFunction = httpsCallable(
      functions,
      'updateResidentDetailsByPm'
    );
    try {
      await updateResidentFunction({
        organizationId,
        propertyId,
        residentId: residentData.id,
        updatedData: updatedDetails,
      });
      setSnackbarMessage('Resident details updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess();
    } catch (err: unknown) {
      const castError = err as AppError;
      setError(castError.message || 'Failed to update resident details.');
      setSnackbarMessage(
        castError.message || 'Failed to update resident details.'
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // formatDateForInput is no longer needed for DatePicker

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
        <DialogTitle>
          Edit Resident: {residentData?.displayName || ''}
          <IconButton
            aria-label='close'
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {/* Using Box with flexbox instead of Grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                }}
              >
                <TextField
                  label='Display Name'
                  name='displayName'
                  value={formData.displayName || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  margin='dense'
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label='Email (Read-only)'
                  name='email'
                  value={residentData?.email || ''}
                  fullWidth
                  margin='dense'
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                }}
              >
                <TextField
                  label='Unit Number'
                  name='unitNumber'
                  value={formData.unitNumber || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <DatePicker
                  label='Lease Start Date'
                  value={(formData.leaseStartDate as Date | null | undefined) || null}
                  onChange={(newValue) =>
                    handleDateChange('leaseStartDate', newValue)
                  }
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'dense',
                      sx: { flex: 1 },
                    },
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                }}
              >
                <DatePicker
                  label='Lease End Date'
                  value={(formData.leaseEndDate as Date | null | undefined) || null}
                  onChange={(newValue) =>
                    handleDateChange('leaseEndDate', newValue)
                  }
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'dense',
                      sx: { flex: 1 },
                    },
                  }}
                />
                <Box sx={{ flex: 1 }} />{' '}
                {/* Spacer to balance the row if only one item */}
              </Box>

              <Typography variant='subtitle1' sx={{ mt: 3, mb: 1 }}>
                Vehicle Information
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <TextField
                  label='Vehicle Make'
                  name='vehicleMake'
                  value={formData.vehicleMake || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{
                    flexBasis: {
                      xs: '100%',
                      sm: 'calc(50% - 8px)',
                      md: 'calc(25% - 12px)',
                    },
                    flexGrow: 1,
                  }}
                />
                <TextField
                  label='Vehicle Model'
                  name='vehicleModel'
                  value={formData.vehicleModel || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{
                    flexBasis: {
                      xs: '100%',
                      sm: 'calc(50% - 8px)',
                      md: 'calc(25% - 12px)',
                    },
                    flexGrow: 1,
                  }}
                />
                <TextField
                  label='Vehicle Color'
                  name='vehicleColor'
                  value={formData.vehicleColor || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{
                    flexBasis: {
                      xs: '100%',
                      sm: 'calc(50% - 8px)',
                      md: 'calc(25% - 12px)',
                    },
                    flexGrow: 1,
                  }}
                />
                <TextField
                  label='License Plate'
                  name='licensePlate'
                  value={formData.licensePlate || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{
                    flexBasis: {
                      xs: '100%',
                      sm: 'calc(50% - 8px)',
                      md: 'calc(25% - 12px)',
                    },
                    flexGrow: 1,
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={onClose} variant="outlined" color="error" disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' variant='contained' disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default EditResidentModal;
