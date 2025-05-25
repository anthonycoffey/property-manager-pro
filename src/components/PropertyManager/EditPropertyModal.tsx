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
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig'; // Assuming this is your FirebaseApp instance
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import type { Property, PropertyAddress } from '../../types'; // Type-only imports
import { useAuth } from '../../hooks/useAuth';
import { Box, Stack } from '@mui/material'; // Import Box and Stack

interface EditPropertyModalProps {
  open: boolean;
  onClose: () => void;
  propertyData: Property | null;
  onSuccess: () => void;
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  open,
  onClose,
  propertyData,
  onSuccess,
}) => {
  const { currentUser, organizationId: userOrganizationId } = useAuth(); // Destructure organizationId
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState(''); // This will store the state code e.g. "CA"
  const [zip, setZip] = useState('');
  const [type, setType] = useState('');
  const [autocompleteInstance, setAutocompleteInstance] = useState<google.maps.places.Autocomplete | null>(null);

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (propertyData) {
      setName(propertyData.name);
      setStreet(propertyData.address.street);
      setCity(propertyData.address.city);
      // Ensure propertyData.address.state is compatible (e.g., if it's full name, map to code, or assume it's already code)
      // For now, assuming propertyData.address.state is already the short code.
      setState(propertyData.address.state);
      setZip(propertyData.address.zip);
      setType(propertyData.type);
    } else {
      setName('');
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setType('');
    }
  }, [propertyData]);

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocompleteInstance(autocomplete);
  };

  const onPlaceChangedAutocomplete = () => {
    if (autocompleteInstance !== null) {
      const place = autocompleteInstance.getPlace();
      if (place.address_components) {
        let streetNumber = '';
        let route = '';
        let currentCity = '';
        let currentState = '';
        let currentPostalCode = '';

        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) route = component.long_name;
          if (types.includes('locality')) currentCity = component.long_name;
          if (types.includes('administrative_area_level_1')) currentState = component.short_name;
          if (types.includes('postal_code')) currentPostalCode = component.long_name;
        });

        const fullStreet = streetNumber ? `${streetNumber} ${route}` : route;
        setStreet(fullStreet);
        setCity(currentCity);
        setState(currentState); // Sets the short code, e.g., "CA"
        setZip(currentPostalCode);
      } else {
        console.warn("Autocomplete (Edit Modal) place result does not have address_components");
      }
    } else {
      console.log('Autocomplete (Edit Modal) is not loaded yet!');
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyData || !currentUser || !userOrganizationId) { // Use userOrganizationId
      setError('Property data or user information is missing.');
      setSnackbarMessage('Property data or user information is missing.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    const updatedPropertyDetails: Partial<Property> & { address?: Partial<PropertyAddress> } = {};
    if (name !== propertyData.name) updatedPropertyDetails.name = name;
    if (type !== propertyData.type) updatedPropertyDetails.type = type;

    const updatedAddressDetails: Partial<PropertyAddress> = {};
    if (street !== propertyData.address.street) updatedAddressDetails.street = street;
    if (city !== propertyData.address.city) updatedAddressDetails.city = city;
    if (state !== propertyData.address.state) updatedAddressDetails.state = state;
    if (zip !== propertyData.address.zip) updatedAddressDetails.zip = zip;

    if (Object.keys(updatedAddressDetails).length > 0) {
      updatedPropertyDetails.address = { ...propertyData.address, ...updatedAddressDetails };
    }
    
    // If managedBy is editable:
    // if (managedBy !== propertyData.managedBy) updatedPropertyDetails.managedBy = managedBy;

    if (Object.keys(updatedPropertyDetails).length === 0 && Object.keys(updatedAddressDetails).length === 0) {
      setSnackbarMessage('No changes detected.');
      setSnackbarSeverity('info' as 'success' | 'error'); // MUI might not have 'info' as a direct type for severity
      setSnackbarOpen(true);
      setLoading(false);
      onClose(); // Close modal if no changes
      return;
    }
    
    const updatePropertyFunction = httpsCallable(functions, 'updateProperty');
    try {
      await updatePropertyFunction({
        organizationId: userOrganizationId, // Use userOrganizationId
        propertyId: propertyData.id,
        updatedData: updatedPropertyDetails,
      });
      setSnackbarMessage('Property updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess(); // Call onSuccess to refresh list and close modal
    } catch (err: any) {
      console.error('Error updating property:', err);
      setError(err.message || 'Failed to update property.');
      setSnackbarMessage(err.message || 'Failed to update property.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey && open) { // Check only if modal is open to avoid console spam
    console.error("Google Maps API key is missing for EditPropertyModal. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.");
    // Optionally, render an error in the modal, but for now, it will just not have autocomplete.
  }
  
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Property: {propertyData?.name || ''}</DialogTitle>
        <LoadScript googleMapsApiKey={apiKey!} libraries={["places"]} loadingElement={<CircularProgress />}>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {!apiKey && <Alert severity="warning" sx={{ mb: 2 }}>Google Maps API key missing. Address autocompletion is disabled.</Alert>}
              <Stack spacing={2}>
                <TextField
                  label="Property Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
                <Autocomplete
                  onLoad={onLoadAutocomplete}
                  onPlaceChanged={onPlaceChangedAutocomplete}
                  options={{
                    types: ["address"],
                    componentRestrictions: { country: "us" },
                  }}
                >
                  <TextField
                    label="Street Address (Type to search)"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)} // Allows manual input
                    fullWidth
                    required
                    margin="dense"
                    placeholder="Start typing address..."
                  />
                </Autocomplete>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                  sx={{ flexGrow: 1 }}
                />
                <FormControl fullWidth margin="dense" required sx={{ flexGrow: 1 }}>
                  <InputLabel id="state-select-label">State</InputLabel>
                  <Select
                    labelId="state-select-label"
                    id="state-select"
                    value={state}
                    label="State"
                    onChange={(e) => setState(e.target.value)} // Manual change still possible
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
                  label="Zip Code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                  sx={{ flexGrow: 1 }}
                />
              </Stack>
              <TextField
                label="Property Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                fullWidth
                required
                margin="dense"
                helperText="e.g., Residential, Commercial, Mixed-Use"
              />
              {/* Optional: Managed By field if editable by PM */}
              {/* <Box sx={{ width: '100%' }}>
                <TextField
                  label="Managed By (User ID)"
                  value={managedBy}
                  onChange={(e) => setManagedBy(e.target.value)}
                  fullWidth
                  margin="dense"
                  // Consider making this a dropdown of available managers if applicable
                />
              </Box> */}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
          </form>
        </LoadScript>
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
