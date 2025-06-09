import React, {
  useState,
  useEffect,
  useCallback,
  // useImperativeHandle, // No longer needed for Add Modal
  // forwardRef, // No longer needed for Add Modal
} from 'react';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Button, // Added Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // Added AddIcon
// AddOrganizationModal will be handled by the parent (Dashboard)
import EditOrganizationModal from './EditOrganizationModal';
import DeleteOrganizationDialog from './DeleteOrganizationDialog'; // Added import
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  collection,
  getDocs,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, functions } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';

export interface Organization {
  id: string;
  name: string;
  createdBy?: string;
  status: string;
  createdAt: Date | null;
}

const deleteOrganizationCallable = httpsCallable(
  functions,
  'deleteOrganization'
);

// Ref for opening Add Modal is no longer needed from here
// export interface OrganizationManagementPanelRef {
// openAddModal: () => void;
// }

interface OrganizationManagementPanelProps {
  onOpenAddModal: () => void;
  refreshTrigger: number; // Added refreshTrigger prop
}

// forwardRef is no longer needed for Add Modal logic
const OrganizationManagementPanel: React.FC<
  OrganizationManagementPanelProps
> = ({ onOpenAddModal, refreshTrigger }) => {
  const { currentUser } = useAuth();
  // const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Will be managed by Dashboard
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // Added state
  const [deletingOrgInfo, setDeletingOrgInfo] = useState<{
    id: string;
    name: string;
  } | null>(null); // Added state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );

  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('success');

  const fetchOrganizations = useCallback(async () => {
    if (!currentUser) {
      setError('User not authenticated.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgsCollectionRef = collection(db, 'organizations');
      const q = query(orgsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const orgsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        let displayCreatedAt: Date | null = null;
        const rawCreatedAt = data.createdAt;

        if (rawCreatedAt) {
          if (typeof (rawCreatedAt as Timestamp).toDate === 'function') {
            displayCreatedAt = (rawCreatedAt as Timestamp).toDate();
          } else if (rawCreatedAt instanceof Date) {
            displayCreatedAt = rawCreatedAt;
          }
        }

        return {
          id: docSnapshot.id,
          name: data.name || 'N/A',
          createdBy: data.createdBy,
          status: data.status || 'N/A',
          createdAt: displayCreatedAt,
        } as Organization;
      });
      setOrganizations(orgsData);
    } catch (err: unknown) {
      console.error('Error fetching organizations:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch organizations.');
        setSnackbarMessage(err.message || 'Failed to fetch organizations.');
      } else {
        setError('An unexpected error occurred while fetching organizations.');
        setSnackbarMessage(
          'An unexpected error occurred while fetching organizations.'
        );
      }
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations, refreshTrigger]); // Added refreshTrigger to dependency array

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrganization(org);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrganization(null);
  };

  const handleOrganizationUpdated = (updatedOrgData: Partial<Organization>) => {
    setSnackbarMessage(
      `Organization "${
        updatedOrgData.name || editingOrganization?.name
      }" updated successfully.`
    );
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    fetchOrganizations();
    handleCloseEditModal();
  };

  const handleOpenDeleteDialog = (orgId: string, orgName: string) => {
    setDeletingOrgInfo({ id: orgId, name: orgName });
    setIsDeleteDialogOpen(true);
  };

  const executeDeleteOrganization = async () => {
    if (!deletingOrgInfo) return;

    setActionLoading((prev) => ({ ...prev, [deletingOrgInfo.id]: true }));
    setError(null);
    try {
      const result = await deleteOrganizationCallable({
        organizationId: deletingOrgInfo.id,
      });
      const data = result.data as { success: boolean; message: string };
      if (data.success) {
        setSnackbarMessage(
          data.message ||
            `Organization ${deletingOrgInfo.name} deleted successfully.`
        );
        setSnackbarSeverity('success');
        fetchOrganizations();
      } else {
        setSnackbarMessage(
          data.message || `Failed to delete ${deletingOrgInfo.name}.`
        );
        setSnackbarSeverity('error');
      }
    } catch (err: unknown) {
      console.error('Error deleting organization:', err);
      if (err instanceof Error) {
        setSnackbarMessage(
          err.message || `Failed to delete ${deletingOrgInfo.name}.`
        );
      } else {
        setSnackbarMessage(
          `An unexpected error occurred while deleting ${deletingOrgInfo.name}.`
        );
      }
      setSnackbarSeverity('error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [deletingOrgInfo.id]: false }));
      setSnackbarOpen(true);
      setIsDeleteDialogOpen(false);
      setDeletingOrgInfo(null);
    }
  };

  const handleCloseSnackbar = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={onOpenAddModal}
        >
          Add Organization
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {error && !loading && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && organizations.length === 0 && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px dashed grey',
            textAlign: 'center',
          }}
        >
          <Typography color='textSecondary'>
            No organizations found. Click "Add Organization" to create one.
          </Typography>
        </Box>
      )}

      {!loading && !error && organizations.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table aria-label='organizations table'>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='center'>Created At</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell component='th' scope='row'>
                    {org.name}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        org.status
                          ? org.status.charAt(0).toUpperCase() +
                            org.status.slice(1).toLowerCase()
                          : 'N/A'
                      }
                      color={
                        org.status === 'active'
                          ? 'success'
                          : org.status === 'inactive'
                          ? 'error'
                          : org.status === 'suspended'
                          ? 'warning'
                          : 'default'
                      }
                      size='small'
                    />
                  </TableCell>
                  <TableCell align='center'>
                    {org.createdAt ? org.createdAt.toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell align='right'>
                    <IconButton
                      onClick={() => handleOpenEditModal(org)}
                      color='primary'
                      disabled={actionLoading[org.id]}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDeleteDialog(org.id, org.name)}
                      color='error'
                      disabled={actionLoading[org.id]}
                    >
                      <DeleteIcon />
                    </IconButton>
                    {actionLoading[org.id] && (
                      <CircularProgress size={20} sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* AddOrganizationModal is now rendered in Dashboard.tsx */}
      {/* <AddOrganizationModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onOrganizationCreated={handleOrganizationCreated}
      /> */}

      {editingOrganization && (
        <EditOrganizationModal
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          organization={editingOrganization}
          onOrganizationUpdated={handleOrganizationUpdated}
        />
      )}

      {deletingOrgInfo && (
        <DeleteOrganizationDialog
          open={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingOrgInfo(null);
          }}
          onConfirm={executeDeleteOrganization}
          organizationName={deletingOrgInfo.name}
        />
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default OrganizationManagementPanel;
