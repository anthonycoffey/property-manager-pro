import React, { useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { LoadScript, Autocomplete } from '@react-google-maps/api';
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
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // US States with abbreviations for consistency with Google Places API
  const usStatesAndAbbrevs = [
    { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' }, { name: 'Arizona', code: 'AZ' },
    { name: 'Arkansas', code: 'AR' }, { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
    { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' }, { name: 'Florida', code: 'FL' },
    { name: 'Georgia', code: 'GA' }, { name: 'Hawaii', code: 'HI' }, { name: 'Idaho', code: 'ID' },
    { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' }, { name: 'Iowa', code: 'IA' },
    { name: 'Kansas', code: 'KS' }, { name: 'Kentucky', code: 'KY' }, { name: 'Louisiana', code: 'LA' },
    { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' }, { name: 'Massachusetts', code: 'MA' },
    { name: 'Michigan', code: 'MI' }, { name: 'Minnesota', code: 'MN' }, { name: 'Mississippi', code: 'MS' },
    { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' }, { name: 'Nebraska', code: 'NE' },
    { name: 'Nevada', code: 'NV' }, { name: 'New Hampshire', code: 'NH' }, { name: 'New Jersey', code: 'NJ' },
    { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' }, { name: 'North Carolina', code: 'NC' },
    { name: 'North Dakota', code: 'ND' }, { name: 'Ohio', code: 'OH' }, { name: 'Oklahoma', code: 'OK' },
    { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' }, { name: 'Rhode Island', code: 'RI' },
    { name: 'South Carolina', code: 'SC' }, { name: 'South Dakota', code: 'SD' }, { name: 'Tennessee', code: 'TN' },
    { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' }, { name: 'Vermont', code: 'VT' },
    { name: 'Virginia', code: 'VA' }, { name: 'Washington', code: 'WA' }, { name: 'West Virginia', code: 'WV' },
    { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' }
  ];


  const functions = getFunctions();
  const createPropertyFn = httpsCallable(functions, 'createProperty');

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let postalCode = '';

        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name; // Using short_name for state (e.g., "CA")
          }
          if (types.includes('postal_code')) {
            postalCode = component.long_name;
          }
        });
        
        const fullStreet = streetNumber ? `${streetNumber} ${route}` : route;

        setAddress({
          street: fullStreet,
          city: city,
          state: state, // This will be the short code, e.g., "CA"
          zip: postalCode,
        });
      } else {
        console.warn("Autocomplete place result does not have address_components");
        // Potentially clear fields or keep existing street input if user typed something not autocompleted
        // For now, we'll rely on the user typing into the street field directly if autocomplete fails.
      }
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

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

  // Ensure VITE_GOOGLE_MAPS_API_KEY is available
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.");
    return <Alert severity="error">Google Maps API key is missing. Address autocompletion will not work.</Alert>;
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
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
      {/* Street Address Field - Full width with Autocomplete */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ["address"], // Restrict to address types
            componentRestrictions: { country: "us" }, // Optional: restrict to US
          }}
        >
          <TextField
            label="Street Address (Type to search)"
            name="street"
            fullWidth
            value={address.street}
            onChange={handleAddressChange} // Allows manual input if needed, or if autocomplete fails
            required
            disabled={loading}
            placeholder="Start typing your address..."
          />
        </Autocomplete>
      </Box>
      {/* Row for City, State, Zip - these will be populated by Autocomplete */}
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
            {usStatesAndAbbrevs.map((stateObj) => (
              <MenuItem key={stateObj.code} value={stateObj.code}>
                {stateObj.name}
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
    </LoadScript>
  );
};

export default CreatePropertyForm;
