import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreatePropertyResponse, AppError } from '../../types';

// MUI Components
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

export interface CreatePropertyFormProps { // Exporting for potential use elsewhere
  onSuccess?: () => void; // Optional callback for when property creation is successful
}

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

const CreatePropertyForm: React.FC<CreatePropertyFormProps> = ({ onSuccess }) => {
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [address, setAddress] = useState<PropertyAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles: userRoles, organizationId: userOrgId } = useAuth();

  const usStates: string[] = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const functions = getFunctions();
  const createPropertyFn = httpsCallable(functions, 'createProperty');

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: unknown } }) => {
    setAddress({
      ...address,
      [event.target.name]: event.target.value as string,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !userRoles.includes('property_manager') || !userOrgId) {
      setError('Permission denied or organization information missing.');
      return;
    }

    if (!propertyName || !propertyType || !address.street || !address.city || !address.state || !address.zip) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const result = await createPropertyFn({
        propertyName,
        propertyType,
        address,
        // organizationId is implicitly taken from the caller's token in the Cloud Function
      });

      const responseData = result.data as CreatePropertyResponse;

      if (responseData?.success) {
        setSuccess(`Property "${propertyName}" created successfully. Property ID: ${responseData?.propertyId}`);
        setPropertyName('');
        setPropertyType('');
        setAddress({ street: '', city: '', state: '', zip: '' });
        if (onSuccess) {
          onSuccess(); // Call the success callback
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
  
  if (!currentUser || !userRoles.includes('property_manager')) {
    return <Alert severity="error">You do not have permission to access this feature.</Alert>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, maxWidth: '600px' }}>
      <Typography variant="h6" gutterBottom>
        Create New Property
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <TextField
        label="Property Name"
        fullWidth
        value={propertyName}
        onChange={(e) => setPropertyName(e.target.value)}
        margin="normal"
        required
        disabled={loading}
      />
      <TextField
        label="Property Type"
        fullWidth
        value={propertyType}
        onChange={(e) => setPropertyType(e.target.value)}
        margin="normal"
        required
        disabled={loading}
        helperText="e.g., Residential, Commercial"
      />
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Property Address</Typography>
      {/* Street Address Field - Full width */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Street Address"
          name="street"
          fullWidth
          value={address.street}
          onChange={handleAddressChange}
          required
          disabled={loading}
        />
      </Box>
      {/* Row for City, State, Zip */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="City"
          name="city"
          fullWidth
          value={address.city}
          onChange={handleAddressChange}
          required
          disabled={loading}
          sx={{ flexGrow: 1 }}
        />
        <FormControl fullWidth required sx={{ flexGrow: 1 }}>
          <InputLabel id="state-select-label">State</InputLabel>
          <Select
            labelId="state-select-label"
            id="state-select"
            name="state"
            value={address.state}
            label="State"
            onChange={handleAddressChange}
            disabled={loading}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 224, 
                },
              },
            }}
          >
            {usStates.map((stateName) => (
              <MenuItem key={stateName} value={stateName}>
                {stateName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="ZIP Code"
          name="zip"
          fullWidth
          value={address.zip}
          onChange={handleAddressChange}
          required
          disabled={loading}
          sx={{ flexGrow: 1 }}
        />
      </Stack>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ mt: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Create Property'}
      </Button>
    </Box>
  );
};

export default CreatePropertyForm;
