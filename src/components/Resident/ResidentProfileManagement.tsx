import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { Resident } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';

interface UpdateResidentProfileData {
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
}

const ResidentProfileManagement: React.FC = () => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const [profile, setProfile] = useState<Partial<Resident>>({
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    licensePlate: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const residentDocPath =
    organizationId && propertyId && currentUser?.uid
      ? `organizations/${organizationId}/properties/${propertyId}/residents/${currentUser.uid}`
      : null;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!residentDocPath) {
        setError(
          'Could not determine resident profile path. User details missing.'
        );
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const residentDocRef = doc(db, residentDocPath);
        const residentDocSnap = await getDoc(residentDocRef);

        if (residentDocSnap.exists()) {
          const data = residentDocSnap.data() as Resident;
          setProfile({
            displayName: data.displayName,
            email: data.email,
            unitNumber: data.unitNumber,
            vehicleMake: data.vehicleMake || '',
            vehicleModel: data.vehicleModel || '',
            vehicleColor: data.vehicleColor || '',
            licensePlate: data.licensePlate || '',
          });
        } else {
          setError('Resident profile not found.');
        }
      } catch (err) {
        console.error('Error fetching resident profile:', err);
        setError('Failed to fetch profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, residentDocPath]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!residentDocPath) {
      setError('Cannot save profile. User details missing.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const dataToUpdate: UpdateResidentProfileData = {
      vehicleMake: profile.vehicleMake,
      vehicleModel: profile.vehicleModel,
      vehicleColor: profile.vehicleColor,
      licensePlate: profile.licensePlate,
    };

    try {
      // Assuming you will create a callable function 'updateResidentProfile'
      const updateResidentProfile = httpsCallable(
        functions,
        'updateResidentProfile'
      );
      await updateResidentProfile(dataToUpdate);

      // Optimistically update local state or refetch, for now just show success
      setSuccessMessage('Profile updated successfully!');
    } catch (err: unknown) {
      // Changed from any to unknown
      console.error('Error updating profile:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to update profile. Please try again.');
      } else {
        setError(
          'An unexpected error occurred while updating profile. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Typography variant='h5' gutterBottom sx={{ mb: 3 }}>
        Manage Your Profile
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant='subtitle1' gutterBottom>
        <strong>Name:</strong> {profile.displayName || 'N/A'}
      </Typography>
      <Typography variant='subtitle1' gutterBottom>
        <strong>Email:</strong> {profile.email || 'N/A'}
      </Typography>
      <Typography variant='subtitle1' gutterBottom sx={{ mb: 3 }}>
        <strong>Unit:</strong> {profile.unitNumber || 'N/A'}
      </Typography>

      <Typography
        variant='h6'
        gutterBottom
        component='div'
        sx={{ mb: 2, mt: 2, borderTop: '1px solid #eee', pt: 2 }}
      >
        Vehicle Information
      </Typography>
      <Box
        component='form'
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          fullWidth
          name='vehicleMake'
          label='Vehicle Make'
          value={profile.vehicleMake}
          onChange={handleChange}
          disabled={saving}
        />
        <TextField
          fullWidth
          name='vehicleModel'
          label='Vehicle Model'
          value={profile.vehicleModel}
          onChange={handleChange}
          disabled={saving}
        />
        <TextField
          fullWidth
          name='vehicleColor'
          label='Vehicle Color'
          value={profile.vehicleColor}
          onChange={handleChange}
          disabled={saving}
        />
        <TextField
          fullWidth
          name='licensePlate'
          label='License Plate'
          value={profile.licensePlate}
          onChange={handleChange}
          disabled={saving}
        />
        <Button
          type='submit'
          variant='contained'
          sx={{ mt: 3, mb: 2 }}
          disabled={saving || loading}
        >
          {saving ? <CircularProgress size={24} /> : 'Save Vehicle Information'}
        </Button>
      </Box>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </>
  );
};

export default ResidentProfileManagement;
