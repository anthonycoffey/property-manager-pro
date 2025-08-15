import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { TextField, Autocomplete, Box, Typography, CircularProgress } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { debounce } from '@mui/material/utils';
import parse from 'autosuggest-highlight/parse';

export interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressAutocompleteInputProps {
  initialAddress: PropertyAddress;
  onAddressChange: (address: PropertyAddress) => void;
  label?: string;
  disabled?: boolean;
}

const LIBRARIES_TO_LOAD: ('places')[] = ['places'];

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  initialAddress,
  onAddressChange,
  label = 'Address',
  disabled = false,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES_TO_LOAD,
  });

  const [autocompleteValue, setAutocompleteValue] =
    useState<google.maps.places.AutocompletePrediction | null>(null);
  const [autocompleteInputValue, setAutocompleteInputValue] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState<
    readonly google.maps.places.AutocompletePrediction[]
  >([]);
  const [isFocused, setIsFocused] = useState(false);

  const formatFullAddress = (addr: PropertyAddress) => {
    if (!addr || !addr.street) return '';
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  };

  useEffect(() => {
    if (!isFocused) {
      setAutocompleteInputValue(formatFullAddress(initialAddress));
    } else {
      setAutocompleteInputValue(initialAddress.street || '');
    }
  }, [initialAddress, isFocused]);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderService = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (isLoaded && window.google && window.google.maps && window.google.maps.places) {
      if (!autocompleteService.current) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
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
          let newOptions: readonly google.maps.places.AutocompletePrediction[] = [];
          if (autocompleteValue) {
            newOptions = [autocompleteValue];
          }
          if (results) {
            newOptions = [...newOptions, ...results];
          }
          setAutocompleteOptions(newOptions);
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
    setAutocompleteOptions(newValue ? [newValue, ...autocompleteOptions] : autocompleteOptions);
    setAutocompleteValue(newValue);

    if (newValue && newValue.place_id && geocoderService.current) {
      geocoderService.current.geocode(
        { placeId: newValue.place_id },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const place = results[0];
            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let postalCode = '';

            place.address_components?.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number')) streetNumber = component.long_name;
              if (types.includes('route')) route = component.long_name;
              if (types.includes('locality')) city = component.long_name;
              if (types.includes('administrative_area_level_1')) state = component.short_name;
              if (types.includes('postal_code')) postalCode = component.long_name;
            });

            const fullStreet = streetNumber ? `${streetNumber} ${route}`.trim() : route.trim() || place.formatted_address || '';

            onAddressChange({
              street: fullStreet,
              city: city,
              state: state,
              zip: postalCode,
            });
          } else {
            onAddressChange({ street: '', city: '', state: '', zip: '' });
          }
        }
      );
    } else if (!newValue) {
      onAddressChange({ street: '', city: '', state: '', zip: '' });
    }
  };

  if (loadError) {
    return <Typography color="error">Google Maps API failed to load.</Typography>;
  }

  if (!apiKey) {
    return <Typography color="error">Google Maps API key is missing.</Typography>;
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <CircularProgress size={20} />
        <Typography sx={{ ml: 1 }}>Loading address search...</Typography>
      </Box>
    );
  }

  return (
    <Autocomplete
      id={`google-maps-autocomplete-${label}`}
      sx={{ width: '100%' }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.description)}
      filterOptions={(x) => x}
      options={autocompleteOptions}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={autocompleteValue}
      noOptionsText="No locations found"
      onChange={handleAutocompleteChange}
      onInputChange={(_event, newInputValue) => {
        setAutocompleteInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField 
          {...params} 
          label={label} 
          fullWidth 
          required 
          disabled={disabled} 
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      )}
      renderOption={(props, option) => {
        const matches = option.structured_formatting.main_text_matched_substrings || [];
        const parts = parse(
          option.structured_formatting.main_text,
          matches.map((match: { offset: number; length: number }) => [
            match.offset,
            match.offset + match.length,
          ])
        );

        return (
          <li {...props} key={option.place_id || option.description}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ display: 'flex', width: 44, justifyContent: 'center', alignItems: 'center' }}>
                <LocationOnIcon sx={{ color: 'text.secondary' }} />
              </Box>
              <Box sx={{ flexGrow: 1, wordWrap: 'break-word' }}>
                {parts.map((part: { text: string; highlight: boolean }, index: number) => (
                  <Box
                    key={index}
                    component="span"
                    sx={{ fontWeight: part.highlight ? 700 : 400 }}
                  >
                    {part.text}
                  </Box>
                ))}
                <Typography variant="body2" color="text.secondary">
                  {option.structured_formatting.secondary_text}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
};

export default AddressAutocompleteInput;
