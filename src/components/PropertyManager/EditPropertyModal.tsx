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
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig'; // Assuming this is your FirebaseApp instance
import { LoadScript } from '@react-google-maps/api'; 
import type { Property, PropertyAddress } from '../../types'; // Type-only imports
import { useAuth } from '../../hooks/useAuth';
import { Box, Stack } from '@mui/material'; 
import { useRef } from 'react'; 

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
  const [state, setState] = useState(''); 
  const [zip, setZip] = useState('');
  const [type, setType] = useState('');
  const placeAutocompleteRef = useRef<HTMLDivElement>(null); 

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

  const LIBRARIES: ("places")[] = ["places"]; // Define libraries const

  useEffect(() => {
    if (propertyData) {
      setName(propertyData.name);
      setStreet(propertyData.address.street);
      setCity(propertyData.address.city);
      setState(propertyData.address.state);
      setZip(propertyData.address.zip);
      setType(propertyData.type);
    } else {
      // Reset form if no propertyData or if modal is closed then reopened for a new creation (though this is an edit modal)
      setName('');
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setType('');
    }
  }, [propertyData, open]);

  useEffect(() => {
    let placeAutocompleteElementInstance: google.maps.places.PlaceAutocompleteElement | null = null;
    let selectListener: ((event: Event) => Promise<void>) | null = null;

    if (open && window.google && window.google.maps && window.google.maps.places && placeAutocompleteRef.current) {
      if (!placeAutocompleteRef.current.querySelector('gmp-place-autocomplete')) {
        placeAutocompleteElementInstance = new google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: "us" },
        });

        const gmpInputElement = placeAutocompleteElementInstance.querySelector('input');
        if (gmpInputElement) {
          gmpInputElement.style.width = '100%';
          gmpInputElement.style.padding = '8.5px 14px'; // MUI dense TextField padding
          gmpInputElement.style.border = '1px solid rgba(0, 0, 0, 0.23)';
          gmpInputElement.style.borderRadius = '4px';
          gmpInputElement.placeholder = "Street Address (Type to search)";
          // Set initial value for the input field from the `street` state
          gmpInputElement.value = street; 
        }
        
        placeAutocompleteRef.current.innerHTML = ''; // Clear previous instance
        placeAutocompleteRef.current.appendChild(placeAutocompleteElementInstance);

        selectListener = async (event: Event) => {
          const place = (event as CustomEvent).detail.place;
          if (!place) {
            console.warn("PlaceAutocompleteElement gmp-select event did not return a place.");
            return;
          }
          await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });

          if (place.addressComponents) {
            let streetNumber = '';
            let route = '';
            let currentCity = '';
            let currentState = '';
            let currentPostalCode = '';

            place.addressComponents.forEach((component: google.maps.places.AddressComponent) => {
              const types = component.types;
              if (types.includes('street_number')) streetNumber = component.longText ?? '';
              if (types.includes('route')) route = component.longText ?? '';
              if (types.includes('locality')) currentCity = component.longText ?? '';
              if (types.includes('administrative_area_level_1')) currentState = component.shortText ?? '';
              if (types.includes('postal_code')) currentPostalCode = component.longText ?? '';
            });

            const fullStreet = streetNumber ? `${streetNumber} ${route}`.trim() : route.trim() || place.formattedAddress || '';
            setStreet(fullStreet);
            setCity(currentCity);
            setState(currentState);
            setZip(currentPostalCode);
          }
        };
        
        placeAutocompleteElementInstance.addEventListener('gmp-select', selectListener);
      } else {
        // If element already exists, ensure its input value is up-to-date with the `street` state
        // This handles cases where `propertyData` changes while the modal is already open (though less common)
        const existingGmpInput = placeAutocompleteRef.current.querySelector('gmp-place-autocomplete input') as HTMLInputElement | null;
        if (existingGmpInput && existingGmpInput.value !== street) {
          existingGmpInput.value = street;
        }
      }
    }
    
    return () => {
      if (placeAutocompleteElementInstance && selectListener) {
        placeAutocompleteElementInstance.removeEventListener('gmp-select', selectListener);
      }
      // Do not clear innerHTML here if `open` is in dependency array,
      // as it might clear too early when dependencies like `street` change.
      // Clearing should ideally happen when `open` becomes false or component unmounts.
      // For simplicity, if `open` is false, the component part rendering this won't be active.
      // The current logic in the main `if (open && ...)` handles re-initialization if needed.
    };
  }, [open, street]); // `window.google` removed, `street` kept for pre-fill sync.

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
    } catch (err: unknown) { // Changed from any to unknown
      console.error('Error updating property:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to update property.');
        setSnackbarMessage(err.message || 'Failed to update property.');
      } else {
        setError('An unexpected error occurred while updating property.');
        setSnackbarMessage('An unexpected error occurred while updating property.');
      }
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
        <LoadScript googleMapsApiKey={apiKey!} libraries={LIBRARIES} loadingElement={<CircularProgress />}>
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
                <Typography variant="caption" display="block" color="text.secondary" sx={{ pl: '2px', mb: -0.5, mt: 1 }}>Street Address</Typography>
                <Box 
                  ref={placeAutocompleteRef}
                  sx={{
                    // Styles for the input within gmp-place-autocomplete
                    '& gmp-place-autocomplete input': {
                      width: '100% !important',
                      boxSizing: 'border-box',
                      padding: '8.5px 14px', // Corresponds to MUI dense TextField
                      border: `1px solid rgba(0, 0, 0, 0.23)`,
                      borderRadius: '4px',
                      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                      fontSize: '1rem',
                      lineHeight: '1.4375em', // From MUI
                      color: 'inherit',
                      backgroundColor: 'transparent',
                      '&:hover': {
                        borderColor: 'rgba(0, 0, 0, 0.87)',
                      },
                      '&.gm-err-autocomplete': { // Class added by Google on error
                        borderColor: 'error.main', // Needs theme or hardcode
                      },
                      // Note: Focus styles are typically handled by the web component itself.
                      // Overriding them might be complex or inconsistent.
                    }
                  }}
                >
                  {/* gmp-place-autocomplete is appended here by useEffect */}
                </Box>
                
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
