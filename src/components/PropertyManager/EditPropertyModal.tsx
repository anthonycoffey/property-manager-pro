import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Autocomplete,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import { useJsApiLoader } from '@react-google-maps/api';
import type {
  Property,
  PropertyAddress as FullPropertyAddress,
  AppError,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import parse from 'autosuggest-highlight/parse';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { debounce } from '@mui/material/utils';

interface EditPropertyModalProps {
  open: boolean;
  onClose: () => void;
  propertyData: Property | null;
  onSuccess: () => void;
  organizationId?: string; // Optional: for Admin/OM to specify target org
}

interface PlaceType {
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings?: readonly {
      offset: number;
      length: number;
    }[];
  };
  place_id?: string;
}

const LIBRARIES_PLACES: 'places'[] = ['places'];

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  open,
  onClose,
  propertyData,
  onSuccess,
  organizationId: propOrganizationId, // New prop
}) => {
  const { currentUser, organizationId: authUserOrganizationId } = useAuth(); // Auth org for PM fallback
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [address, setAddress] = useState<FullPropertyAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [autocompleteValue, setAutocompleteValue] = useState<PlaceType | null>(
    null
  );
  const [autocompleteInputValue, setAutocompleteInputValue] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState<
    readonly PlaceType[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info'
  >('success');

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES_PLACES,
  });

  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderService = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (propertyData && open) {
      setName(propertyData.name);
      setPropertyType(propertyData.type);
      setAddress({
        street: propertyData.address.street || '',
        city: propertyData.address.city || '',
        state: propertyData.address.state || '',
        zip: propertyData.address.zip || '',
      });
      setAutocompleteInputValue(propertyData.address.street || '');
      setAutocompleteValue(null);
    } else if (!open) {
      setName('');
      setPropertyType('');
      setAddress({ street: '', city: '', state: '', zip: '' });
      setAutocompleteInputValue('');
      setAutocompleteValue(null);
      setError(null);
    }
  }, [propertyData, open]);

  useEffect(() => {
    if (
      isLoaded &&
      window.google &&
      window.google.maps &&
      window.google.maps.places
    ) {
      if (!autocompleteService.current) {
        autocompleteService.current =
          new window.google.maps.places.AutocompleteService();
      }
      if (!geocoderService.current) {
        geocoderService.current = new window.google.maps.Geocoder();
      }
    }
  }, [isLoaded]);

  const fetchPlacePredictions = useMemo(
    () =>
      debounce(
        (
          request: google.maps.places.AutocompletionRequest,
          callback: (
            results: google.maps.places.AutocompletePrediction[] | null,
            status: google.maps.places.PlacesServiceStatus
          ) => void
        ) => {
          if (autocompleteService.current && request.input) {
            autocompleteService.current.getPlacePredictions(request, callback);
          } else {
            callback([], google.maps.places.PlacesServiceStatus.OK);
          }
        },
        400
      ),
    []
  );

  useEffect(() => {
    let active = true;
    if (
      !autocompleteService.current ||
      autocompleteInputValue === '' ||
      (autocompleteValue &&
        autocompleteInputValue === autocompleteValue.description)
    ) {
      setAutocompleteOptions(autocompleteValue ? [autocompleteValue] : []);
      return undefined;
    }

    fetchPlacePredictions(
      {
        input: autocompleteInputValue,
        componentRestrictions: { country: 'us' },
      },
      (results, status) => {
        if (active && status === google.maps.places.PlacesServiceStatus.OK) {
          let newOptions: readonly PlaceType[] = [];
          if (autocompleteValue) {
            newOptions = [autocompleteValue];
          }
          if (results) {
            const mappedResults: PlaceType[] = results.map((p) => ({
              description: p.description,
              structured_formatting: p.structured_formatting,
              place_id: p.place_id,
            }));
            newOptions = [...newOptions, ...mappedResults];
          }
          setAutocompleteOptions(newOptions);
        } else if (
          active &&
          status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          setAutocompleteOptions(autocompleteValue ? [autocompleteValue] : []);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [autocompleteValue, autocompleteInputValue, fetchPlacePredictions]);

  const handleAutocompleteChange = (
    _event: React.SyntheticEvent,
    newValue: PlaceType | null
  ) => {
    setAutocompleteOptions(
      newValue ? [newValue, ...autocompleteOptions] : autocompleteOptions
    );
    setAutocompleteValue(newValue);

    if (newValue && newValue.place_id && geocoderService.current) {
      geocoderService.current.geocode(
        { placeId: newValue.place_id },
        (results, geocodeStatus) => {
          if (
            geocodeStatus === google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const place = results[0];
            let streetNumber = '';
            let route = '';
            let currentCity = '';
            let currentState = '';
            let currentPostalCode = '';

            place.address_components?.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number'))
                streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality')) currentCity = component.long_name;
              if (types.includes('administrative_area_level_1'))
                currentState = component.short_name;
              if (types.includes('postal_code'))
                currentPostalCode = component.long_name;
            });
            const fullStreet = streetNumber
              ? `${streetNumber} ${route}`.trim()
              : route.trim() || place.formatted_address || '';
            setAddress({
              street: fullStreet,
              city: currentCity,
              state: currentState,
              zip: currentPostalCode,
            });
            setAutocompleteInputValue(fullStreet);
          } else {
            setError('Failed to fetch address details.');
            setAddress({
              street: autocompleteInputValue,
              city: '',
              state: '',
              zip: '',
            });
          }
        }
      );
    } else if (!newValue) {
      setAddress((prev) => ({
        ...prev,
        street: autocompleteInputValue,
        city: '',
        state: '',
        zip: '',
      }));
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

    if (
      !name ||
      !propertyType ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.zip
    ) {
      setSnackbarMessage('All fields including full address are required.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    const updatedPropertyDetails: Partial<Property> & {
      address?: Partial<FullPropertyAddress>;
    } = {};
    if (name !== propertyData.name) updatedPropertyDetails.name = name;
    if (propertyType !== propertyData.type)
      updatedPropertyDetails.type = propertyType;

    const currentFullAddress: FullPropertyAddress = {
      street: address.street.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zip: address.zip.trim(),
    };

    if (
      currentFullAddress.street !== (propertyData.address.street || '') ||
      currentFullAddress.city !== (propertyData.address.city || '') ||
      currentFullAddress.state !== (propertyData.address.state || '') ||
      currentFullAddress.zip !== (propertyData.address.zip || '')
    ) {
      updatedPropertyDetails.address = currentFullAddress;
    }

    if (Object.keys(updatedPropertyDetails).length === 0) {
      setSnackbarMessage('No changes detected.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      setLoading(false);
      onClose();
      return;
    }

    const updatePropertyFunction = httpsCallable(functions, 'updateProperty');
    try {
      await updatePropertyFunction({
        organizationId: targetOrganizationId, // Use determined targetOrganizationId
        propertyId: propertyData.id,
        updatedData: updatedPropertyDetails,
      });
      setSnackbarMessage('Property updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess();
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
          <DialogContent sx={{ pt: 1 }} dividers>
            {' '}
            {/* Added dividers to match create modal style */}
            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {!isLoaded && !loadError && !apiKey && (
              <Alert severity='warning' sx={{ mb: 2 }}>
                Address search is unavailable or API key is missing.
              </Alert>
            )}
            {!isLoaded && !loadError && apiKey && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />{' '}
                <Typography sx={{ ml: 1 }}>
                  Loading address search...
                </Typography>
              </Box>
            )}
            <Typography variant='subtitle1' sx={{ mt: 2 }}>
              Property Details
            </Typography>
            <TextField
              label='Property Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              margin='dense'
              disabled={loading || !isLoaded}
            />
            <FormControl
              fullWidth
              margin='dense'
              required
              disabled={loading || !isLoaded}
            >
              <InputLabel id='edit-property-type-label'>
                Property Type
              </InputLabel>
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
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle1' sx={{ mt: 2 }}>
              Property Address
            </Typography>
            {isLoaded && apiKey && (
              <Autocomplete
                id='edit-google-maps-autocomplete'
                sx={{ width: '100%', mb: 1 }}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.description
                }
                filterOptions={(x) => x}
                options={autocompleteOptions}
                autoComplete
                includeInputInList
                filterSelectedOptions
                value={autocompleteValue}
                inputValue={autocompleteInputValue}
                noOptionsText='No locations found'
                onChange={handleAutocompleteChange}
                onInputChange={(_event, newInputValue) => {
                  setAutocompleteInputValue(newInputValue);
                }}
                slotProps={{
                  popper: {
                    placement: 'bottom-start',
                    modifiers: [
                      { name: 'flip', enabled: false },
                      {
                        name: 'preventOverflow',
                        enabled: true,
                        options: { boundary: 'clippingParents' },
                      },
                    ],
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label='Search Full Address'
                    fullWidth
                    margin='dense'
                    disabled={loading}
                  />
                )}
                renderOption={(props, option) => {
                  const matches =
                    option.structured_formatting.main_text_matched_substrings ||
                    [];
                  const parts = parse(
                    option.structured_formatting.main_text,
                    matches.map((match) => [
                      match.offset,
                      match.offset + match.length,
                    ])
                  );
                  return (
                    <li {...props} key={option.place_id || option.description}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            width: 44,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <LocationOnIcon sx={{ color: 'text.secondary' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1, wordWrap: 'break-word' }}>
                          {parts.map((part, index) => (
                            <Box
                              key={index}
                              component='span'
                              sx={{ fontWeight: part.highlight ? 700 : 400 }}
                            >
                              {part.text}
                            </Box>
                          ))}
                          <Typography variant='body2' color='text.secondary'>
                            {option.structured_formatting.secondary_text}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  );
                }}
              />
            )}
            <TextField
              label='Street'
              value={address.street}
              onChange={(e) =>
                setAddress((a) => ({ ...a, street: e.target.value }))
              }
              fullWidth
              margin='dense'
              required
              disabled={loading || !isLoaded}
            />
            <TextField
              label='City'
              value={address.city}
              onChange={(e) =>
                setAddress((a) => ({ ...a, city: e.target.value }))
              }
              fullWidth
              margin='dense'
              required
              disabled={loading || !isLoaded}
            />
            <TextField
              label='State'
              value={address.state}
              onChange={(e) =>
                setAddress((a) => ({ ...a, state: e.target.value }))
              }
              fullWidth
              margin='dense'
              required
              disabled={loading || !isLoaded}
            />
            <TextField
              label='Zip Code'
              value={address.zip}
              onChange={(e) =>
                setAddress((a) => ({ ...a, zip: e.target.value }))
              }
              fullWidth
              margin='dense'
              required
              disabled={loading || !isLoaded}
            />
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={onClose} variant="outlined" color="error">
              Cancel
            </Button>
            <Button
              type='submit'
              variant='contained'
              disabled={loading || !isLoaded}
            >
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
    </>
  );
};

export default EditPropertyModal;
