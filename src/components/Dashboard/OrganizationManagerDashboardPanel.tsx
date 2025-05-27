import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, Button, CircularProgress, Snackbar, Alert, type SelectChangeEvent } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import OrgScopedPropertyManagerManagement from '../OrganizationManager/OrgScopedPropertyManagerManagement';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Organization, AppError } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`om-dashboard-tabpanel-${index}`}
      aria-labelledby={`om-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `om-dashboard-tab-${index}`,
    'aria-controls': `om-dashboard-tabpanel-${index}`,
  };
}

interface OrganizationManagerDashboardPanelProps {
  orgIds: string[] | null | undefined;
}

const OrganizationManagerDashboardPanel: React.FC<OrganizationManagerDashboardPanelProps> = ({ orgIds }) => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        <Typography variant="h6">Organization Manager Dashboard</Typography>
        <Typography sx={{ mb: 2 }}>
          You are not currently assigned to manage any organizations. Please contact an administrator or create a new one.
        </Typography>
        <Button variant="contained" onClick={handleOpenAddOrgModal}>
          Create New Organization
        </Button>
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
      </Paper>
    );
  }

  const selectedOrganization = organizations.find(org => org.id === selectedOrgId);

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, margin: 2, mb: 0, borderBottomLeftRadius:0, borderBottomRightRadius:0 }}>
        <Typography variant="h5" gutterBottom>
          Organization Manager Dashboard
        </Typography>
        {currentUser && <Typography variant="subtitle1">Welcome, {currentUser.displayName || currentUser.email}</Typography>}

        {organizations.length > 0 && (
          <FormControl fullWidth margin="normal">
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
            <Typography variant="h6" sx={{mt: 1}}>Managing Organization: {selectedOrganization.name}</Typography>
        )}
        {organizations.length > 0 && ( // Show "Create Another Organization" if any orgs exist
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={handleOpenAddOrgModal}>
              Create Another Organization
            </Button>
          </Box>
        )}
      </Paper>

      {selectedOrgId && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper', mx:2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="Organization Manager Dashboard Tabs">
              <Tab label="Property Managers" {...a11yProps(0)} />
              <Tab label="Properties" {...a11yProps(1)} />
              <Tab label="Residents" {...a11yProps(2)} />
              <Tab label="Invitations" {...a11yProps(3)} />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <OrgScopedPropertyManagerManagement 
              organizationId={selectedOrgId} 
              organizationCreatedBy={selectedOrganization?.createdBy || null} 
            />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Typography>Property Management for Org ID: {selectedOrgId}</Typography>
            {/* Placeholder: <OrgScopedPropertyManagement organizationId={selectedOrgId} /> */}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Typography>Resident Management for Org ID: {selectedOrgId}</Typography>
            {/* Placeholder: <OrgScopedResidentManagement organizationId={selectedOrgId} /> */}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <Typography>Invitation Management for Org ID: {selectedOrgId}</Typography>
            {/* Placeholder: <OrgScopedInvitationManagement organizationId={selectedOrgId} /> */}
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default OrganizationManagerDashboardPanel;
