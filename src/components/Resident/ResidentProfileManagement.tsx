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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
  Edit as EditIcon, // Added EditIcon
  Phone as PhoneIcon, // Added for phone field
  PersonPin as PersonPinIcon, // Added for Personal Details section
} from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { Resident, Vehicle } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import { useCallback } from 'react'; // Added for useCallback

interface UpdateResidentProfilePayload {
  vehicles?: Vehicle[];
  phone?: string; // Added phone
}

const ResidentProfileManagement: React.FC = () => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const [profile, setProfile] = useState<
    Partial<Resident> & { vehicles: Vehicle[]; phone: string } // Added phone to state type
  >({
    displayName: '',
    email: '',
    unitNumber: '',
    phone: '', // Initialize phone
    vehicles: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [vehicleToDeleteIndex, setVehicleToDeleteIndex] = useState<
    number | null
  >(null);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] =
    useState<boolean>(false);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(
    null
  );
  const [currentVehicleFormData, setCurrentVehicleFormData] = useState<Vehicle>(
    { make: '', model: '', year: 0, color: '', plate: '' }
  );

  // Phone number formatting utility
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
            phone: formatPhoneNumberOnInput(data.phone || ''), // Format phone on load
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
  }, [currentUser, residentDocPath, formatPhoneNumberOnInput]);

  const handleProfileChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      setProfile((prev) => ({
        ...prev,
        [name]: formatPhoneNumberOnInput(value),
      }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddVehicle = () => {
    // This function will now open the dialog
    if (profile.vehicles.length < 2) {
      setEditingVehicleIndex(null); // Indicates adding a new vehicle
      setCurrentVehicleFormData({
        make: '',
        model: '',
        year: 0, // Or a sensible default like current year, or leave as 0 for empty
        color: '',
        plate: '',
      });
      setIsVehicleDialogOpen(true);
    }
  };

  const handleOpenDeleteConfirm = (index: number) => {
    setVehicleToDeleteIndex(index);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setVehicleToDeleteIndex(null);
    setDeleteConfirmOpen(false);
  };

  const handleConfirmRemoveVehicle = () => {
    if (vehicleToDeleteIndex !== null) {
      setProfile((prev) => ({
        ...prev,
        vehicles: prev.vehicles.filter((_, i) => i !== vehicleToDeleteIndex),
      }));
    }
    handleCloseDeleteConfirm();
  };

  const handleEditVehicle = (index: number) => {
    setEditingVehicleIndex(index);
    setCurrentVehicleFormData({ ...profile.vehicles[index] });
    setIsVehicleDialogOpen(true);
  };

  const handleVehicleDialogClose = () => {
    setIsVehicleDialogOpen(false);
    setEditingVehicleIndex(null); // Reset editing index
  };

  const handleVehicleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setCurrentVehicleFormData((prev) => ({
      ...prev,
      [name]:
        name === 'year' ? (value === '' ? 0 : parseInt(value, 10)) : value,
    }));
  };

  const handleVehicleDialogSave = () => {
    // Basic validation (can be enhanced)
    if (
      !currentVehicleFormData.make ||
      !currentVehicleFormData.model ||
      !currentVehicleFormData.year ||
      !currentVehicleFormData.color ||
      !currentVehicleFormData.plate
    ) {
      // Consider showing an error in the dialog itself
      setError('All vehicle fields are required in the dialog.');
      return;
    }
    if (
      isNaN(currentVehicleFormData.year) ||
      currentVehicleFormData.year < 1900 ||
      currentVehicleFormData.year > new Date().getFullYear() + 2
    ) {
      setError(
        `Invalid year for vehicle: ${currentVehicleFormData.make} ${currentVehicleFormData.model}. Please enter a valid year.`
      );
      return;
    }
    setError(null); // Clear previous dialog errors

    const updatedVehicles = [...profile.vehicles];
    if (editingVehicleIndex !== null) {
      // Editing existing vehicle
      updatedVehicles[editingVehicleIndex] = currentVehicleFormData;
    } else {
      // Adding new vehicle
      updatedVehicles.push(currentVehicleFormData);
    }
    setProfile((prev) => ({ ...prev, vehicles: updatedVehicles }));
    handleVehicleDialogClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!residentDocPath) {
      setError('Cannot save profile. User details missing.');
      return;
    }

    // Client-side validation
    for (const vehicle of profile.vehicles) {
      if (
        !vehicle.make ||
        !vehicle.model ||
        !vehicle.year ||
        !vehicle.color ||
        !vehicle.plate
      ) {
        setError('All fields for each vehicle are required.');
        return;
      }
      if (
        isNaN(vehicle.year) ||
        vehicle.year < 1900 ||
        vehicle.year > new Date().getFullYear() + 2
      ) {
        setError(
          `Invalid year for vehicle: ${vehicle.make} ${vehicle.model}. Please enter a valid year.`
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const dataToUpdate: UpdateResidentProfilePayload = {
      vehicles: profile.vehicles,
      phone: profile.phone.replace(/[^\d]/g, ''), // Send unformatted phone to backend
    };

    try {
      const updateResidentProfileFn = httpsCallable(
        functions,
        'updateResidentProfile'
      );
      await updateResidentProfileFn(dataToUpdate);
      setSuccessMessage('Profile updated successfully!');
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      let specificMessage = 'Failed to update profile. Please try again.';
      if (err instanceof Error) {
        // Attempt to access Firebase HttpsError specific properties
        // It's safer to check for properties than to cast directly to a potentially incorrect type.
        const errorWithDetails = err as { details?: { message?: string } }; // More flexible check
        if (
          errorWithDetails.details &&
          typeof errorWithDetails.details.message === 'string'
        ) {
          specificMessage = errorWithDetails.details.message;
        } else {
          specificMessage = err.message; // Fallback to the main error message
        }
      } else {
        specificMessage =
          'An unexpected error occurred while updating profile.';
      }
      setError(specificMessage);
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ManageAccountsIcon sx={{ mr: 1, fontSize: '2rem' }} color='primary' />
        <Typography variant='h5' component='div'>
          Manage Your Profile
        </Typography>
      </Box>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* Form now wraps the List and the Paper for vehicles */}
      <Box component='form' onSubmit={handleSubmit} noValidate>
        {/* Personal & Contact Information Panel */}
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonPinIcon sx={{ mr: 1 }} color="action" />
            <Typography variant="h6" component="div">
              Personal & Contact Details
            </Typography>
          </Box>
          <List sx={{ mb: 0, pt: 0 }}> {/* Adjusted margins/padding */}
            <ListItem sx={{pt: 0.5, pb: 0.5}}>
              <ListItemIcon>
                <BadgeIcon />
              </ListItemIcon>
              <ListItemText
                primary='Name'
                secondary={profile.displayName || 'N/A'}
              />
            </ListItem>
            <ListItem sx={{pt: 0.5, pb: 0.5}}>
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText primary='Email' secondary={profile.email || 'N/A'} />
            </ListItem>
            <ListItem sx={{pt: 0.5, pb: 0.5}}>
              <ListItemIcon>
                <MeetingRoomIcon />
              </ListItemIcon>
              <ListItemText
                primary='Unit'
                secondary={profile.unitNumber || 'N/A'}
              />
            </ListItem>
            {/* Phone Number Display/Edit within ListItem */}
            <ListItem
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                pt: 1, 
                pb: 0.5 // Adjusted padding
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <PhoneIcon />
                </ListItemIcon>
                <TextField
                  fullWidth
                  variant='outlined'
                  label='Contact Phone'
                  name='phone'
                  value={profile.phone}
                  onChange={handleProfileChange}
                  disabled={saving || loading}
                  inputProps={{ maxLength: 14 }}
                  size='small'
                  sx={{ maxWidth: '250px' }}
                />
              </Box>
            </ListItem>
          </List>
        </Paper>

        {/* Vehicle Information Panel */}
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DirectionsCarIcon sx={{ mr: 1 }} color='action' />
              <Typography variant='h6' component='div'>
                Vehicle Information (Max 2)
              </Typography>
            </Box>
            {profile.vehicles.length < 2 && (
              <Button
                variant='outlined'
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleAddVehicle}
                disabled={loading || saving || profile.vehicles.length >= 2}
                size='small'
              >
                Add Vehicle
              </Button>
            )}
          </Box>
          {profile.vehicles.length > 0 && <Divider sx={{ my: 2 }} />}
          {profile.vehicles.length > 0 && <Divider sx={{ my: 1 }} />}
          {profile.vehicles.length > 0 && (
            <List sx={{ pt: 0, pb: 0 }}>
              {profile.vehicles.map((vehicle, index) => (
                <ListItem
                  key={index}
                  divider={index < profile.vehicles.length - 1} // Add divider except for the last item
                  secondaryAction={
                    <Stack direction='row' spacing={0.5}>
                      {' '}
                      {/* Reduced spacing */}
                      <IconButton
                        edge='end'
                        aria-label='edit'
                        onClick={() => handleEditVehicle(index)} // Placeholder
                        disabled={saving}
                        size='small'
                      >
                        <EditIcon fontSize='small' />
                      </IconButton>
                      <IconButton
                        edge='end'
                        aria-label='delete'
                        onClick={() => handleOpenDeleteConfirm(index)}
                        color='error'
                        disabled={saving}
                        size='small'
                      >
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Stack>
                  }
                  sx={{ py: 1.5 }} // Adjust padding for list items
                >
                  <ListItemText
                    primary={
                      `${vehicle.year || ''} ${vehicle.color || ''} ${
                        vehicle.make || ''
                      } ${vehicle.model || ''}`
                        .trim()
                        .replace(/ +/g, ' ') || 'Vehicle Details Missing'
                    }
                    secondary={`Plate: ${vehicle.plate || 'N/A'}`}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
          {profile.vehicles.length === 0 && (
            <Typography
              sx={{ textAlign: 'center', my: 2, color: 'text.secondary' }}
            >
              No vehicles added yet.
            </Typography>
          )}
        </Paper>
        {/* Closing Paper for vehicle section */}
        {/* Save Profile Button moved outside the Paper, but still within the form Box */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            type='submit'
            variant='contained'
            startIcon={<SaveIcon />}
            disabled={saving || loading}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>{' '}
      {/* Closing Form Box */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby='delete-vehicle-dialog-title'
        aria-describedby='delete-vehicle-dialog-description'
      >
        <DialogTitle id='delete-vehicle-dialog-title'>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id='delete-vehicle-dialog-description'>
            Are you sure you want to delete this vehicle? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color='primary'>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveVehicle}
            color='error'
            variant='contained'
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add/Edit Vehicle Dialog */}
      <Dialog
        open={isVehicleDialogOpen}
        onClose={handleVehicleDialogClose}
        aria-labelledby='vehicle-dialog-title'
      >
        <DialogTitle id='vehicle-dialog-title'>
          {editingVehicleIndex !== null
            ? 'Edit Vehicle Details'
            : 'Add New Vehicle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {' '}
            {/* Add some padding top */}
            <TextField
              autoFocus
              margin='dense'
              name='make'
              label='Make'
              type='text'
              fullWidth
              variant='outlined'
              value={currentVehicleFormData.make}
              onChange={handleVehicleFormChange}
              required
            />
            <TextField
              margin='dense'
              name='model'
              label='Model'
              type='text'
              fullWidth
              variant='outlined'
              value={currentVehicleFormData.model}
              onChange={handleVehicleFormChange}
              required
            />
            <TextField
              margin='dense'
              name='year'
              label='Year'
              type='number'
              fullWidth
              variant='outlined'
              value={
                currentVehicleFormData.year === 0
                  ? ''
                  : currentVehicleFormData.year
              }
              onChange={handleVehicleFormChange}
              required
              InputProps={{
                inputProps: {
                  min: 1900,
                  max: new Date().getFullYear() + 2,
                },
              }}
            />
            <TextField
              margin='dense'
              name='color'
              label='Color'
              type='text'
              fullWidth
              variant='outlined'
              value={currentVehicleFormData.color}
              onChange={handleVehicleFormChange}
              required
            />
            <TextField
              margin='dense'
              name='plate'
              label='License Plate'
              type='text'
              fullWidth
              variant='outlined'
              value={currentVehicleFormData.plate}
              onChange={handleVehicleFormChange}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVehicleDialogClose}>Cancel</Button>
          <Button onClick={handleVehicleDialogSave} variant='contained'>
            Save Vehicle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResidentProfileManagement;
