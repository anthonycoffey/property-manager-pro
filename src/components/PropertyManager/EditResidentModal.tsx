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
  Typography,
  IconButton,
  Box,
  Stack, // Added Stack
  Divider, // Added Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  ContactPhone,
  DeleteOutline as DeleteOutlineIcon,
  DirectionsCar as DirectionsCarIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { functions } from '../../firebaseConfig';
import type { Resident, AppError, Vehicle } from '../../types'; // Added Vehicle

interface EditResidentModalProps {
  open: boolean;
  onClose: () => void;
  residentData: Resident | null;
  organizationId: string;
  propertyId: string;
  onSuccess: () => void;
}

interface FirestoreTimestampLike {
  seconds: number;
  nanoseconds: number;
}

const convertToDateOrNull = (
  field?: Timestamp | Date | FirestoreTimestampLike | string | number | null
): Date | null => {
  if (!field) return null;
  if (field instanceof Timestamp) return field.toDate();
  if (field instanceof Date) return field;
  if (
    typeof field === 'object' &&
    'seconds' in field &&
    'nanoseconds' in field &&
    typeof (field as FirestoreTimestampLike).seconds === 'number' &&
    typeof (field as FirestoreTimestampLike).nanoseconds === 'number'
  ) {
    const tsLike = field as FirestoreTimestampLike;
    return new Timestamp(tsLike.seconds, tsLike.nanoseconds).toDate();
  }
  if (typeof field === 'string' || typeof field === 'number') {
    const d = new Date(field);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

// Define a type for formData to include vehicles explicitly
// All fields from Resident should be optional, except vehicles which is required for the form's state.
// Explicitly type fields managed directly by the form state for better type safety.
interface ResidentFormData
  extends Omit<
    Partial<Resident>,
    | 'displayName'
    | 'address'
    | 'leaseStartDate'
    | 'leaseEndDate'
    | 'vehicles'
  > {
  displayName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    unit: string;
  };
  leaseStartDate: Date | null;
  leaseEndDate: Date | null;
  vehicles: Vehicle[]; // vehicles is required in the form state, even if empty
}

const EditResidentModal: React.FC<EditResidentModalProps> = ({
  open,
  onClose,
  residentData,
  organizationId,
  propertyId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<ResidentFormData>({
    displayName: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      unit: '',
    },
    leaseStartDate: null,
    leaseEndDate: null,
    vehicles: [],
  });
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
        address: {
          street: residentData.address?.street || '',
          city: residentData.address?.city || '',
          state: residentData.address?.state || '',
          zip: residentData.address?.zip || '',
          unit: residentData.address?.unit || '',
        },
        leaseStartDate: convertToDateOrNull(residentData.leaseStartDate),
        leaseEndDate: convertToDateOrNull(residentData.leaseEndDate),
        vehicles: Array.isArray(residentData.vehicles)
          ? JSON.parse(JSON.stringify(residentData.vehicles)) // Deep copy
          : [],
      });
    } else if (!open) {
      setFormData({
        displayName: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          unit: '',
        },
        leaseStartDate: null,
        leaseEndDate: null,
        vehicles: [],
      });
      setError(null);
    }
  }, [residentData, open]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (
    name: 'leaseStartDate' | 'leaseEndDate',
    newValue: Date | null
  ) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleVehicleChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    const updatedVehicles = [...formData.vehicles];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [name]:
        name === 'year' ? (value === '' ? 0 : parseInt(value, 10)) : value,
    };
    setFormData((prev) => ({ ...prev, vehicles: updatedVehicles }));
  };

  const handleAddVehicle = () => {
    if (formData.vehicles.length < 2) {
      const newVehicle: Vehicle = {
        make: '',
        model: '',
        year: 0,
        color: '',
        plate: '',
      };
      setFormData((prev) => ({
        ...prev,
        vehicles: [...prev.vehicles, newVehicle],
      }));
    }
  };

  const handleRemoveVehicle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      vehicles: formData.vehicles.filter((_, i) => i !== index),
    }));
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!residentData?.id) {
      // Ensure residentData and its id are present
      setError('Resident data or ID is missing.');
      return;
    }

    // Client-side validation for vehicles
    for (const vehicle of formData.vehicles) {
      if (
        !vehicle.make ||
        !vehicle.model ||
        !vehicle.year ||
        !vehicle.color ||
        !vehicle.plate
      ) {
        setError(
          'All fields (make, model, year, color, plate) for each vehicle are required.'
        );
        return;
      }
      if (
        isNaN(vehicle.year) ||
        vehicle.year < 1900 ||
        vehicle.year > new Date().getFullYear() + 2
      ) {
        setError(
          `Invalid year for vehicle: ${vehicle.make} ${vehicle.model}. Please enter a valid year.`
        );
        return;
      }
    }

    const updatedDetails: Partial<Resident> = {};
    let changed = false;

    // Compare and collect changed non-vehicle fields
    if (
      formData.displayName !== undefined &&
      formData.displayName !== (residentData.displayName || '')
    ) {
      updatedDetails.displayName = formData.displayName;
      changed = true;
    }
    if (
      JSON.stringify(formData.address) !==
      JSON.stringify(residentData.address || {})
    ) {
      updatedDetails.address = formData.address;
      changed = true;
    }

    const originalStartDateJs = convertToDateOrNull(
      residentData.leaseStartDate
    );
    const originalEndDateJs = convertToDateOrNull(residentData.leaseEndDate);

    if (Object.prototype.hasOwnProperty.call(formData, 'leaseStartDate')) {
      const newStartDateValue = formData.leaseStartDate;
      if (newStartDateValue === null) {
        if (originalStartDateJs !== null) {
          updatedDetails.leaseStartDate = null;
          changed = true;
        }
      } else if (newStartDateValue instanceof Date) {
        if (
          !originalStartDateJs ||
          newStartDateValue.getTime() !== originalStartDateJs.getTime()
        ) {
          updatedDetails.leaseStartDate = Timestamp.fromDate(newStartDateValue);
          changed = true;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(formData, 'leaseEndDate')) {
      const newEndDateValue = formData.leaseEndDate;
      if (newEndDateValue === null) {
        if (originalEndDateJs !== null) {
          updatedDetails.leaseEndDate = null;
          changed = true;
        }
      } else if (newEndDateValue instanceof Date) {
        if (
          !originalEndDateJs ||
          newEndDateValue.getTime() !== originalEndDateJs.getTime()
        ) {
          updatedDetails.leaseEndDate = Timestamp.fromDate(newEndDateValue);
          changed = true;
        }
      }
    }

    // Compare vehicle data
    const originalVehicles = Array.isArray(residentData.vehicles)
      ? residentData.vehicles
      : [];
    if (
      JSON.stringify(formData.vehicles) !== JSON.stringify(originalVehicles)
    ) {
      updatedDetails.vehicles = formData.vehicles.map((v) => ({
        ...v,
        year: Number(v.year) || 0,
      }));
      changed = true;
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
      'updateResidentDetails'
    );
    try {
      await updateResidentFunction({
        organizationId,
        propertyId,
        residentId: residentData.id, // Use residentData.id
        updatedData: updatedDetails,
      });
      setSnackbarMessage('Resident details updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess(); // This will trigger a refetch in the parent component
      onClose(); // Close modal on success
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack
                direction='row'
                spacing={2}
                alignItems='center'
                sx={{ mt: 1 }}
              >
                <ContactPhone color='primary' />
                <Typography variant='h6'>Contact Information</Typography>
              </Stack>
              {/* Increased gap for main sections */}
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
                  label='Email'
                  name='email'
                  value={residentData?.email || ''}
                  fullWidth
                  margin='dense'
                  disabled
                  slotProps={{
                    input: { readOnly: true },
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
                  label='Street Address'
                  name='address.street'
                  value={formData.address.street || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label='City'
                  name='address.city'
                  value={formData.address.city || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
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
                  label='State'
                  name='address.state'
                  value={formData.address.state || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label='Zip Code'
                  name='address.zip'
                  value={formData.address.zip || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label='Unit'
                  name='address.unit'
                  value={formData.address.unit || ''}
                  onChange={handleInputChange}
                  fullWidth
                  margin='dense'
                  disabled={loading}
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
                <DatePicker
                  label='Lease Start Date'
                  value={formData.leaseStartDate}
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
                  value={formData.leaseEndDate}
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
                <Box sx={{ flex: 1 }} /> {/* Spacer */}
              </Box>
              <Divider sx={{ my: 2 }} />
              {/* Vehicle Information Section */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DirectionsCarIcon sx={{ mr: 2 }} color='primary' />
                  <Stack>
                    <Typography variant='h6'>Vehicle Information</Typography>
                    <Typography variant='subtitle2'>Limit: 2</Typography>
                  </Stack>
                </Box>
                {formData.vehicles.length < 2 && (
                  <Button
                    variant='outlined'
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddVehicle}
                    disabled={loading || formData.vehicles.length >= 2}
                    size='small'
                  >
                    Add Vehicle
                  </Button>
                )}
              </Box>
              <Stack spacing={3}>
                {formData.vehicles.map((vehicle, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                    }}
                  >
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant='subtitle1'>
                          Vehicle {index + 1}
                        </Typography>
                        <IconButton
                          onClick={() => handleRemoveVehicle(index)}
                          color='error'
                          size='small'
                          disabled={loading}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        fullWidth
                        name='make'
                        label='Make'
                        value={vehicle.make}
                        onChange={(e) => handleVehicleChange(index, e)}
                        disabled={loading}
                        required
                        margin='dense'
                      />
                      <TextField
                        fullWidth
                        name='model'
                        label='Model'
                        value={vehicle.model}
                        onChange={(e) => handleVehicleChange(index, e)}
                        disabled={loading}
                        required
                        margin='dense'
                      />
                      <TextField
                        fullWidth
                        name='year'
                        label='Year'
                        type='number'
                        value={vehicle.year === 0 ? '' : vehicle.year}
                        onChange={(e) => handleVehicleChange(index, e)}
                        disabled={loading}
                        required
                        margin='dense'
                        InputProps={{
                          inputProps: {
                            min: 1900,
                            max: new Date().getFullYear() + 2,
                          },
                        }}
                      />
                      <TextField
                        fullWidth
                        name='color'
                        label='Color'
                        value={vehicle.color}
                        onChange={(e) => handleVehicleChange(index, e)}
                        disabled={loading}
                        required
                        margin='dense'
                      />
                      <TextField
                        fullWidth
                        name='plate'
                        label='License Plate'
                        value={vehicle.plate}
                        onChange={(e) => handleVehicleChange(index, e)}
                        disabled={loading}
                        required
                        margin='dense'
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button
              onClick={onClose}
              variant='outlined'
              color='secondary'
              disabled={loading}
            >
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
