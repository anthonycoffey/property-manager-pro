import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Stack,
  List, // Added
  ListItem, // Added
  ListItemText, // Added
  Dialog, // Added
  DialogActions, // Added
  DialogContent, // Added
  DialogContentText, // Added
  DialogTitle, // Added
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit'; // Added
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../../hooks/useAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCallback } from 'react'; // Added
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type { Resident, Vehicle } from '../../types';
import { isAppError } from '../../utils/errorUtils';

const functions = getFunctions();
const updateResidentProfileCallable = httpsCallable(
  functions,
  'updateResidentProfile'
);

const ResidentProfileManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [residentData, setResidentData] = useState<Partial<Resident>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // State for vehicle dialogs
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState<boolean>(false);
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [currentVehicleFormData, setCurrentVehicleFormData] = useState<Vehicle>({
    make: '', model: '', year: 0, color: '', plate: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [vehicleToDeleteIndex, setVehicleToDeleteIndex] = useState<number | null>(null);

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

  useEffect(() => {
    const fetchResidentData = async () => {
      if (
        currentUser?.uid &&
        currentUser.customClaims?.organizationId &&
        currentUser.customClaims?.propertyId
      ) {
        setLoading(true);
        setError(null);
        try {
          const residentDocRef = doc(
            db,
            `organizations/${currentUser.customClaims.organizationId}/properties/${currentUser.customClaims.propertyId}/residents/${currentUser.uid}`
          );
          const residentDocSnap = await getDoc(residentDocRef);
          if (residentDocSnap.exists()) {
            const data = residentDocSnap.data() as Resident;
            setResidentData({
              displayName: data.displayName || currentUser.displayName || '',
              email: data.email || currentUser.email || '',
              phone: formatPhoneNumberOnInput(data.phone || ''), // Format on load
              unitNumber: data.unitNumber || '',
            });
            setVehicles(data.vehicles || []);
          } else {
            setResidentData({
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
            });
            setVehicles([]);
            setError('Profile not found, please complete your details.');
          }
        } catch (err) {
          console.error('Error fetching resident data:', err);
          setError('Failed to load profile data.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('User information incomplete. Cannot load profile.');
        setLoading(false);
      }
    };
    fetchResidentData();
  }, [currentUser, formatPhoneNumberOnInput]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      setResidentData((prev) => ({ ...prev, [name]: formatPhoneNumberOnInput(value) }));
    } else {
      setResidentData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleVehicleChange = ( // This will be used by the dialog form
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setCurrentVehicleFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value, 10) || 0 : value,
    }));
  };

  // --- Vehicle Dialog Handlers ---
  const handleOpenVehicleDialog = (index: number | null = null) => {
    if (index !== null) { // Editing existing vehicle
      setEditingVehicleIndex(index);
      setCurrentVehicleFormData({ ...vehicles[index] });
    } else { // Adding new vehicle
      if (vehicles.length >= 2) {
        setSnackbar({ open: true, message: "You can add a maximum of 2 vehicles.", severity: 'error'});
        return;
      }
      setEditingVehicleIndex(null);
      setCurrentVehicleFormData({ make: '', model: '', year: 0, color: '', plate: '' });
    }
    setIsVehicleDialogOpen(true);
  };

  const handleCloseVehicleDialog = () => {
    setIsVehicleDialogOpen(false);
    setEditingVehicleIndex(null); // Clear editing state
  };

  const handleSaveVehicle = () => {
    // Basic validation
    if (!currentVehicleFormData.make || !currentVehicleFormData.model || !currentVehicleFormData.year || !currentVehicleFormData.color || !currentVehicleFormData.plate) {
      setError("All vehicle fields are required."); // This error will show above the form
      return;
    }
    if (isNaN(currentVehicleFormData.year) || currentVehicleFormData.year < 1900 || currentVehicleFormData.year > new Date().getFullYear() + 2 ) {
      setError(`Invalid year for vehicle: ${currentVehicleFormData.make} ${currentVehicleFormData.model}.`);
      return;
    }
    setError(null); // Clear general error if validation passes

    const updatedVehicles = [...vehicles];
    if (editingVehicleIndex !== null) { // Editing
      updatedVehicles[editingVehicleIndex] = currentVehicleFormData;
    } else { // Adding
      updatedVehicles.push(currentVehicleFormData);
    }
    setVehicles(updatedVehicles);
    handleCloseVehicleDialog();
  };

  // --- Delete Confirmation Dialog Handlers ---
  const handleOpenDeleteConfirmDialog = (index: number) => {
    setVehicleToDeleteIndex(index);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirmDialog = () => {
    setVehicleToDeleteIndex(null);
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDeleteVehicle = () => {
    if (vehicleToDeleteIndex !== null) {
      setVehicles(vehicles.filter((_, i) => i !== vehicleToDeleteIndex));
    }
    handleCloseDeleteConfirmDialog();
  };
  
  // Original addVehicle and removeVehicle are replaced by dialog logic
  // const addVehicle = () => { ... };
  // const removeVehicle = (index: number) => { ... };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser?.uid) {
      setError('Not authenticated.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...residentData, // This will include 'phone' if it was set
        vehicles: vehicles.map((v) => ({ ...v, year: v.year || 0 })),
      };
      await updateResidentProfileCallable(payload);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      let message = 'Failed to update profile.';
      if (isAppError(err)) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
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
      <Box component='form' onSubmit={handleSubmit} noValidate>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label='Full Name'
              name='displayName'
              value={residentData.displayName || ''}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label='Email Address'
              name='email'
              type='email'
              value={residentData.email || ''}
              onChange={handleInputChange}
              InputProps={{
                readOnly: true,
              }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label='Phone Number'
              name='phone' // Corrected: use phone
              value={residentData.phone || ''} // Corrected: use phone
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label='Unit Number'
              name='unitNumber'
              value={residentData.unitNumber || ''}
              onChange={handleInputChange}
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          sx={{ mb: 2 }}
        >
          <Typography variant='h6'>Vehicle Information (Max 2)</Typography>
          {vehicles.length < 2 && (
            <Button
              variant='outlined'
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => handleOpenVehicleDialog(null)} // Open dialog for adding
              size='small'
              disabled={saving || loading}
            >
              Add Vehicle
            </Button>
          )}
        </Stack>

        {vehicles.length > 0 ? (
          <List sx={{pt: 0, pb: 0}}>
            {vehicles.map((vehicle, index) => (
              <ListItem
                key={index}
                divider={index < vehicles.length - 1}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleOpenVehicleDialog(index)} disabled={saving || loading} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleOpenDeleteConfirmDialog(index)} color="error" disabled={saving || loading} size="small">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
                sx={{ py: 1.5 }}
              >
                <ListItemText
                  primary={`${vehicle.year || ''} ${vehicle.color || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim().replace(/ +/g, ' ') || 'Vehicle Details Missing'}
                  secondary={`Plate: ${vehicle.plate || 'N/A'}`}
                  primaryTypographyProps={{ fontWeight: 'medium' }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color='textSecondary' sx={{ mb: 2, textAlign: 'center', mt: 2 }}>
            No vehicles added.
          </Typography>
        )}
        
        <Button
          type='submit'
          fullWidth
          variant='contained'
          sx={{ mt: 3, mb: 2 }}
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={20} color='inherit' />
            ) : (
              <SaveIcon />
            )
          }
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={isVehicleDialogOpen} onClose={handleCloseVehicleDialog} aria-labelledby="vehicle-dialog-title">
        <DialogTitle id="vehicle-dialog-title">
          {editingVehicleIndex !== null ? 'Edit Vehicle Details' : 'Add New Vehicle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="make"
              label="Make"
              type="text"
              fullWidth
              variant="outlined"
              value={currentVehicleFormData.make}
              onChange={handleVehicleChange} // Re-using handleVehicleChange for dialog form
              required
            />
            <TextField
              margin="dense"
              name="model"
              label="Model"
              type="text"
              fullWidth
              variant="outlined"
              value={currentVehicleFormData.model}
              onChange={handleVehicleChange}
              required
            />
            <TextField
              margin="dense"
              name="year"
              label="Year"
              type="number"
              fullWidth
              variant="outlined"
              value={currentVehicleFormData.year === 0 ? '' : currentVehicleFormData.year}
              onChange={handleVehicleChange}
              required
              InputProps={{ inputProps: { min: 1900, max: new Date().getFullYear() + 2 } }}
            />
            <TextField
              margin="dense"
              name="color"
              label="Color"
              type="text"
              fullWidth
              variant="outlined"
              value={currentVehicleFormData.color}
              onChange={handleVehicleChange}
              required
            />
            <TextField
              margin="dense"
              name="plate"
              label="License Plate"
              type="text"
              fullWidth
              variant="outlined"
              value={currentVehicleFormData.plate}
              onChange={handleVehicleChange}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVehicleDialog}>Cancel</Button>
          <Button onClick={handleSaveVehicle} variant="contained">Save Vehicle</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirmDialog} aria-labelledby="delete-confirm-dialog-title">
        <DialogTitle id="delete-confirm-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this vehicle? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirmDialog}>Cancel</Button>
          <Button onClick={handleConfirmDeleteVehicle} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResidentProfileManagement;
