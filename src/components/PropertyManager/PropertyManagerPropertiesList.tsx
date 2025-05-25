import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { collection, query, where, getDocs } from 'firebase/firestore'; // Removed DocumentData
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
  IconButton, // Added IconButton
  Dialog as MuiDialog, // Aliased to avoid conflict if Dialog is used elsewhere
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button, // Added Button
  Snackbar, // Added Snackbar
  Alert, // Added Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit'; // Added EditIcon
import DeleteIcon from '@mui/icons-material/Delete'; // Added DeleteIcon
import { httpsCallable } from 'firebase/functions'; // Added for calling deleteProperty
import { functions } from '../../firebaseConfig'; // Assuming functions is exported
import type { Property as PropertyType } from '../../types'; // Import full Property type

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

// Use PropertyType from ../../types
// interface Property extends DocumentData {
//   id: string;
//   name: string;
//   address: PropertyAddress; 
//   // Add other relevant property fields if needed for display
// }

interface PropertyManagerPropertiesListProps {
  selectedPropertyId: string | null;
  onPropertySelect: (propertyId: string) => void;
  onEditProperty: (property: PropertyType) => void; // New prop for edit
  onPropertiesUpdate: () => void; // New prop to trigger refresh
}

const formatAddress = (address: PropertyAddress | undefined): string => {
  if (!address) return 'N/A';
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

const PropertyManagerPropertiesList: React.FC<PropertyManagerPropertiesListProps> = ({ 
  selectedPropertyId, 
  onPropertySelect,
  onEditProperty,
  onPropertiesUpdate,
}) => {
  const { currentUser, organizationId: authOrganizationId } = useAuth();
  const [properties, setProperties] = useState<PropertyType[]>([]); // Use PropertyType
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');


  const fetchProperties = useCallback(async () => {
    if (!currentUser || !authOrganizationId || !currentUser.uid) {
      setError('User organization or ID not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const propertiesRef = collection(db, `organizations/${authOrganizationId}/properties`);
        const q = query(propertiesRef, where('managedBy', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const fetchedProperties: PropertyType[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedProperties.push({ 
            id: doc.id,
            name: data.name || 'Unnamed Property',
            address: data.address || { street: '', city: '', state: '', zip: '' },
            type: data.type || '',
            organizationId: authOrganizationId, 
            managedBy: data.managedBy,
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
  }, [currentUser, authOrganizationId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleOpenDeleteDialog = (property: PropertyType) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setPropertyToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete || !authOrganizationId) {
      setSnackbarMessage('Property or organization information is missing for delete.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    setDeleteLoading(true);
    const deletePropertyFunction = httpsCallable(functions, 'deleteProperty');
    try {
      await deletePropertyFunction({
        organizationId: authOrganizationId,
        propertyId: propertyToDelete.id,
      });
      setSnackbarMessage('Property deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDeleteDialog();
      onPropertiesUpdate(); // Call to refresh properties list in parent
    } catch (err: unknown) { // Changed from any to unknown
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
    return <Typography sx={{ p: 2 }}>No properties found assigned to you.</Typography>;
  }

  return (
    <Paper elevation={1} sx={{ /* p: 2 removed to allow TableContainer to manage padding if needed */ }}>
      {/* Typography for title can be handled by the parent component (Dashboard) if this list is part of a larger section */}
      {/* <Typography variant="h6" gutterBottom sx={{ p: 2 }}> 
        Your Managed Properties
      </Typography> */}
      <TableContainer sx={{ maxHeight: 440 }}> {/* Adjust maxHeight as needed */}
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Property Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow
                hover
                // onClick={() => onPropertySelect(property.id)} // Keep row clickable for selection if needed, or remove if actions are primary
                selected={selectedPropertyId === property.id} // Still show selection
                key={property.id}
                // sx={{ 
                //   cursor: 'pointer', // Remove cursor pointer if row click is not primary action
                //   '&.Mui-selected': {
                //     backgroundColor: 'action.selected',
                //     '&:hover': {
                //       backgroundColor: 'action.hover',
                //     }
                //   },
                // }}
              >
                <TableCell 
                  component="th" 
                  scope="row"
                  onClick={() => onPropertySelect(property.id)} // Make name/address cells clickable for selection
                  sx={{ cursor: 'pointer' }}
                >
                  {property.name}
                </TableCell>
                <TableCell 
                  onClick={() => onPropertySelect(property.id)} // Make name/address cells clickable for selection
                  sx={{ cursor: 'pointer' }}
                >
                  {formatAddress(property.address)}
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    aria-label="edit property" 
                    size="small"
                    onClick={() => onEditProperty(property)}
                  >
                    <EditIcon fontSize="small" />
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
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the property "{propertyToDelete?.name || ''}"? 
            This action will also delete all associated residents and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={20} color="inherit" /> : "Delete"}
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

export default PropertyManagerPropertiesList;
