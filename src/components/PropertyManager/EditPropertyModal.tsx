import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import type { Property, PropertyAddress } from '../../types'; // Type-only imports
import { useAuth } from '../../hooks/useAuth';
import { Box, Stack } from '@mui/material'; // Import Box and Stack

interface EditPropertyModalProps {
  open: boolean;
  onClose: () => void;
  propertyData: Property | null;
  onSuccess: () => void;
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  open,
  onClose,
  propertyData,
  onSuccess,
}) => {
  const { currentUser, organizationId: userOrganizationId } = useAuth(); // Destructure organizationId
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [type, setType] = useState('');
  // const [managedBy, setManagedBy] = useState(''); // Optional: if PMs can change this

  const usStates: string[] = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (propertyData) {
      setName(propertyData.name);
      setStreet(propertyData.address.street);
      setCity(propertyData.address.city);
      setState(propertyData.address.state);
      setZip(propertyData.address.zip);
      setType(propertyData.type);
      // if (propertyData.managedBy) setManagedBy(propertyData.managedBy);
    } else {
      // Reset form if no propertyData (e.g., modal closed and reopened without data)
      setName('');
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setType('');
      // setManagedBy('');
    }
  }, [propertyData]);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyData || !currentUser || !userOrganizationId) { // Use userOrganizationId
      setError('Property data or user information is missing.');
      setSnackbarMessage('Property data or user information is missing.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    const updatedPropertyDetails: Partial<Property> & { address?: Partial<PropertyAddress> } = {};
    if (name !== propertyData.name) updatedPropertyDetails.name = name;
    if (type !== propertyData.type) updatedPropertyDetails.type = type;

    const updatedAddressDetails: Partial<PropertyAddress> = {};
    if (street !== propertyData.address.street) updatedAddressDetails.street = street;
    if (city !== propertyData.address.city) updatedAddressDetails.city = city;
    if (state !== propertyData.address.state) updatedAddressDetails.state = state;
    if (zip !== propertyData.address.zip) updatedAddressDetails.zip = zip;

    if (Object.keys(updatedAddressDetails).length > 0) {
      updatedPropertyDetails.address = { ...propertyData.address, ...updatedAddressDetails };
    }
    
    // If managedBy is editable:
    // if (managedBy !== propertyData.managedBy) updatedPropertyDetails.managedBy = managedBy;

    if (Object.keys(updatedPropertyDetails).length === 0 && Object.keys(updatedAddressDetails).length === 0) {
      setSnackbarMessage('No changes detected.');
      setSnackbarSeverity('info' as 'success' | 'error'); // MUI might not have 'info' as a direct type for severity
      setSnackbarOpen(true);
      setLoading(false);
      onClose(); // Close modal if no changes
      return;
    }
    
    const updatePropertyFunction = httpsCallable(functions, 'updateProperty');
    try {
      await updatePropertyFunction({
        organizationId: userOrganizationId, // Use userOrganizationId
        propertyId: propertyData.id,
        updatedData: updatedPropertyDetails,
      });
      setSnackbarMessage('Property updated successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onSuccess(); // Call onSuccess to refresh list and close modal
    } catch (err: any) {
      console.error('Error updating property:', err);
      setError(err.message || 'Failed to update property.');
      setSnackbarMessage(err.message || 'Failed to update property.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Property: {propertyData?.name || ''}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2}>
              <TextField
                label="Property Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                margin="dense"
              />
              <TextField
                label="Street Address"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                fullWidth
                required
                margin="dense"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                  sx={{ flexGrow: 1 }}
                />
                <FormControl fullWidth margin="dense" required sx={{ flexGrow: 1 }}>
                  <InputLabel id="state-select-label">State</InputLabel>
                  <Select
                    labelId="state-select-label"
                    id="state-select"
                    value={state}
                    label="State"
                    onChange={(e) => setState(e.target.value)}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 224, // Adjust as needed, typically 4.5 * item height (48px) = 216px, or 5 items
                        },
                      },
                    }}
                  >
                    {usStates.map((stateName: string) => (
                      <MenuItem key={stateName} value={stateName}>
                        {stateName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Zip Code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                  sx={{ flexGrow: 1 }}
                />
              </Stack>
              <TextField
                label="Property Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                fullWidth
                required
                margin="dense"
                helperText="e.g., Residential, Commercial, Mixed-Use"
              />
              {/* Optional: Managed By field if editable by PM */}
              {/* <Box sx={{ width: '100%' }}>
                <TextField
                  label="Managed By (User ID)"
                  value={managedBy}
                  onChange={(e) => setManagedBy(e.target.value)}
                  fullWidth
                  margin="dense"
                  // Consider making this a dropdown of available managers if applicable
                />
              </Box> */}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px' }}>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EditPropertyModal;
