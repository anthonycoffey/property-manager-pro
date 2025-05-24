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

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

const CreatePropertyForm: React.FC = () => {
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

  const functions = getFunctions();
  const createPropertyFn = httpsCallable(functions, 'createProperty');

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({
      ...address,
      [event.target.name]: event.target.value,
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
      <Box display="flex" sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        {/* City Field: xs=12, sm=6 */}
        <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
          <TextField
            label="City"
            name="city"
            fullWidth
            value={address.city}
            onChange={handleAddressChange}
            required
            disabled={loading}
          />
        </Box>
        {/* Container for State and Zip: xs=12, sm=6 */}
        <Box display="flex" sx={{ width: { xs: '100%', sm: '50%' }, gap: 2 }}>
          {/* State Field: xs=6 (of 12), sm=3 (of 12) -> 50% of its container */}
          <Box sx={{ width: { xs: '50%', sm: '50%' } }}>
            <TextField
              label="State"
              name="state"
              fullWidth
              value={address.state}
              onChange={handleAddressChange}
              required
              disabled={loading}
            />
          </Box>
          {/* Zip Field: xs=6 (of 12), sm=3 (of 12) -> 50% of its container */}
          <Box sx={{ width: { xs: '50%', sm: '50%' } }}>
            <TextField
              label="ZIP Code"
              name="zip"
              fullWidth
              value={address.zip}
              onChange={handleAddressChange}
              required
              disabled={loading}
            />
          </Box>
        </Box>
      </Box>
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
