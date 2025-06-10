import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Switch, // New for off-premise toggle
  // FormControl, // Keep for FormControlLabel - Removed as unused
  // InputLabel, // Keep for other TextFields - Removed as unused
  // MenuItem, // No longer needed if MUI Select is fully replaced
  // type SelectChangeEvent, // No longer needed if MUI Select is fully replaced
  Snackbar,
  Stack,
  useMediaQuery,
  useTheme,
  FormControlLabel, // New
  Checkbox, // New
  Autocomplete, // New
} from '@mui/material';
import ReactSelect from 'react-select'; // Corrected import for ReactSelect
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// New imports for Google Places and Phoenix Service
import { useJsApiLoader } from '@react-google-maps/api';
// Define LIBRARIES_TO_LOAD at the top level of the module
const LIBRARIES_TO_LOAD: ('places' | 'routes')[] = ['places', 'routes'];
import parse from 'autosuggest-highlight/parse';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { debounce } from '@mui/material/utils';
import {
  getPhoenixServices,
  type PhoenixService,
} from '../../lib/phoenixService';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from '../../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../firebaseConfig'; // Added db
import { doc, getDoc } from 'firebase/firestore'; // Added doc, getDoc
import type { Property, Resident, Vehicle } from '../../types'; // Added Property, Resident, Vehicle type

interface CreateServiceRequestFormProps {
  onServiceRequestSubmitted: () => void;
}

interface CreateServiceRequestCallableResponse {
  success: boolean;
  message?: string;
  serviceRequestId?: string;
}

// Interface for Google Places Autocomplete suggestions
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

// const roadsideServiceTypes = [...] // This is no longer needed

const CreateServiceRequestForm: React.FC<CreateServiceRequestFormProps> = ({
  onServiceRequestSubmitted,
}) => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [residentName, setResidentName] = useState(
    currentUser?.displayName || ''
  );
  const [phone, setPhone] = useState(''); // This will be the form's phone state
  const [email, setEmail] = useState(currentUser?.email || '');
  const [residentProfileData, setResidentProfileData] = useState<Resident | null>(null); // To store fetched resident profile

  // const [serviceLocation, setServiceLocation] = useState(''); // Kept for now, as handleAutocompleteChange updates it. Could be removed if Autocomplete directly drives display. - Removed as unused
  // const [requestType, setRequestType] = useState<string>(''); // Replaced by selectedPhoenixServiceId
  const [serviceDateTime, setServiceDateTime] = useState<Date | null>(
    new Date()
  );
  const [residentNotes, setResidentNotes] = useState<string>('');

  // New state variables for Phoenix integration and Places API
  const [smsConsent, setSmsConsent] = useState<boolean>(false);
  const [phoenixServices, setPhoenixServices] = useState<PhoenixService[]>([]);
  // For multi-select, store an array of selected option objects or just their values/IDs
  const [selectedPhoenixServices, setSelectedPhoenixServices] = useState<
    ReadonlyArray<{ value: number; label: string }>
  >([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Google Places Autocomplete state
  const [autocompleteValue, setAutocompleteValue] = useState<PlaceType | null>(
    null
  );
  const [autocompleteInputValue, setAutocompleteInputValue] = useState('');
  const [autocompleteOptions, setAutocompleteOptions] = useState<
    readonly PlaceType[]
  >([]);
  const [serviceLocationObject, setServiceLocationObject] = useState<
    object | null
  >(null);

  // New state for property address pre-population and off-premise toggle
  const [isOffPremise, setIsOffPremise] = useState<boolean>(false);
  const [propertyFullAddressString, setPropertyFullAddressString] = useState<string | null>(null);
  const [isLoadingPropertyAddress, setIsLoadingPropertyAddress] = useState<boolean>(false);
  const [propertyAddressError, setPropertyAddressError] = useState<string | null>(null);

  // New state for selected vehicle
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google Maps API loader
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES_TO_LOAD,
  });

  const autocompleteService =
    React.useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderService = React.useRef<google.maps.Geocoder | null>(null);

  const formatPhoneNumberOnInput = useCallback((value: string): string => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
      3,
      6
    )}-${phoneNumber.slice(6, 10)}`;
  }, []);

  useEffect(() => {
    setResidentName(currentUser?.displayName || '');
    setEmail(currentUser?.email || '');
    // Pre-fill phone from fetched resident profile if available
    if (residentProfileData?.phone) {
      setPhone(formatPhoneNumberOnInput(residentProfileData.phone));
    } else {
      // If no phone in profile, or profile not yet fetched, ensure form phone is clear or based on other logic
      // For now, if a user manually typed something before profile load, it might be overwritten.
      // Consider if phone should only be set once, or if profile load always dictates it.
      // Current behavior: profile load (or lack of phone in it) will dictate.
      setPhone(''); // Clear phone if not in profile or profile not loaded
    }
  }, [currentUser, residentProfileData, formatPhoneNumberOnInput]);


  // Effect to fetch resident's full profile for additional details like phone
  useEffect(() => {
    const fetchResidentProfile = async () => {
      if (currentUser?.uid && organizationId && propertyId) {
        try {
          const residentDocRef = doc(db, 'organizations', organizationId, 'properties', propertyId, 'residents', currentUser.uid);
          const residentDocSnap = await getDoc(residentDocRef);
          if (residentDocSnap.exists()) {
            setResidentProfileData(residentDocSnap.data() as Resident);
          } else {
            console.log('No such resident document!');
            setResidentProfileData(null);
          }
        } catch (error) {
          console.error("Error fetching resident profile:", error);
          setResidentProfileData(null);
        }
      } else {
        setResidentProfileData(null); // Clear if no user/org/prop
      }
    };

    fetchResidentProfile();
  }, [currentUser?.uid, organizationId, propertyId]);

  // Effect to fetch Phoenix services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setServicesLoading(true);
        setServicesError(null);
        const services = await getPhoenixServices(); // Fetches non-internal by default
        setPhoenixServices(services);
      } catch (err) {
        if (err instanceof Error) {
          setServicesError(err.message);
        } else {
          setServicesError('Failed to load service types.');
        }
        setPhoenixServices([]); // Clear services on error
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, []); // Empty dependency array to run once on mount

  // Effect to initialize Google Maps services
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

  // Effect to fetch and pre-populate property address
  useEffect(() => {
    const fetchAndSetPropertyAddress = async () => {
      if (currentUser && organizationId && propertyId && isLoaded && geocoderService.current) {
        if (isOffPremise) { // If user toggled to off-premise, don't auto-fetch/fill.
          // Optionally clear fields if desired when toggling to off-premise,
          // or let user type over. For now, just return.
          return;
        }

        setIsLoadingPropertyAddress(true);
        setPropertyAddressError(null);
        // Clear previous values before attempting to set new ones
        // setPropertyFullAddressString(null); 
        // setAutocompleteInputValue(''); 
        // setAutocompleteValue(null);
        // setServiceLocationObject(null);


        try {
          const propertyDocRef = doc(db, 'organizations', organizationId, 'properties', propertyId);
          const propertyDocSnap = await getDoc(propertyDocRef);

          if (propertyDocSnap.exists()) {
            const propertyData = propertyDocSnap.data() as Property;
            if (propertyData.address && propertyData.address.street && propertyData.address.city && propertyData.address.state && propertyData.address.zip) {
              const { street, city, state, zip } = propertyData.address;
              const fullAddress = `${street}, ${city}, ${state} ${zip}`;
              
              setPropertyFullAddressString(fullAddress);
              setAutocompleteInputValue(fullAddress); 

              geocoderService.current.geocode({ address: fullAddress }, (results, geocodeStatus) => {
                if (geocodeStatus === google.maps.GeocoderStatus.OK && results && results[0]) {
                  const place = results[0];
                  const placeTypeResult: PlaceType = {
                    description: place.formatted_address || fullAddress,
                    structured_formatting: {
                      main_text: results[0].address_components?.find(c => c.types.includes('street_number'))?.long_name + ' ' + results[0].address_components?.find(c => c.types.includes('route'))?.long_name || street,
                      secondary_text: results[0].address_components?.find(c => c.types.includes('locality'))?.long_name || city,
                      main_text_matched_substrings: [], 
                    },
                    place_id: place.place_id,
                  };
                  setAutocompleteValue(placeTypeResult);
                  setAutocompleteOptions(placeTypeResult ? [placeTypeResult] : []);

                  let streetNumber = '';
                  let routeValue = ''; // Renamed to avoid conflict with 'route' in scope
                  let currentCity = '';
                  let currentState = '';
                  let currentPostalCode = '';
                  let currentCountry = '';

                  place.address_components?.forEach((component) => {
                    const types = component.types;
                    if (types.includes('street_number')) streetNumber = component.long_name;
                    if (types.includes('route')) routeValue = component.long_name;
                    if (types.includes('locality')) currentCity = component.long_name;
                    else if (types.includes('postal_town') && !currentCity) currentCity = component.long_name;
                    else if (types.includes('sublocality_level_1') && !currentCity) currentCity = component.long_name;
                    if (types.includes('administrative_area_level_1')) currentState = component.short_name;
                    if (types.includes('postal_code')) currentPostalCode = component.long_name;
                    if (types.includes('country')) currentCountry = component.short_name;
                  });
                  const fullStreet = streetNumber ? `${streetNumber} ${routeValue}`.trim() : routeValue.trim();
                  setServiceLocationObject({
                    address_1: fullStreet,
                    city: currentCity,
                    state: currentState,
                    zipcode: currentPostalCode,
                    country: currentCountry,
                    fullAddress: place.formatted_address || fullAddress,
                  });
                } else {
                  console.error('Geocoding pre-filled property address failed: ' + geocodeStatus);
                  setPropertyAddressError('Could not verify your property address. Please enter address manually or use the "off-premise" toggle.');
                  setPropertyFullAddressString(null); 
                  setAutocompleteValue(null);
                  setServiceLocationObject(null);
                  setAutocompleteInputValue(''); // Clear input if geocoding fails
                }
              });
            } else {
              setPropertyAddressError('Your property address details are incomplete. Please enter address manually or use the "off-premise" toggle.');
               setAutocompleteInputValue(''); 
            }
          } else {
            setPropertyAddressError('Your property details could not be found. Please enter address manually or use the "off-premise" toggle.');
             setAutocompleteInputValue(''); 
          }
        } catch (err) {
          console.error('Error fetching property details:', err);
          setPropertyAddressError('Failed to load your property address. Please enter address manually or use the "off-premise" toggle.');
           setAutocompleteInputValue(''); 
        } finally {
          setIsLoadingPropertyAddress(false);
        }
      } else if (!propertyId && !isLoadingPropertyAddress && !isOffPremise) {
         // No propertyId associated, or user explicitly wants off-premise
        setPropertyFullAddressString(null);
        setAutocompleteInputValue('');
        setAutocompleteValue(null);
        setServiceLocationObject(null);
        // setPropertyAddressError(null); // Clear any previous errors
      }
    };

    fetchAndSetPropertyAddress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, organizationId, propertyId, isLoaded, isOffPremise]); // Rerun if isOffPremise changes

  // Debounced function to fetch place predictions
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
            // Provide an empty array or handle as appropriate if no input or service not ready
            callback([], google.maps.places.PlacesServiceStatus.OK);
          }
        },
        400 // Debounce time in ms
      ),
    [] // Empty dependency array: the function is created once and memoized
  );

  // Effect to update autocomplete options based on input
  useEffect(() => {
    let active = true;

    // If address is pre-filled from property and not off-premise,
    // and input hasn't changed from the pre-filled string, keep existing options.
    if (propertyFullAddressString && !isOffPremise && autocompleteInputValue === propertyFullAddressString && autocompleteValue) {
      setAutocompleteOptions([autocompleteValue]);
      return undefined;
    }

    if (
      !autocompleteService.current ||
      autocompleteInputValue === '' ||
      (autocompleteValue &&
        autocompleteInputValue === autocompleteValue.description && !isOffPremise) // also check !isOffPremise here
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
        if (
          active &&
          status === google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          const newOptions: PlaceType[] = results.map((p) => ({
            description: p.description,
            structured_formatting: p.structured_formatting,
            place_id: p.place_id,
          }));
          setAutocompleteOptions(newOptions);
        } else if (active) {
          // Handle ZERO_RESULTS or other statuses by clearing options or showing existing value
          setAutocompleteOptions(autocompleteValue ? [autocompleteValue] : []);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [autocompleteInputValue, autocompleteValue, fetchPlacePredictions, isOffPremise, propertyFullAddressString]);

  const handleAutocompleteChange = useCallback(
    (_event: React.SyntheticEvent, newValue: PlaceType | null) => {
      setAutocompleteOptions(
        newValue ? [newValue, ...autocompleteOptions] : autocompleteOptions
      );
      setAutocompleteValue(newValue);
      // Clear our custom serviceLocation state if the autocomplete is cleared
      if (!newValue) {
        // setServiceLocation(''); // Clear the old string-based location - Removed as serviceLocation is unused
        setServiceLocationObject(null); // Clear the new object-based location
        // setAutocompleteInputValue(''); // Keep input value if user is still typing, or clear if desired
        return;
      }

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
              let currentCountry = '';

              place.address_components?.forEach((component) => {
                const types = component.types;
                if (types.includes('street_number'))
                  streetNumber = component.long_name;
                if (types.includes('route')) route = component.long_name;
                if (types.includes('locality'))
                  currentCity = component.long_name;
                else if (types.includes('postal_town') && !currentCity)
                  currentCity = component.long_name;
                // Fallback for some UK addresses
                else if (types.includes('sublocality_level_1') && !currentCity)
                  currentCity = component.long_name; // Fallback

                if (types.includes('administrative_area_level_1'))
                  currentState = component.short_name;
                if (types.includes('postal_code'))
                  currentPostalCode = component.long_name;
                if (types.includes('country'))
                  currentCountry = component.short_name;
              });

              const fullStreet = streetNumber
                ? `${streetNumber} ${route}`.trim()
                : route.trim();

              setServiceLocationObject({
                address_1: fullStreet,
                city: currentCity,
                state: currentState,
                zipcode: currentPostalCode,
                country: currentCountry,
                fullAddress: place.formatted_address || newValue.description,
              });
              // Update the old serviceLocation string state for now, or decide if it's still needed
              // setServiceLocation(place.formatted_address || newValue.description); // Removed as serviceLocation is unused
              // setAutocompleteInputValue(place.formatted_address || newValue.description); // Update input to reflect full address
            } else {
              console.error('Geocoder failed due to: ' + geocodeStatus);
              // Fallback to description if geocoding fails
              setServiceLocationObject({ fullAddress: newValue.description });
              // setServiceLocation(newValue.description); // Removed as serviceLocation is unused
            }
          }
        );
      } else if (newValue) {
        // If no place_id, use description (less ideal)
        setServiceLocationObject({ fullAddress: newValue.description });
        // setServiceLocation(newValue.description); // Removed as serviceLocation is unused
      }
    },
    [
      autocompleteOptions,
      setAutocompleteOptions,
      setAutocompleteValue,
      setServiceLocationObject,
    ]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!currentUser || !organizationId || !propertyId) {
        setError(
          'User not properly authenticated or missing organization/property association.'
        );
        return;
      }
      if (
        selectedPhoenixServices.length === 0 || // Updated validation for multi-select
        !serviceLocationObject || // Updated validation
        !serviceDateTime ||
        !phone.trim()
      ) {
        const missingFields = [];
        if (selectedPhoenixServices.length === 0)
          missingFields.push('service type');
        if (!serviceLocationObject) missingFields.push('service location');
        if (!serviceDateTime) missingFields.push('service date/time');
        if (!phone.trim()) missingFields.push('contact phone');

        setError(`Please select/provide: ${missingFields.join(', ')}.`);
        return;
      }

      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      // Prepare serviceTypes for backend: array of {id, value}
      const serviceTypesForSubmission = selectedPhoenixServices.map(
        (service) => ({
          id: service.value, // service.value holds the id
          value: service.label, // service.label holds the name
        })
      );

      const dataToSubmit = {
        organizationId,
        propertyId,
        residentNotes: residentNotes.trim(),
        serviceDateTime: serviceDateTime ? serviceDateTime.toISOString() : null,
        phone: phone.trim(),
        description: '', // Keep if backend uses it, or remove. For now, keep.

        // New fields for Phoenix integration
        smsConsent: smsConsent,
        serviceLocationAddress: serviceLocationObject, // This is the structured address object
      // serviceTypeId: selectedPhoenixServiceId, // Replaced by serviceTypesForSubmission
      // serviceTypeValue: selectedServiceName, // Replaced by serviceTypesForSubmission
      serviceTypes: serviceTypesForSubmission, // Array of {id, value} objects
      isOffPremiseRequest: (!!propertyFullAddressString && !propertyAddressError && isOffPremise) || (!propertyFullAddressString && !propertyAddressError), // True if prop address was available and toggle is on, OR if no prop address was available (implies off-premise by default)
      
      // Add vehicle details if selected
      car_year: selectedVehicle ? selectedVehicle.year : undefined,
      car_make: selectedVehicle ? selectedVehicle.make : undefined,
      car_model: selectedVehicle ? selectedVehicle.model : undefined,
      car_color: selectedVehicle ? selectedVehicle.color : undefined,
    };

    try {
        const createServiceRequest = httpsCallable(
          functions,
          'createServiceRequest'
        );
        const result = await createServiceRequest(dataToSubmit);
        const responseData =
          result.data as CreateServiceRequestCallableResponse;

        if (responseData.success) {
          setSuccessMessage(
            responseData.message || 'Service request submitted successfully!'
          );
          // Reset new fields
          setSelectedPhoenixServices([]); // Reset for multi-select
          setAutocompleteValue(null);
          setAutocompleteInputValue('');
          setServiceLocationObject(null);
          // setServiceLocation(''); // Also clear the old string state if it's still used by autocomplete display - Removed as serviceLocation is unused
          setSmsConsent(false);
          setSelectedVehicle(null); // Reset selected vehicle
          // Reset existing fields
          setServiceDateTime(new Date());
          setResidentNotes('');
          setPhone(''); // This will be reset
          onServiceRequestSubmitted();
        } else {
          setError(responseData.message || 'Failed to submit service request.');
        }
      } catch (err: unknown) {
        console.error('Error submitting service request:', err);
        if (err instanceof Error) {
          setError(
            err.message || 'An unexpected error occurred. Please try again.'
          );
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      currentUser,
      organizationId,
      propertyId,
      selectedPhoenixServices,
      serviceLocationObject,
      serviceDateTime,
      phone,
      residentNotes,
      smsConsent,
      selectedVehicle, // Added selectedVehicle to dependencies
      onServiceRequestSubmitted,
      isOffPremise,
      propertyAddressError,
      propertyFullAddressString
      // setError, setSuccessMessage, setSubmitting, setSelectedPhoenixServices,
      // setAutocompleteValue, setAutocompleteInputValue, setServiceLocationObject,
      // setSmsConsent, setServiceDateTime, setResidentNotes, setPhone, setSelectedVehicle (state setters are stable)
    ]
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component='form' onSubmit={handleSubmit} noValidate>
        {/* <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Service Request Form
        </Typography> */}

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
            }}
          >
            <TextField
              label='Name'
              value={residentName}
              fullWidth
              slotProps={{
                input: { readOnly: true },
              }}
            />
            <TextField
              label='Email'
              value={email}
              fullWidth
              slotProps={{
                input: { readOnly: true },
              }}
              sx={isMobile ? { mt: 2 } : {}}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
            }}
          >
            <TextField
              label='Contact Phone'
              name='phone'
              value={phone}
              onChange={(e) => {
                const formattedPhoneNumber = formatPhoneNumberOnInput(
                  e.target.value
                );
                setPhone(formattedPhoneNumber);
              }}
              required
              fullWidth
              disabled={submitting}
              inputProps={{ maxLength: 14 }} // (xxx) xxx-xxxx is 14 chars
            />
            <DateTimePicker
              label='Service Date & Time'
              value={serviceDateTime}
              onChange={(newValue) => setServiceDateTime(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
              disabled={submitting}
            />
          </Box>

          {/* Google Places Autocomplete for Service Location */}
          {isLoaded && apiKey && (
            <Autocomplete<PlaceType, false, false, false>
              id='google-maps-service-location'
              sx={{ width: '100%' }}
              getOptionLabel={(option) => option.description}
              filterOptions={(x) => x} // Options are already filtered by Google
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Service Location Search'
                  fullWidth
                  required
                  error={!serviceLocationObject && submitting} // Example error state
                  helperText={
                    !serviceLocationObject && submitting && !isLoadingPropertyAddress
                      ? 'Service location is required.'
                      : propertyAddressError || '' // Display property address error here as well
                  }
                  disabled={submitting || !isLoaded || isLoadingPropertyAddress || (!!propertyFullAddressString && !isOffPremise && !propertyAddressError)}
                  InputProps={{
                    ...params.InputProps,
                    readOnly: !!propertyFullAddressString && !isOffPremise && !propertyAddressError && !isLoadingPropertyAddress,
                  }}
                />
              )}
              disabled={isLoadingPropertyAddress || (!!propertyFullAddressString && !isOffPremise && !propertyAddressError)} // Disable Autocomplete itself
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
          {!isLoaded && !loadError && apiKey && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                my: 1,
                alignItems: 'center',
              }}
            >
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant='caption'>
                Loading address search...
              </Typography>
            </Box>
          )}
          {isLoadingPropertyAddress && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1, alignItems: 'center' }}>
              <CircularProgress size={20} sx={{mr: 1}} /> 
              <Typography variant="caption">Loading property address...</Typography>
            </Box>
          )}
          {propertyAddressError && !isLoadingPropertyAddress && (
            <Alert severity='warning' sx={{ mb: 1 }}> 
              {propertyAddressError}
            </Alert>
          )}
          {loadError && (
            <Alert severity='error' sx={{ mb: 1 }}>
              Error loading Google Maps: {loadError.message}
            </Alert>
          )}
          {!apiKey && (
            <Alert severity='warning' sx={{ mb: 1 }}>
              Google Maps API key is missing. Address search is disabled.
            </Alert>
          )}

          {/* Off-premise toggle */}
          {propertyFullAddressString && !propertyAddressError && !isLoadingPropertyAddress && (
            <FormControlLabel
              control={
                <Switch
                  checked={isOffPremise}
                  onChange={(e) => {
                    const newIsOffPremise = e.target.checked;
                    setIsOffPremise(newIsOffPremise);
                    if (!newIsOffPremise) {
                      // If toggling back to on-premise, re-apply property address
                      if (propertyFullAddressString) {
                        setAutocompleteInputValue(propertyFullAddressString);
                        // Re-trigger geocoding by clearing autocompleteValue, effect will pick it up
                        // Or directly call the geocode logic if it's extracted
                        // For simplicity, the main useEffect will re-run due to isOffPremise change
                      }
                    } else {
                      // Toggling to off-premise: clear the fields for new input
                      setAutocompleteInputValue('');
                      setAutocompleteValue(null);
                      setServiceLocationObject(null);
                      setAutocompleteOptions([]);
                    }
                  }}
                  name="isOffPremise"
                  color="primary"
                  disabled={submitting || isLoadingPropertyAddress}
                />
              }
              label="Use a different service location (off-premise)"
              sx={{ mb: 1 }}
            />
          )}

          {/* Service Type Dropdown using ReactSelect */}
          <Box sx={{ my: 1 }}>
            {' '}
            {/* Add some margin if needed */}
            <Typography
              variant='caption'
              display='block'
              sx={{
                mb: 0.5,
                color: servicesError
                  ? theme.palette.error.main
                  : 'text.secondary',
              }}
            >
              Service Type*
            </Typography>
            <ReactSelect
              inputId='phoenix-service-type-react-select'
              options={phoenixServices.map((service) => ({
                value: service.id,
                label: service.name,
              }))}
              value={selectedPhoenixServices}
              onChange={(selectedOptions) => {
                setSelectedPhoenixServices(
                  selectedOptions as ReadonlyArray<{
                    value: number;
                    label: string;
                  }>
                );
              }}
              isMulti // Enable multi-select
              isClearable // Already enabled, ensure it stays
              isSearchable // True by default, can be explicit
              isLoading={servicesLoading}
              isDisabled={submitting || servicesLoading || !!servicesError}
              placeholder={
                servicesLoading
                  ? 'Loading services...'
                  : servicesError
                  ? 'Error loading services'
                  : 'Select service type(s)...'
              }
              closeMenuOnSelect={false} // Useful for multi-select
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,

                  boxShadow: state.isFocused
                    ? `0 0 0 1px ${theme.palette.primary.main}`
                    : 'none',
                  minHeight: '56px', // Match MUI TextField height
                  backgroundColor: theme.palette.background.paper, // Ensure background for dark/light mode
                  borderRadius: theme.shape.borderRadius, // Added to match MUI TextField
                }),
                menu: (baseStyles) => ({
                  ...baseStyles,
                  zIndex: theme.zIndex.modal + 1, // Ensure dropdown is above other elements like modals
                  backgroundColor: theme.palette.background.paper,
                }),
                option: (baseStyles, state) => ({
                  ...baseStyles,
                  backgroundColor: state.isSelected
                    ? theme.palette.primary.main
                    : state.isFocused
                    ? theme.palette.action.hover
                    : theme.palette.background.paper,
                  color: state.isSelected
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
                  '&:active': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }),
                placeholder: (baseStyles) => ({
                  ...baseStyles,
                  color: theme.palette.text.secondary,
                }),
                input: (baseStyles) => ({
                  ...baseStyles,
                  color: theme.palette.text.primary,
                }),
                singleValue: (baseStyles) => ({
                  // Though this is multi-select, good to have if ever switched
                  ...baseStyles,
                  color: theme.palette.text.primary,
                }),
                multiValue: (baseStyles) => ({
                  ...baseStyles,
                  backgroundColor: theme.palette.action.selected,
                }),
                multiValueLabel: (baseStyles) => ({
                  ...baseStyles,
                  color: theme.palette.text.primary,
                }),
                multiValueRemove: (baseStyles) => ({
                  ...baseStyles,
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.palette.error.main,
                    color: theme.palette.error.contrastText,
                  },
                }),
              }}
            />
            {servicesError && (
              <Typography color='error' variant='caption' sx={{ mt: 0.5 }}>
                {servicesError}
              </Typography>
            )}
          </Box>

          {/* Vehicle Selection Dropdown */}
          {residentProfileData?.vehicles && residentProfileData.vehicles.length > 0 && (
            <Box sx={{ my: 1 }}>
              <Typography
                variant='caption'
                display='block'
                sx={{ mb: 0.5, color: 'text.secondary' }}
              >
                Select Vehicle
              </Typography>
              <ReactSelect
                inputId='resident-vehicle-select'
                options={residentProfileData.vehicles.map((vehicle) => ({
                  value: vehicle, // Store the whole vehicle object
                  label: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.color}) - ${vehicle.plate}`,
                }))}
                value={selectedVehicle ? { value: selectedVehicle, label: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.color}) - ${selectedVehicle.plate}` } : null}
                onChange={(selectedOption) => {
                  setSelectedVehicle(selectedOption ? selectedOption.value : null);
                }}
                isClearable
                isSearchable
                isDisabled={submitting}
                placeholder="Select your vehicle..."
                styles={{ // Apply similar styling as Service Type for consistency
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    boxShadow: state.isFocused ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
                    minHeight: '56px',
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: theme.shape.borderRadius,
                  }),
                  menu: (baseStyles) => ({
                    ...baseStyles,
                    zIndex: theme.zIndex.modal, // Standard zIndex for dropdowns
                    backgroundColor: theme.palette.background.paper,
                  }),
                  option: (baseStyles, state) => ({
                    ...baseStyles,
                    backgroundColor: state.isSelected ? theme.palette.primary.main : state.isFocused ? theme.palette.action.hover : theme.palette.background.paper,
                    color: state.isSelected ? theme.palette.primary.contrastText : theme.palette.text.primary,
                    '&:active': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  }),
                  placeholder: (baseStyles) => ({ ...baseStyles, color: theme.palette.text.secondary }),
                  input: (baseStyles) => ({ ...baseStyles, color: theme.palette.text.primary }),
                  singleValue: (baseStyles) => ({ ...baseStyles, color: theme.palette.text.primary }),
                }}
              />
            </Box>
          )}

          {/* SMS Consent Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                name='smsConsent'
                color='primary'
                disabled={submitting}
              />
            }
            label='I consent to receive SMS messages regarding this service request.'
          />

          <TextField
            label='Additional Notes (e.g., vehicle make/model, specific issue details)'
            name='residentNotes'
            value={residentNotes}
            onChange={(e) => setResidentNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={submitting}
          />

          <Button
            type='submit'
            variant='contained'
            disabled={submitting}
            fullWidth
            sx={{ mt: 1 }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Request'}
          </Button>
        </Stack>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          message={successMessage}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default CreateServiceRequestForm;
