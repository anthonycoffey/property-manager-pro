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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton, 
  Stack, // Using Stack for layout
  Divider, // Added Divider
} from '@mui/material';
import {
  ManageAccounts as ManageAccountsIcon,
  Badge as BadgeIcon,
  Email as EmailIcon,
  MeetingRoom as MeetingRoomIcon,
  DirectionsCar as DirectionsCarIcon,
  Save as SaveIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  DeleteOutline as DeleteOutlineIcon, // Changed from RemoveCircleOutlineIcon
} from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { Resident, Vehicle } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';

interface UpdateResidentProfilePayload {
  vehicles?: Vehicle[];
}

const ResidentProfileManagement: React.FC = () => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const [profile, setProfile] = useState<Partial<Resident> & { vehicles: Vehicle[] }>({
    displayName: '',
    email: '',
    unitNumber: '',
    vehicles: [],
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
        setError('Could not determine resident profile path. User details missing.');
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
            vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
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

    if (currentUser) {
        fetchProfile();
    }
  }, [currentUser, residentDocPath]);

  const handleVehicleChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const updatedVehicles = [...profile.vehicles];
    
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [name]: name === 'year' ? (value === '' ? '' : parseInt(value, 10)) : value,
    };
    setProfile(prev => ({ ...prev, vehicles: updatedVehicles }));
  };

  const handleAddVehicle = () => {
    if (profile.vehicles.length < 2) {
      // Changed year to 0 to represent an empty field initially
      const newVehicle: Vehicle = { make: '', model: '', year: 0, color: '', plate: '' };
      setProfile(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
    }
  };

  const handleRemoveVehicle = (index: number) => {
    setProfile(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!residentDocPath) {
      setError('Cannot save profile. User details missing.');
      return;
    }

    // Client-side validation
    for (const vehicle of profile.vehicles) {
      if (!vehicle.make || !vehicle.model || !vehicle.year || !vehicle.color || !vehicle.plate) {
        setError('All fields for each vehicle are required.');
        return;
      }
      if (isNaN(vehicle.year) || vehicle.year < 1900 || vehicle.year > new Date().getFullYear() + 2) {
        setError(`Invalid year for vehicle: ${vehicle.make} ${vehicle.model}. Please enter a valid year.`);
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const dataToUpdate: UpdateResidentProfilePayload = {
      vehicles: profile.vehicles,
    };

    try {
      const updateResidentProfileFn = httpsCallable(functions, 'updateResidentProfile');
      await updateResidentProfileFn(dataToUpdate);
      setSuccessMessage('Profile updated successfully!');
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      if (err instanceof Error && (err as any).details) { // HttpsError has details
        setError((err as any).details.message || 'Failed to update profile.');
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to update profile. Please try again.');
      } else {
        setError('An unexpected error occurred while updating profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ManageAccountsIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
        <Typography variant="h5" component="div">
          Manage Your Profile
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List sx={{ width: '100%', bgcolor: 'background.paper', mb: 3 }}>
        <ListItem>
          <ListItemIcon><BadgeIcon /></ListItemIcon>
          <ListItemText primary="Name" secondary={profile.displayName || 'N/A'} />
        </ListItem>
        <ListItem>
          <ListItemIcon><EmailIcon /></ListItemIcon>
          <ListItemText primary="Email" secondary={profile.email || 'N/A'} />
        </ListItem>
        <ListItem>
          <ListItemIcon><MeetingRoomIcon /></ListItemIcon>
          <ListItemText primary="Unit" secondary={profile.unitNumber || 'N/A'} />
        </ListItem>
      </List>

      {/* Form now wraps the Paper and the submit button will be outside/after this Paper */}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Paper elevation={0} sx={{ p: 3, mt: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}> {/* Changed elevation, added border for definition */}
          {/* Header for Vehicle Information and Add Vehicle Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DirectionsCarIcon sx={{ mr: 1 }} color="action" />
              <Typography variant="h6" component="div">
                Vehicle Information (Max 2)
              </Typography>
            </Box>
            {profile.vehicles.length < 2 && (
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleAddVehicle}
                disabled={saving || profile.vehicles.length >= 2}
                size="small"
              >
                Add Vehicle
              </Button>
            )}
          </Box>

          {profile.vehicles.length > 0 && <Divider sx={{ my: 2 }} />}

          <Stack spacing={3} mb={2}>
            {profile.vehicles.map((vehicle, index) => (
              // Removed inner Paper, using Box with border and padding
              <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                <Stack spacing={2}>
                  <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Typography variant="subtitle1" gutterBottom>Vehicle {index + 1}</Typography>
                    <IconButton onClick={() => handleRemoveVehicle(index)} color="error" size="small" disabled={saving}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                  <TextField
                    fullWidth
                    name="make"
                    label="Make"
                    value={vehicle.make}
                    onChange={(e) => handleVehicleChange(index, e)}
                    disabled={saving}
                    required
                  />
                  <TextField
                    fullWidth
                    name="model"
                    label="Model"
                    value={vehicle.model}
                    onChange={(e) => handleVehicleChange(index, e)}
                    disabled={saving}
                    required
                  />
                  <TextField
                    fullWidth
                    name="year"
                    label="Year"
                    type="number"
                    value={vehicle.year === 0 ? '' : vehicle.year} // Show empty if year is 0 (initial)
                    onChange={(e) => handleVehicleChange(index, e)}
                    disabled={saving}
                    required
                    InputProps={{ inputProps: { min: 1900, max: new Date().getFullYear() + 2 } }}
                  />
                  <TextField
                    fullWidth
                    name="color"
                    label="Color"
                    value={vehicle.color}
                    onChange={(e) => handleVehicleChange(index, e)}
                    disabled={saving}
                    required
                  />
                  <TextField
                    fullWidth
                    name="plate"
                    label="License Plate"
                    value={vehicle.plate}
                    onChange={(e) => handleVehicleChange(index, e)}
                    disabled={saving}
                    required
                  />
                </Stack>
              </Box> 
            ))}
          </Stack>
          {/* This button was duplicated and should be removed from inside the Paper */}
        </Paper> {/* Closing Paper for vehicle section */}
        
        {/* Save Profile Button moved outside the Paper, but still within the form Box */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving || loading}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box> {/* Closing Form Box */}
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
