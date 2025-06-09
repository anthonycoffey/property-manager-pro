import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  type SelectChangeEvent,
  Container,
  Stack,
  Divider, // Added for visual separation
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { Outlet } from 'react-router-dom'; // For rendering child routes

import { useAuth } from '../../hooks/useAuth';
import AddOrganizationModal from '../Admin/AddOrganizationModal'; // For "Add Organization" button
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Organization, AppError } from '../../types';
import {
  OrgManagerProvider,
  useOrgManagerContext,
} from '../../contexts/OrgManagerContext';

// This component will now act as a layout and context provider for the Org Manager section.
// The actual content for each "tab" will be rendered via <Outlet /> from child routes.

interface OrganizationManagerDashboardPanelProps {
  orgIds: string[] | null | undefined; // Passed from Dashboard.tsx based on user's claims
}

const OrganizationManagerDashboardContent: React.FC<
  OrganizationManagerDashboardPanelProps
> = () => {
  const { currentUser, organizationIds } = useAuth();
  // Context values will be used by child Outlet components
  const {
    selectedOrgId,
    setSelectedOrgId,
    organizations,
    setOrganizations,
    selectedOrganization,
  } = useOrgManagerContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>(
    'success'
  );

  const fetchOrganizations = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgs: Organization[] = [];
      const fetchedOrgIds = new Set<string>();

      // Fetch orgs created by this user (if they also have admin/creator rights)
      const createdByQuery = query(
        collection(db, 'organizations'),
        where('createdBy', '==', currentUser.uid)
      );
      const createdBySnapshot = await getDocs(createdByQuery);
      createdBySnapshot.forEach((doc) => {
        const orgData = { id: doc.id, ...doc.data() } as Organization;
        if (!fetchedOrgIds.has(orgData.id)) {
          orgs.push(orgData);
          fetchedOrgIds.add(orgData.id);
        }
      });

      console.log('claims', organizationIds);
      // Fetch orgs assigned via claims
      if (organizationIds && organizationIds.length > 0) {
        const chunkSize = 10; // Firestore 'in' query limit
        for (let i = 0; i < organizationIds.length; i += chunkSize) {
          const chunk = organizationIds.slice(i, i + chunkSize);
          if (chunk.length > 0) {
            // Ensure chunk is not empty
            const assignedQuery = query(
              collection(db, 'organizations'),
              where('__name__', 'in', chunk)
            );
            const assignedSnapshot = await getDocs(assignedQuery);
            assignedSnapshot.forEach((doc) => {
              const orgData = { id: doc.id, ...doc.data() } as Organization;
              if (!fetchedOrgIds.has(orgData.id)) {
                orgs.push(orgData);
                fetchedOrgIds.add(orgData.id);
              }
            });
          }
        }
      }
      setOrganizations(orgs); // Update context
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id); // Update context
      } else if (orgs.length === 0) {
        setSelectedOrgId(null); // Update context
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError({ message: 'Failed to load organizations.' });
      setOrganizations([]); // Update context
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.uid,
    organizationIds,
    selectedOrgId,
    setOrganizations,
    setSelectedOrgId,
  ]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  console.log({ organizations, selectedOrgId, selectedOrganization });

  const handleOrgChange = (event: SelectChangeEvent<string>) => {
    setSelectedOrgId(event.target.value as string);
  };

  const handleOpenAddOrgModal = () => setIsAddOrgModalOpen(true);
  const handleCloseAddOrgModal = () => setIsAddOrgModalOpen(false);

  const handleAddOrgSuccess = () => {
    handleCloseAddOrgModal();
    setSnackbarMessage('Organization created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    fetchOrganizations(); // Re-fetch to include the new org
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading && organizations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // This error state is for initial org loading. Errors within child views will be handled by them.
  if (error && organizations.length === 0) {
    return (
      <Container component='main' maxWidth='xl'>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Alert severity='error'>{error.message}</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component='main' maxWidth='xl'>
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: 4 }} elevation={3}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: organizations.length > 0 ? 0 : 2,
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            spacing={1}
            sx={{ mb: { xs: 1, sm: 0 } }}
          >
            <BusinessIcon fontSize='large' color='primary' />
            <Typography variant='h4' color='primary'>
              Organization Management
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
            sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}
          >
            Add Organization
          </Button>
        </Box>

        {organizations.length > 0 ? (
          <FormControl fullWidth margin='normal' sx={{ mt: 2 }}>
            <InputLabel id='om-org-selector-label'>
              Select Organization to Manage
            </InputLabel>
            <Select
              labelId='om-org-selector-label'
              id='om-org-selector'
              value={selectedOrgId || ''}
              label='Select Organization to Manage'
              onChange={handleOrgChange}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          !loading && ( // Only show if not loading and no orgs
            <Typography sx={{ p: 2, textAlign: 'center' }}>
              You are not currently managing any organizations. You can create
              one using the "Add Organization" button.
            </Typography>
          )
        )}

        {selectedOrganization && (
          <Alert severity='info' sx={{ mt: 1, mb: 2 }}>
            Managing Organization: <strong>{selectedOrganization.name}</strong>
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Child routes will render here, consuming context for selectedOrgId */}
        {selectedOrgId ? (
          <Outlet />
        ) : (
          organizations.length > 0 &&
          !loading && (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select an organization to see more options.
            </Alert>
          )
        )}
      </Paper>

      <AddOrganizationModal
        open={isAddOrgModalOpen}
        onClose={handleCloseAddOrgModal}
        onOrganizationCreated={handleAddOrgSuccess} // This callback handles success
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Wrapper component that provides the OrgManagerContext
const OrganizationManagerDashboardPanel: React.FC<
  OrganizationManagerDashboardPanelProps
> = (props) => {
  return (
    <OrgManagerProvider
    >
      <OrganizationManagerDashboardContent {...props} />
    </OrgManagerProvider>
  );
};

export default OrganizationManagerDashboardPanel;
