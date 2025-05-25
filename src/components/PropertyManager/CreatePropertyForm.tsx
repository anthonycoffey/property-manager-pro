import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { LoadScript } from '@react-google-maps/api'; // Autocomplete component will be removed
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
  // const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null); // Old state
  const placeAutocompleteRef = useRef<HTMLDivElement>(null); // Ref for the container of the new element
  const autocompleteInputRef = useRef<HTMLInputElement | null>(null); // Ref for a hidden input if needed, or the element itself

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

  // Define libraries const outside component to prevent re-creation
  const LIBRARIES: ("places")[] = ["places"];

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places && placeAutocompleteRef.current && !placeAutocompleteRef.current.querySelector('gmp-place-autocomplete')) {
      const placeAutocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: "us" },
        // types: ['address'], // This might not be an option for PlaceAutocompleteElement, check docs if needed
      });
      
      // placeAutocompleteElement.id = 'place-autocomplete-create-form'; // Optional ID
      
      // Style the web component to look like a TextField
      // This is a basic attempt, might need more sophisticated styling
      const gmpInputElement = placeAutocompleteElement.querySelector('input');
      if (gmpInputElement) {
        // These styles are illustrative. MUI TextFields are complex.
        // It might be better to wrap this in a FormControl and use an InputLabel.
        gmpInputElement.style.width = '100%';
        gmpInputElement.style.padding = '16.5px 14px'; // From MUI TextField
        gmpInputElement.style.border = '1px solid rgba(0, 0, 0, 0.23)';
        gmpInputElement.style.borderRadius = '4px';
        gmpInputElement.placeholder = "Street Address (Type to search)";
        // Consider focus/hover styles if going this route
      }


      placeAutocompleteRef.current.appendChild(placeAutocompleteElement);

      const listener = placeAutocompleteElement.addEventListener('gmp-select', async (event) => {
        const place = (event as CustomEvent).detail.place; // New API structure for event
        
        if (!place) {
          console.warn("PlaceAutocompleteElement gmp-select event did not return a place.");
          return;
        }

        await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });

        if (place.addressComponents) {
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let postalCode = '';

          place.addressComponents.forEach((component: google.maps.places.AddressComponent) => {
            const types = component.types;
            if (types.includes('street_number')) streetNumber = component.longText ?? '';
            if (types.includes('route')) route = component.longText ?? '';
            if (types.includes('locality')) city = component.longText ?? '';
            if (types.includes('administrative_area_level_1')) state = component.shortText ?? '';
            if (types.includes('postal_code')) postalCode = component.longText ?? '';
          });

          const fullStreet = streetNumber ? `${streetNumber} ${route}`.trim() : route.trim() || place.formattedAddress || '';
          
          setAddress({
            street: fullStreet,
            city: city,
            state: state,
            zip: postalCode,
          });
          // Manually update the value of the input inside the web component if needed,
          // though it should update itself. If not, we might need to set its `value` attribute.
          // Or, if we use a separate hidden input for the street to keep MUI TextField for display, update that.
          // For now, assuming the web component's input reflects the selection.
          // If we want the MUI TextField to show the selected street, we need to update `address.street`
          // and ensure the MUI TextField for street is now primarily for display or fallback.
        }
      });
      
      return () => {
        // Clean up: remove the element and listener if the component unmounts
        // This might be too aggressive if LoadScript keeps the API loaded.
        // However, the element itself should be cleaned.
        if (placeAutocompleteRef.current) {
          placeAutocompleteRef.current.innerHTML = ''; // Clear the container
        }
        // No explicit removeEventListener for the web component in this example,
        // but if `placeAutocompleteElement` instance was stored, it would be good.
      };
    }
  }, [window.google]); // Rerun if google object becomes available

  // const onPlaceChanged = () => { ... }; // This old function is removed.

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
    <LoadScript googleMapsApiKey={apiKey} libraries={LIBRARIES}>
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
      
      {/* Container for the Google Place Autocomplete Element */}
      <Typography variant="body2" sx={{mt: 1, mb: 0.5, color: 'text.secondary'}}>Street Address</Typography>
      <Box 
        sx={{ 
          mb: 2, 
          '& gmp-place-autocomplete input': { // Targeting the input inside the web component
            width: '100% !important', // Important to override default inline styles if any
            boxSizing: 'border-box', // Ensure padding and border don't add to width
            padding: '16.5px 14px',
            border: `1px solid rgba(0, 0, 0, 0.23)`,
            borderRadius: '4px',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Match MUI
            fontSize: '1rem',
            color: 'inherit',
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: 'rgba(0, 0, 0, 0.87)',
            },
            '&:focus': {
              borderColor: 'primary.main', // Needs theme access or hardcode MUI blue
              outline: '1px solid primary.main', // Example focus outline
            }
          }
        }} 
        ref={placeAutocompleteRef}
      >
        {/* The PlaceAutocompleteElement will be appended here by useEffect.
            The address.street state will be updated on 'gmp-select'.
            Manual typing directly into this Google input won't update address.street until selection.
            If address.street needs to be pre-filled (e.g. edit form), the web component's `value` attribute would need setting.
            For create form, it starts empty.
        */}
      </Box>
      {/* MUI TextField for street is removed, relying on the web component above */}

      {/* Row for City, State, Zip - these will be populated by Autocomplete and can be manually edited */}
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
