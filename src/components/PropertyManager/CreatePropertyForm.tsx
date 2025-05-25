import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { useJsApiLoader } from '@react-google-maps/api';
import type { CreatePropertyResponse, AppError } from '../../types';

import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import parse from 'autosuggest-highlight/parse';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { debounce } from '@mui/material/utils';

export interface CreatePropertyFormProps {
  onSuccess?: () => void;
}

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

const LIBRARIES_PLACES: 'places'[] = ['places'];

const CreatePropertyForm: React.FC<CreatePropertyFormProps> = ({
  onSuccess,
}) => {
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [address, setAddress] = useState<PropertyAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  // MUI Autocomplete specific states
  const [autocompleteValue, setAutocompleteValue] =
    useState<google.maps.places.AutocompletePrediction | null>(null);
  const [autocompleteInputValue, setAutocompleteInputValue] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState<
    readonly google.maps.places.AutocompletePrediction[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    currentUser,
    roles: userRoles,
    organizationId: userOrgId,
  } = useAuth();

  const functions = getFunctions();
  const createPropertyFn = httpsCallable(functions, 'createProperty');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES_PLACES,
  });

  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderService = useRef<google.maps.Geocoder | null>(null);

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

    if (!autocompleteService.current || autocompleteInputValue === '') {
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
          let newOptions: readonly google.maps.places.AutocompletePrediction[] =
            [];
          if (autocompleteValue) {
            newOptions = [autocompleteValue];
          }
          if (results) {
            newOptions = [...newOptions, ...results];
          }
          setAutocompleteOptions(newOptions);
        } else if (
          active &&
          status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          console.error(`Google Maps Autocomplete API error: ${status}`);
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
    newValue: google.maps.places.AutocompletePrediction | null
  ) => {
    setAutocompleteOptions(
      newValue ? [newValue, ...autocompleteOptions] : autocompleteOptions
    );
    setAutocompleteValue(newValue);

    if (newValue && newValue.place_id && geocoderService.current) {
      geocoderService.current.geocode(
        { placeId: newValue.place_id },
        (results, status) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const place = results[0];
            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let postalCode = '';

            place.address_components?.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number'))
                streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality')) city = component.long_name;
              if (types.includes('administrative_area_level_1'))
                state = component.short_name;
              if (types.includes('postal_code'))
                postalCode = component.long_name;
            });

            const fullStreet = streetNumber
              ? `${streetNumber} ${route}`.trim()
              : route.trim() || place.formatted_address || '';

            setAddress({
              street: fullStreet,
              city: city,
              state: state,
              zip: postalCode,
            });
            // Optionally set the input value to the formatted address or just the street
            // setAutocompleteInputValue(fullStreet); // Or newValue.description
          } else {
            console.error('Geocoder failed due to: ' + status);
            setError('Failed to fetch address details.');
            setAddress({ street: '', city: '', state: '', zip: '' }); // Clear address on error
          }
        }
      );
    } else if (!newValue) {
      setAddress({ street: '', city: '', state: '', zip: '' }); // Clear address if selection is cleared
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !userRoles.includes('property_manager') || !userOrgId) {
      setError('Permission denied or organization information missing.');
      return;
    }

    if (
      !propertyName ||
      !propertyType ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.zip
    ) {
      setError(
        'Property Name, Type, and full Address (Street, City, State, Zip) are required.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createPropertyFn({
        propertyName,
        propertyType,
        address: {
          // Send full address object
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
        },
      });

      const responseData = result.data as CreatePropertyResponse;

      if (responseData?.success) {
        setSuccess(`Property "${propertyName}" created successfully.`);
        setPropertyName('');
        setPropertyType('');
        setAddress({ street: '', city: '', state: '', zip: '' });
        setAutocompleteValue(null);
        setAutocompleteInputValue('');
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

  if (!currentUser || !userRoles.includes('property_manager')) {
    return (
      <Alert severity='error'>
        You do not have permission to access this feature.
      </Alert>
    );
  }

  if (loadError) {
    console.error('Google Maps API load error:', loadError);
    return (
      <Alert severity='error'>
        Google Maps API failed to load. Address autocompletion will not work.
      </Alert>
    );
  }

  if (!apiKey) {
    console.error(
      'Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.'
    );
    return (
      <Alert severity='error'>
        Google Maps API key is missing. Address autocompletion will not work.
      </Alert>
    );
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ maxWidth: '600px' }}>
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
        disabled={loading || !isLoaded}
      />
      <FormControl
        fullWidth
        margin='normal'
        required
        disabled={loading || !isLoaded}
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

      <Typography variant='subtitle1' sx={{ mt: 2 }}>
        Property Address
      </Typography>

      {!isLoaded && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />{' '}
          <Typography sx={{ ml: 1 }}>Loading address search...</Typography>
        </Box>
      )}

      {isLoaded && (
        <Autocomplete
          id='google-maps-autocomplete'
          sx={{ width: '100%', mt: 1, mb: 2 }}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : option.description
          }
          filterOptions={(x) => x}
          options={autocompleteOptions}
          autoComplete
          includeInputInList
          filterSelectedOptions
          value={autocompleteValue}
          noOptionsText='No locations found'
          onChange={handleAutocompleteChange}
          onInputChange={(_event, newInputValue) => {
            setAutocompleteInputValue(newInputValue);
          }}
          slotProps={{
            popper: {
              placement: 'bottom-start',
              modifiers: [
                {
                  name: 'flip',
                  enabled: false,
                },
                {
                  name: 'preventOverflow',
                  enabled: true,
                  options: {
                    boundary: 'clippingParents',
                  },
                },
              ],
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label='Address'
              fullWidth
              required
              disabled={loading}
            />
          )}
          renderOption={(props, option) => {
            const matches =
              option.structured_formatting.main_text_matched_substrings || [];
            const parts = parse(
              option.structured_formatting.main_text,
              matches.map((match: { offset: number; length: number }) => [
                match.offset,
                match.offset + match.length,
              ])
            );

            return (
              <li {...props} key={option.place_id || option.description}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', width: '100%' }}
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
                    {parts.map(
                      (
                        part: { text: string; highlight: boolean },
                        index: number
                      ) => (
                        <Box
                          key={index}
                          component='span'
                          sx={{ fontWeight: part.highlight ? 700 : 400 }}
                        >
                          {part.text}
                        </Box>
                      )
                    )}
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

      {address.street && (
        <Box
          sx={{
            mt: 1,
            py: 1,
            px: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant='caption'>Selected Address:</Typography>
          <Typography variant='body2'>{address.street}</Typography>
          <Typography variant='body2'>{address.city}</Typography>
          <Typography variant='body2'>{address.state}</Typography>
          <Typography variant='body2'>{address.zip}</Typography>
        </Box>
      )}

      <Stack>
        <Button
          type='submit'
          variant='contained'
          color='primary'
          disabled={loading || !isLoaded}
          sx={{ mt: 3 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Property'}
        </Button>
      </Stack>
    </Box>
  );
};

export default CreatePropertyForm;
