import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Stack,
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { usePropertyManagerContext } from '../../hooks/usePropertyManagerContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../hooks/useAuth';

const ReportViolationPage = () => {
  const { selectedPropertyId } = usePropertyManagerContext();
  const { organizationId } = useAuth();
  const [licensePlate, setLicensePlate] = useState('');
  const [violationType, setViolationType] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPhoto(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPropertyId || !organizationId) {
      setError('Please select a property first.');
      return;
    }
    if (!licensePlate || !violationType || !photo) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Upload photo to Firebase Storage
      const storage = getStorage();
      const photoRef = ref(
        storage,
        `violations/${organizationId}/${selectedPropertyId}/${Date.now()}_${
          photo.name
        }`
      );
      await uploadBytes(photoRef, photo);
      const photoURL = await getDownloadURL(photoRef);

      // 2. Call the createViolationReport cloud function
      const functions = getFunctions();
      const createViolationReport = httpsCallable(
        functions,
        'createViolationReport'
      );

      await createViolationReport({
        organizationId,
        propertyId: selectedPropertyId,
        licensePlate,
        violationType,
        photoUrl: photoURL,
      });

      setLoading(false);
      setSuccess('Violation reported successfully!');
      setLicensePlate('');
      setViolationType('');
      setPhoto(null);
    } catch (err) {
      console.error(err);
      setError('Failed to report violation. Please try again.');
      setLoading(false);
    }
  };

  if (!selectedPropertyId) {
    return (
      <Box>
        <Typography>
          Please select a property from the dashboard to report a violation.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component='form' noValidate autoComplete='off' onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label='License Plate'
        variant='outlined'
        margin='normal'
        value={licensePlate}
        onChange={(e) => setLicensePlate(e.target.value)}
        required
      />
      <FormControl fullWidth margin='normal' required>
        <InputLabel>Violation Type</InputLabel>
        <Select
          label='Violation Type'
          value={violationType}
          onChange={(e) => setViolationType(e.target.value)}
        >
          <MenuItem value='fire_lane'>Fire Lane</MenuItem>
          <MenuItem value='unauthorized_parking'>Unauthorized Parking</MenuItem>
          <MenuItem value='blocking_driveway'>Blocking Driveway</MenuItem>
          <MenuItem value='double_parked'>Double Parked</MenuItem>
          <MenuItem value='other'>Other</MenuItem>
        </Select>
      </FormControl>
      <Box mt={2}>
        <Typography variant='subtitle1' gutterBottom>
          Violation Photo
        </Typography>
        <Stack direction='row' alignItems='center' spacing={2}>
          <Button variant='contained' component='label'>
            Upload File
            <input
              type='file'
              hidden
              accept='image/*'
              onChange={handlePhotoChange}
            />
          </Button>
          <IconButton
            color='primary'
            aria-label='upload picture'
            component='label'
          >
            <input
              hidden
              accept='image/*'
              type='file'
              onChange={handlePhotoChange}
              capture='environment'
            />
            <PhotoCamera />
          </IconButton>
          {photo && (
            <Typography sx={{ display: 'inline', ml: 2 }}>
              {photo.name}
            </Typography>
          )}
        </Stack>
      </Box>
      {error && (
        <Typography color='error' sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {success && (
        <Typography color='success.main' sx={{ mt: 2 }}>
          {success}
        </Typography>
      )}
      <Box mt={3}>
        <Button
          type='submit'
          variant='contained'
          color='primary'
          fullWidth
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Report'}
        </Button>
      </Box>
    </Box>
  );
};

export default ReportViolationPage;
