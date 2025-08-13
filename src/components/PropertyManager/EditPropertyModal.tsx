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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Divider,
  IconButton,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import type { Property, AppError } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import AddressAutocompleteInput, { type PropertyAddress } from './AddressAutocompleteInput';

interface EditPropertyModalProps {
  open: boolean;
  onClose: () => void;
  propertyData: Property | null;
  onSuccess: () => void;
  organizationId?: string;
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  open,
  onClose,
  propertyData,
  onSuccess,
  organizationId: propOrganizationId,
}) => {
  const { currentUser, organizationId: authUserOrganizationId } = useAuth();
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [addresses, setAddresses] = useState<PropertyAddress[]>([]);
  const [totalUnits, setTotalUnits] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    if (propertyData && open) {
      setName(propertyData.name || '');
      setPropertyType(propertyData.type || '');
      setTotalUnits(propertyData.totalUnits?.toString() || '');
      // Ensure there's at least one address field to show
      const initialAddresses = propertyData.addresses && propertyData.addresses.length > 0
        ? propertyData.addresses
        : [{ street: '', city: '', state: '', zip: '' }];
      setAddresses(initialAddresses);
    } else if (!open) {
      // Reset form when modal is closed
      setName('');
      setPropertyType('');
      setTotalUnits('');
      setAddresses([]);
      setError(null);
    }
  }, [propertyData, open]);

  const handleAddressChange = (index: number, newAddress: PropertyAddress) => {
    const updatedAddresses = [...addresses];
    updatedAddresses[index] = newAddress;
    setAddresses(updatedAddresses);
  };

  const addAddress = () => {
    setAddresses([...addresses, { street: '', city: '', state: '', zip: '' }]);
  };

  const removeAddress = (index: number) => {
    if (addresses.length > 1) {
      const updatedAddresses = [...addresses];
      updatedAddresses.splice(index, 1);
      setAddresses(updatedAddresses);
    }
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const targetOrganizationId = propOrganizationId || authUserOrganizationId;

    if (!propertyData || !currentUser || !targetOrganizationId) {
      setError('Property data, user, or organization information is missing.');
      setSnackbarMessage('Property data, user, or organization information is missing.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const primaryAddress = addresses[0];
    if (!name || !propertyType || !primaryAddress?.street || !primaryAddress?.city || !primaryAddress?.state || !primaryAddress?.zip || !totalUnits) {
      setSnackbarMessage('All fields including Total Units and at least one full address are required.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const parsedTotalUnits = parseInt(totalUnits, 10);
    if (isNaN(parsedTotalUnits) || parsedTotalUnits <= 0) {
      setSnackbarMessage('Total Units must be a positive number.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    const updatedPropertyDetails: Partial<Property> = {};
    if (name !== propertyData.name) {
      updatedPropertyDetails.name = name;
    }
    if (propertyType !== propertyData.type) {
      updatedPropertyDetails.type = propertyType;
    }
    if (parsedTotalUnits !== (propertyData.totalUnits ?? 0)) {
      updatedPropertyDetails.totalUnits = parsedTotalUnits;
    }

    const originalAddresses = propertyData.addresses || [];
    if (JSON.stringify(addresses) !== JSON.stringify(originalAddresses)) {
      updatedPropertyDetails.addresses = addresses;
      updatedPropertyDetails.address = addresses[0];
    }

    if (Object.keys(updatedPropertyDetails).length === 0) {
      setSnackbarMessage('No changes detected.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      setLoading(false);
      onClose(); // Close modal if no changes
      return;
    }

    const updatePropertyFunction = httpsCallable(functions, 'updateProperty');
    try {
      await updatePropertyFunction({
        organizationId: targetOrganizationId,
        propertyId: propertyData.id,
        updatedData: updatedPropertyDetails,
      });
      setSnackbarMessage('Property updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess(); // This will typically close the modal and refresh data
    } catch (err: unknown) {
      const castError = err as AppError;
      setError(castError.message || 'Failed to update property.');
      setSnackbarMessage(castError.message || 'Failed to update property.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
        <DialogTitle>
          Edit Property: {propertyData?.name || ''}
          <IconButton
            aria-label='close'
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 1 }} dividers>
            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
            <Typography variant='subtitle1' sx={{ mt: 2 }}>Property Details</Typography>
            <TextField
              label='Property Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin='dense'
              disabled={loading}
            />
            <FormControl fullWidth margin='dense' required disabled={loading}>
              <InputLabel id='edit-property-type-label'>Property Type</InputLabel>
              <Select
                labelId='edit-property-type-label'
                value={propertyType}
                label='Property Type'
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <MenuItem value='Residential'>Residential</MenuItem>
                <MenuItem value='Commercial'>Commercial</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='Total Units'
              type='number'
              value={totalUnits}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^[1-9]\d*$/.test(val)) {
                  setTotalUnits(val);
                }
              }}
              inputProps={{ min: 1 }}
              fullWidth
              required
              margin='dense'
              disabled={loading}
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle1' sx={{ mb: 1 }}>
              Property Addresses
            </Typography>
            {addresses.map((addr, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                <AddressAutocompleteInput
                  label={index === 0 ? 'Primary Address' : `Additional Address ${index + 1}`}
                  initialAddress={addr}
                  onAddressChange={(newAddress) => handleAddressChange(index, newAddress)}
                  disabled={loading}
                />
                {addresses.length > 1 && (
                  <IconButton onClick={() => removeAddress(index)} color="error" disabled={loading}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button onClick={addAddress} disabled={loading}>
              Add Another Address
            </Button>
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={onClose} variant="outlined" color="error">Cancel</Button>
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
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EditPropertyModal;
