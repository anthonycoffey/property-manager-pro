import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebaseConfig'; // Assuming functions is exported from firebaseConfig
import { isAppError } from '../../utils/errorUtils'; // Import the type guard

interface OrganizationManager {
  uid: string;
  displayName: string;
  email: string;
  assignedOrganizationIds: string[];
}

interface Organization {
  id: string;
  name: string;
}

interface SnackbarMessage {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const OrganizationManagerAssignments: React.FC = () => {
  const [managers, setManagers] = useState<OrganizationManager[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const [selectedManager, setSelectedManager] =
    useState<OrganizationManager | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [organizationsToAssign, setOrganizationsToAssign] = useState<string[]>(
    []
  );

  const [unassignConfirmOpen, setUnassignConfirmOpen] =
    useState<boolean>(false);
  const [managerToUnassignFrom, setManagerToUnassignFrom] =
    useState<OrganizationManager | null>(null);
  const [organizationToUnassign, setOrganizationToUnassign] =
    useState<Organization | null>(null);

  // const { currentUser } = useAuth(); // Corrected: use currentUser from useAuth

  const assignOrgToManagerAdmin = httpsCallable(
    functions,
    'assignOrganizationToManagerAdmin'
  );
  const unassignOrgFromManagerAdmin = httpsCallable(
    functions,
    'unassignOrganizationFromManagerAdmin'
  );

  const fetchManagersAndOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Organization Managers
      const adminsColRef = collection(db, 'admins');
      const qManagers = query(
        adminsColRef,
        where('roles', 'array-contains', 'organization_manager')
      );
      const managerSnapshots = await getDocs(qManagers);
      const fetchedManagers: OrganizationManager[] = managerSnapshots.docs.map(
        (docSnap) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Omit<OrganizationManager, 'uid'>),
        })
      );
      setManagers(fetchedManagers);

      // Fetch All Organizations
      const orgsColRef = collection(db, 'organizations');
      const orgSnapshots = await getDocs(orgsColRef);
      const fetchedOrganizations: Organization[] = orgSnapshots.docs.map(
        (docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
        })
      );
      console.log(
        `Fetched ${fetchedOrganizations.length} organizations: `,
        fetchedOrganizations
      );
      setOrganizations(fetchedOrganizations);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load organization managers or organizations.');
      setSnackbar({ message: 'Failed to load data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagersAndOrganizations();
  }, [fetchManagersAndOrganizations]);

  const handleOpenAssignModal = (manager: OrganizationManager) => {
    setSelectedManager(manager);
    setOrganizationsToAssign([]); // Reset selection
    setAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setAssignModalOpen(false);
    setSelectedManager(null);
    setOrganizationsToAssign([]);
  };

  const handleAssignOrganizations = async () => {
    if (!selectedManager || organizationsToAssign.length === 0) {
      setSnackbar({
        message:
          'No manager selected or no organizations chosen for assignment.',
        severity: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      for (const orgId of organizationsToAssign) {
        await assignOrgToManagerAdmin({
          userId: selectedManager.uid,
          organizationId: orgId,
        });
      }
      setSnackbar({
        message: `Successfully assigned organizations to ${selectedManager.displayName}.`,
        severity: 'success',
      });
      fetchManagersAndOrganizations(); // Refresh data
      handleCloseAssignModal();
    } catch (err: unknown) {
      console.error('Error assigning organizations:', err);
      if (isAppError(err)) {
        setSnackbar({ message: err.message || 'Failed to assign organizations.', severity: 'error' });
      } else {
        setSnackbar({ message: 'An unexpected error occurred while assigning organizations.', severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUnassignConfirm = (
    manager: OrganizationManager,
    orgId: string
  ) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setManagerToUnassignFrom(manager);
      setOrganizationToUnassign(org);
      setUnassignConfirmOpen(true);
    }
  };

  const handleCloseUnassignConfirm = () => {
    setUnassignConfirmOpen(false);
    setManagerToUnassignFrom(null);
    setOrganizationToUnassign(null);
  };

  const handleUnassignOrganization = async () => {
    if (!managerToUnassignFrom || !organizationToUnassign) return;
    setLoading(true);
    try {
      await unassignOrgFromManagerAdmin({
        userId: managerToUnassignFrom.uid,
        organizationId: organizationToUnassign.id,
      });
      setSnackbar({
        message: `Successfully unassigned ${organizationToUnassign.name} from ${managerToUnassignFrom.displayName}.`,
        severity: 'success',
      });
      fetchManagersAndOrganizations(); // Refresh data
      handleCloseUnassignConfirm();
    } catch (err: unknown) {
      console.error('Error unassigning organization:', err);
      if (isAppError(err)) {
        setSnackbar({ message: err.message || 'Failed to unassign organization.', severity: 'error' });
      } else {
        setSnackbar({ message: 'An unexpected error occurred while unassigning the organization.', severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && managers.length === 0) {
    // Show initial loading spinner
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color='error'>{error}</Typography>;
  }

  const getOrganizationName = (orgId: string): string => {
    console.log(organizations, orgId);
    return organizations.find((org) => org.id === orgId)?.name || orgId;
  };

  return (
    <Paper>
      {loading && <CircularProgress size={24} sx={{ ml: 2, mb: 1 }} />}
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Managed Organizations</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
            <TableBody>
            {managers.length === 0 ? (
              <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary">
                No organization managers found.
                </Typography>
              </TableCell>
              </TableRow>
            ) : (
              managers.map((manager) => (
              <TableRow key={manager.uid}>
                <TableCell>{manager.displayName}</TableCell>
                <TableCell>{manager.email}</TableCell>
                <TableCell>
                {manager.assignedOrganizationIds &&
                manager.assignedOrganizationIds.length > 0 ? (
                  manager.assignedOrganizationIds.map((orgId) => (
                  <Chip
                    key={orgId}
                    label={getOrganizationName(orgId)}
                    onDelete={() =>
                    handleOpenUnassignConfirm(manager, orgId)
                    }
                    deleteIcon={<DeleteIcon />}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                    color="primary"
                  />
                  ))
                ) : (
                  <Typography variant="caption">None</Typography>
                )}
                </TableCell>
                <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => handleOpenAssignModal(manager)}
                >
                  Assign
                </Button>
                </TableCell>
              </TableRow>
              ))
            )}
            </TableBody>
        </Table>
      </TableContainer>

      {/* Assign Organization Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={handleCloseAssignModal}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>
          Assign Organizations to {selectedManager?.displayName}
        </DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth margin='normal'>
            <InputLabel id='assign-organizations-label'>
              Organizations
            </InputLabel>
            <Select
              labelId='assign-organizations-label'
              multiple
              value={organizationsToAssign}
              onChange={(e) =>
                setOrganizationsToAssign(e.target.value as string[])
              }
              input={<OutlinedInput label='Organizations' />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip
                      key={value}
                      label={getOrganizationName(value)}
                      size='small'
                    />
                  ))}
                </Box>
              )}
            >
              {organizations.map((org) => (
                <MenuItem
                  key={org.id}
                  value={org.id}
                  disabled={selectedManager?.assignedOrganizationIds?.includes(
                    org.id
                  )}
                >
                  <Checkbox
                    checked={
                      organizationsToAssign.includes(org.id) ||
                      selectedManager?.assignedOrganizationIds?.includes(org.id)
                    }
                  />
                  <ListItemText primary={org.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseAssignModal}
            color='error'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignOrganizations}
            color='primary'
            variant='contained'
            disabled={loading || organizationsToAssign.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Assign Selected'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={unassignConfirmOpen} onClose={handleCloseUnassignConfirm}>
        <DialogTitle>Confirm Unassignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unassign organization "
            {organizationToUnassign?.name}" from{' '}
            {managerToUnassignFrom?.displayName}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseUnassignConfirm}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnassignOrganization}
            color='error'
            variant='contained'
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Unassign'}
          </Button>
        </DialogActions>
      </Dialog>

      {snackbar && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar(null)}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Paper>
  );
};

export default OrganizationManagerAssignments;
