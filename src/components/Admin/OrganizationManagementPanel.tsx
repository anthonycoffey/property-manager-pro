import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
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
} from '@mui/material';
import AddOrganizationModal from './AddOrganizationModal';
import EditOrganizationModal from './EditOrganizationModal';
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

export interface OrganizationManagementPanelRef {
  openAddModal: () => void;
}

const OrganizationManagementPanel = forwardRef<
  OrganizationManagementPanelRef
>((_props, ref) => {
  const { currentUser } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
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
  }, [fetchOrganizations]);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  useImperativeHandle(ref, () => ({
    openAddModal: handleOpenAddModal,
  }));

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrganization(org);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrganization(null);
  };

  const handleOrganizationCreated = (orgId: string) => {
    setSnackbarMessage(`Organization created successfully with ID: ${orgId}`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    fetchOrganizations();
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


  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (
      window.confirm(
        `Are you sure you want to DELETE organization "${orgName}"? This action is permanent and cannot be undone.` // Updated confirmation
      )
    ) {
      setActionLoading((prev) => ({ ...prev, [orgId]: true }));
      setError(null);
      try {
        const result = await deleteOrganizationCallable({
          organizationId: orgId,
        });
        const data = result.data as { success: boolean; message: string };
        if (data.success) {
          setSnackbarMessage(
            data.message || `Organization ${orgName} deleted successfully.`
          );
          setSnackbarSeverity('success');
          fetchOrganizations();
        } else {
          setSnackbarMessage(
            data.message || `Failed to delete ${orgName}.`
          );
          setSnackbarSeverity('error');
        }
      } catch (err: unknown) {
        console.error('Error deleting organization:', err);
        if (err instanceof Error) {
          setSnackbarMessage(err.message || `Failed to delete ${orgName}.`);
        } else {
          setSnackbarMessage(
            `An unexpected error occurred while deleting ${orgName}.`
          );
        }
        setSnackbarSeverity('error');
      } finally {
        setActionLoading((prev) => ({ ...prev, [orgId]: false }));
        setSnackbarOpen(true);
      }
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
    <Box>

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
            borderRadius: 1,
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
                <TableCell>Created At</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell component='th' scope='row'>
                    {org.name}
                  </TableCell>
                  <TableCell>{org.status || 'N/A'}</TableCell>
                  <TableCell>
                    {org.createdAt ? org.createdAt.toLocaleDateString() : 'N/A'}
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
                      onClick={() => handleDeleteOrganization(org.id, org.name)}
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

      <AddOrganizationModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onOrganizationCreated={handleOrganizationCreated}
      />

      {editingOrganization && (
        <EditOrganizationModal
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          organization={editingOrganization}
          onOrganizationUpdated={handleOrganizationUpdated}
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
    </Box>
  );
});

export default OrganizationManagementPanel;
