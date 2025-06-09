import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Card,
  CardActionArea,
  CardContent,
  Stack,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type { Resident, Vehicle } from '../../types';
import { isAppError } from '../../utils/errorUtils';
import { navigationItems } from '../../config/navigationConfig';
import type { NavItemConfig } from '../../config/navigationConfig';

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

  const residentNavItems = navigationItems.filter(
    (item) =>
      item.roles.includes('resident') &&
      item.path !== '/dashboard/resident/my-profile' // Exclude self
  );

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
              phone: data.phone || '', // Corrected: use phone
              unitNumber: data.unitNumber || '',
            });
            setVehicles(data.vehicles || []);
          } else {
            setResidentData({
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
              phone: (currentUser as any).phone || '', // Corrected: use phone, cast if needed from currentUser
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
  }, [currentUser]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setResidentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    const updatedVehicles = [...vehicles];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [name]: name === 'year' ? parseInt(value, 10) || 0 : value,
    };
    setVehicles(updatedVehicles);
  };

  const addVehicle = () => {
    if (vehicles.length < 2) {
      setVehicles([
        ...vehicles,
        { make: '', model: '', year: 0, color: '', plate: '' },
      ]);
    }
  };

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

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
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mt: 2 }}>
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
              onClick={addVehicle}
              size='small'
            >
              Add Vehicle
            </Button>
          )}
        </Stack>

        {vehicles.map((vehicle, index) => (
          <Paper variant='outlined' key={index} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
              >
                <Typography variant='subtitle1'>Vehicle {index + 1}</Typography>
                <IconButton
                  onClick={() => removeVehicle(index)}
                  color='error'
                  aria-label={`Remove vehicle ${index + 1}`}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label='Make'
                  name='make'
                  value={vehicle.make}
                  onChange={(e) =>
                    handleVehicleChange(
                      index,
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                />
                <TextField
                  fullWidth
                  label='Model'
                  name='model'
                  value={vehicle.model}
                  onChange={(e) =>
                    handleVehicleChange(
                      index,
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label='Year'
                  name='year'
                  type='number'
                  value={vehicle.year || ''}
                  onChange={(e) =>
                    handleVehicleChange(
                      index,
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                />
                <TextField
                  fullWidth
                  label='Color'
                  name='color'
                  value={vehicle.color}
                  onChange={(e) =>
                    handleVehicleChange(
                      index,
                      e as React.ChangeEvent<HTMLInputElement>
                    )
                  }
                />
              </Stack>
              <TextField
                fullWidth
                label='License Plate'
                name='plate'
                value={vehicle.plate}
                onChange={(e) =>
                  handleVehicleChange(
                    index,
                    e as React.ChangeEvent<HTMLInputElement>
                  )
                }
              />
            </Stack>
          </Paper>
        ))}
        {vehicles.length === 0 && (
          <Typography color='textSecondary' sx={{ mb: 2 }}>
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

      {/* Quick Navigation Links */}
      <Divider sx={{ my: 4 }} />
      <Typography variant='h5' gutterBottom sx={{ mb: 3 }}>
        Explore Your Dashboard
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {residentNavItems.map((item: NavItemConfig) => (
          <Box
            key={item.text}
            sx={{
              flexGrow: 1,
              flexBasis: {
                xs: '100%',
                sm: 'calc(50% - 8px)',
                md: 'calc(33.333% - 11px)',
              },
              minWidth: { xs: 'calc(50% - 8px)', sm: 180 },
            }}
          >
            <Card
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardActionArea
                component={RouterLink}
                to={item.path}
                sx={{ flexGrow: 1 }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <item.icon sx={{ fontSize: 48, mb: 2 }} color='primary' />
                  <Typography gutterBottom variant='h6' component='div'>
                    {item.text}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
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
    </Paper>
  );
};

export default ResidentProfileManagement;
