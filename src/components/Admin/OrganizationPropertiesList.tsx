import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import {
  Typography,
  CircularProgress,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People'; // For Manage Residents
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import type { Property as PropertyType } from '../../types';

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

// Props for the new component
interface OrganizationPropertiesListProps {
  organizationId: string;
  onEditProperty: (property: PropertyType) => void; 
  onManageResidents: (property: PropertyType) => void; // Changed to pass full property object
  onPropertiesUpdate: () => void; 
}

const formatAddress = (address: PropertyAddress | undefined): string => {
  if (!address) return 'N/A';
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

const OrganizationPropertiesList: React.FC<OrganizationPropertiesListProps> = ({ 
  organizationId,
  onEditProperty,
  onManageResidents,
  onPropertiesUpdate,
}) => {
  const { currentUser } = useAuth(); // currentUser might still be needed for auth checks if any
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const fetchProperties = useCallback(async () => {
    if (!currentUser || !organizationId) { // Check passed organizationId
      setError('User or Organization ID not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch ALL properties for the given organizationId
      const propertiesRef = collection(db, `organizations/${organizationId}/properties`);
      const q = query(propertiesRef); // No 'managedBy' filter
      const querySnapshot = await getDocs(q);
      
      const fetchedProperties: PropertyType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedProperties.push({ 
          id: doc.id,
          name: data.name || 'Unnamed Property',
          address: data.address || { street: '', city: '', state: '', zip: '' },
          type: data.type || '',
          organizationId: organizationId, 
          managedBy: data.managedBy, // Keep managedBy for display if needed
          createdAt: data.createdAt,
        } as PropertyType);
      });
      setProperties(fetchedProperties);

    } catch (err) {
      console.error("Error fetching properties:", err);
      setError('Failed to fetch properties.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, organizationId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]); // Re-fetch if organizationId changes via props

  const handleOpenDeleteDialog = (property: PropertyType) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setPropertyToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete || !organizationId) { // Use passed organizationId
      setSnackbarMessage('Property or organization information is missing for delete.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setDeleteLoading(true);
    const deletePropertyFunction = httpsCallable(functions, 'deleteProperty');
    try {
      await deletePropertyFunction({
        organizationId: organizationId, // Use passed organizationId
        propertyId: propertyToDelete.id,
      });
      setSnackbarMessage('Property deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDeleteDialog();
      onPropertiesUpdate(); // Call parent's update handler
      fetchProperties(); // Re-fetch properties after delete
    } catch (err: unknown) {
      console.error('Error deleting property:', err);
      if (err instanceof Error) {
        setSnackbarMessage(err.message || 'Failed to delete property.');
      } else {
        setSnackbarMessage('An unexpected error occurred while deleting property.');
      }
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
  }

  if (properties.length === 0) {
    return <Typography sx={{ p: 2 }}>No properties found for this organization.</Typography>;
  }

  return (
    <Paper elevation={1}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Property Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Type</TableCell>
              {/* <TableCell>Managed By (UID)</TableCell>  */}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow
                hover
                key={property.id}
              >
                <TableCell component="th" scope="row">
                  {property.name}
                </TableCell>
                <TableCell>
                  {formatAddress(property.address)}
                </TableCell>
                <TableCell>{property.type}</TableCell>
                {/* <TableCell>{property.managedBy || 'N/A'}</TableCell> */}
                <TableCell align="right">
                  <IconButton 
                    aria-label="edit property" 
                    size="small"
                    onClick={() => onEditProperty(property)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    aria-label="manage residents"
                    size="small"
                    onClick={() => onManageResidents(property)} // Pass full property object
                  >
                    <PeopleIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    aria-label="delete property" 
                    size="small"
                    onClick={() => handleOpenDeleteDialog(property)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <MuiDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Delete Property"}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the property "{propertyToDelete?.name || ''}"? 
            This action may also delete associated data and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} variant="outlined" color="error" disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" autoFocus disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </MuiDialog>
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
    </Paper>
  );
};

export default OrganizationPropertiesList;
