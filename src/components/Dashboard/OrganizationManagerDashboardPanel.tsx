import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Button, CircularProgress, Snackbar, Alert, type SelectChangeEvent, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../../hooks/useAuth';
import OrgScopedPropertyManagerManagement from '../OrganizationManager/OrgScopedPropertyManagerManagement';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Organization, AppError } from '../../types';

interface OrganizationManagerDashboardPanelProps {
  orgIds: string[] | null | undefined;
}

const OrganizationManagerDashboardPanel: React.FC<OrganizationManagerDashboardPanelProps> = ({ orgIds }) => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

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

      // Query for organizations created by the current user
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

      // Query for organizations assigned to the current user via claims
      if (orgIds && orgIds.length > 0) {
        // Firestore 'in' query has a limit of 10, so split if necessary
        const chunkSize = 10;
        for (let i = 0; i < orgIds.length; i += chunkSize) {
          const chunk = orgIds.slice(i, i + chunkSize);
          const assignedQuery = query(
            collection(db, 'organizations'),
            where('__name__', 'in', chunk) // Query by document ID
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

      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      } else {
        setSelectedOrgId('');
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError({ message: 'Failed to load organizations.' });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, orgIds]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

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
    fetchOrganizations(); // Re-fetch organizations to include the new one
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, margin: 2 }}>
        <Alert severity="error">{error.message}</Alert>
      </Paper>
    );
  }

  if (organizations.length === 0) {
    return (
      <Paper sx={{ p: 2, margin: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Organization Manager Dashboard</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddOrgModal}>
            Add Organization
          </Button>
        </Box>
        <Typography sx={{ mb: 2 }}>
          You are not currently assigned to manage any organizations. Please contact an administrator or create a new one using the button above.
        </Typography>
      </Paper>
    );
  }

  const selectedOrganization = organizations.find(org => org.id === selectedOrgId);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, margin: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: organizations.length > 0 ? 0 : 2 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
            Organization Manager Dashboard
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
          >
            Add Organization
          </Button>
        </Box>

        {organizations.length > 0 && (
          <FormControl fullWidth margin="normal" sx={{ mt: 2 }}>
            <InputLabel id="om-org-selector-label">Select Organization</InputLabel>
            <Select
              labelId="om-org-selector-label"
              id="om-org-selector"
              value={selectedOrgId}
              label="Select Organization"
              onChange={handleOrgChange}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {selectedOrganization && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Managing Organization: {selectedOrganization.name}
          </Alert>
        )}
      </Paper>

      {selectedOrgId && selectedOrganization && (
        <Paper sx={{ p: 3, marginX: 2, marginTop: 2 }}>
          <OrgScopedPropertyManagerManagement
            organizationId={selectedOrgId}
            organizationCreatedBy={selectedOrganization?.createdBy || null}
          />
        </Paper>
      )}
      <AddOrganizationModal
        open={isAddOrgModalOpen}
        onClose={handleCloseAddOrgModal}
        onOrganizationCreated={handleAddOrgSuccess}
      />
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrganizationManagerDashboardPanel;
