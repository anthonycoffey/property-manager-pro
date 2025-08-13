import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreatePropertyResponse, AppError } from '../../types';
import AddressAutocompleteInput, { type PropertyAddress } from './AddressAutocompleteInput';

import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export interface CreatePropertyFormProps {
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreatePropertyForm: React.FC<CreatePropertyFormProps> = ({
  organizationId,
  onSuccess,
  onCancel,
}) => {
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [addresses, setAddresses] = useState<PropertyAddress[]>([
    { street: '', city: '', state: '', zip: '' },
  ]);
  const [totalUnits, setTotalUnits] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const functionsInstance = getFunctions();
  const createPropertyFn = httpsCallable(functionsInstance, 'createProperty');

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Permission check might be handled by the parent component (Admin/PM panel)
    // Or, if this form is also used by PMs directly, we might need to check roles.
    // For now, assume the parent (Admin panel) ensures the user has rights for the given organizationId.
    if (!currentUser) {
      setError('Authentication required.');
      return;
    }
    if (!organizationId) {
      setError('Organization ID is missing.');
      return;
    }

    const primaryAddress = addresses[0];
    if (
      !propertyName ||
      !propertyType ||
      !primaryAddress.street ||
      !primaryAddress.city ||
      !primaryAddress.state ||
      !primaryAddress.zip ||
      !totalUnits
    ) {
      setError(
        'Property Name, Type, Total Units, and at least one full Address are required.'
      );
      return;
    }

    const parsedTotalUnits = parseInt(totalUnits, 10);
    if (isNaN(parsedTotalUnits) || parsedTotalUnits <= 0) {
      setError('Total Units must be a positive number.');
      return;
    }

    setLoading(true);

    try {
      const result = await createPropertyFn({
        propertyName,
        propertyType,
        address: addresses[0], // Primary address
        addresses: addresses, // Full list of addresses
        totalUnits: parsedTotalUnits,
        organizationId: organizationId,
      });

      const responseData = result.data as CreatePropertyResponse;

      if (responseData?.success) {
        setSuccess(`Property "${propertyName}" created successfully.`);
        setPropertyName('');
        setPropertyType('');
        setTotalUnits('');
        setAddresses([{ street: '', city: '', state: '', zip: '' }]);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(responseData?.message || 'Failed to create property.');
      }
    } catch (err) {
      console.error('Error creating property:', err);
      const appError = err as AppError;
      setError(appError.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Removed the direct permission check based on userRoles.includes('property_manager')
  return (
    <Box component='form' onSubmit={handleSubmit}>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Typography variant='subtitle1'>
        Property Details
      </Typography>

      <TextField
        label='Property Name'
        fullWidth
        value={propertyName}
        onChange={(e) => setPropertyName(e.target.value)}
        margin='normal'
        required
        disabled={loading}
      />
      <FormControl
        fullWidth
        margin='normal'
        required
        disabled={loading}
      >
        <InputLabel id='property-type-label'>Property Type</InputLabel>
        <Select
          labelId='property-type-label'
          id='property-type-select'
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
        fullWidth
        value={totalUnits}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '' || /^[1-9]\d*$/.test(val)) {
            setTotalUnits(val);
          }
        }}
        inputProps={{ min: 1 }}
        margin='normal'
        required
        disabled={loading}
      />

      <Typography variant='subtitle1' sx={{ mt: 2, mb: 1 }}>
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

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Property'}
        </Button>
        {onCancel && (
          <Button
            variant='outlined'
            color='error'
            onClick={onCancel}
            disabled={loading}
            // sx={{ mt: 3 }} // Adjusted by Stack spacing
          >
            Cancel
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default CreatePropertyForm;
