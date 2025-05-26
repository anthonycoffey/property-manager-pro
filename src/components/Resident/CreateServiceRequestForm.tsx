import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  Snackbar,
  Stack,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Changed from AdapterDateFnsV3
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from '../../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig'; // db import removed as not used here directly

interface CreateServiceRequestFormProps {
  onServiceRequestSubmitted: () => void;
}

interface CreateServiceRequestCallableResponse {
  success: boolean;
  message?: string;
  serviceRequestId?: string;
}

// User-updated service types for roadside assistance
const roadsideServiceTypes = [
  'Flat Tire Change',
  'Battery Jump Start',
  'Battery Replacement',
  'Locksmith Service',
  'Fuel Delivery',
  'Towing',
  'Other Roadside Assistance',
];

const CreateServiceRequestForm: React.FC<CreateServiceRequestFormProps> = ({
  onServiceRequestSubmitted,
}) => {
  const { currentUser, organizationId, propertyId } = useAuth();

  const [residentName, setResidentName] = useState(
    currentUser?.displayName || ''
  );
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [serviceLocation, setServiceLocation] = useState('');
  const [requestType, setRequestType] = useState<string>('');
  const [serviceDateTime, setServiceDateTime] = useState<Date | null>(
    new Date()
  );
  const [residentNotes, setResidentNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setResidentName(currentUser?.displayName || '');
    setEmail(currentUser?.email || '');
  }, [currentUser]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !organizationId || !propertyId) {
      setError(
        'User not properly authenticated or missing organization/property association.'
      );
      return;
    }
    if (
      !requestType ||
      !serviceLocation.trim() ||
      !serviceDateTime ||
      !phone.trim()
    ) {
      setError(
        'Please select a service type, service date/time, provide a contact phone, and service location.'
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const dataToSubmit = {
      organizationId,
      propertyId,
      requestType,
      residentNotes: residentNotes.trim(),
      serviceDateTime: serviceDateTime ? serviceDateTime.toISOString() : null,
      phone: phone.trim(),
      serviceLocation: serviceLocation.trim(),
      description: '', // Sending empty description as per new form structure
    };

    try {
      const createServiceRequest = httpsCallable(
        functions,
        'createServiceRequest'
      );
      const result = await createServiceRequest(dataToSubmit);
      const responseData = result.data as CreateServiceRequestCallableResponse;

      if (responseData.success) {
        setSuccessMessage(
          responseData.message || 'Service request submitted successfully!'
        );
        setRequestType('');
        setServiceLocation('');
        setServiceDateTime(new Date());
        setResidentNotes('');
        setPhone('');
        onServiceRequestSubmitted();
      } else {
        setError(responseData.message || 'Failed to submit service request.');
      }
    } catch (err: unknown) {
      // Changed from any to unknown
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
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component='form' onSubmit={handleSubmit} noValidate>
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Service Request Form
        </Typography>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label='Name'
              value={residentName}
              fullWidth
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              label='Email'
              value={email}
              fullWidth
              InputProps={{
                readOnly: true,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label='Contact Phone'
              name='phone'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              fullWidth
              disabled={submitting}
            />
            <DateTimePicker
              label='Service Date & Time'
              value={serviceDateTime}
              onChange={(newValue) => setServiceDateTime(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
              disabled={submitting}
            />
          </Box>

          <TextField
            label='Service Location (e.g., Address, Cross-streets, Parking Lot Section)'
            name='serviceLocation'
            value={serviceLocation}
            onChange={(e) => setServiceLocation(e.target.value)}
            required
            fullWidth
            multiline
            rows={2}
            disabled={submitting}
          />

          <FormControl fullWidth required>
            <InputLabel id='roadside-service-type-label'>
              Service Type
            </InputLabel>
            <Select
              labelId='roadside-service-type-label'
              value={requestType}
              label='Service Type'
              onChange={(e: SelectChangeEvent<string>) =>
                setRequestType(e.target.value as string)
              }
              disabled={submitting}
            >
              {roadsideServiceTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
            sx={{ mt: 1 }} // Adjusted margin top
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
