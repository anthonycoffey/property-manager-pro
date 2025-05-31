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
  Tabs, // Added Tabs
  Tab,  // Added Tab
  Divider, // Added Divider
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // Icon for Chat
import OrgManagerCampaignsView from '../OrganizationManager/Campaigns/OrgManagerCampaignsView'; // Added
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../hooks/useAuth';
import OrgScopedPropertyManagerManagement from '../OrganizationManager/OrgScopedPropertyManagerManagement';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import OrganizationPropertiesList from '../Admin/OrganizationPropertiesList';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';
import PropertyResidentsTable from '../PropertyManager/PropertyResidentsTable'; // Added
import InviteResidentForm from '../PropertyManager/InviteResidentForm';     // Added
import EditResidentModal from '../PropertyManager/EditResidentModal';       // Added
import ChatView from '../Chat/ChatView'; // Import ChatView
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Organization, AppError, Property as PropertyType, Resident as ResidentType } from '../../types'; // Added ResidentType

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
      id={`om-tabpanel-${index}`}
      aria-labelledby={`om-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `om-tab-${index}`,
    'aria-controls': `om-tabpanel-${index}`,
  };
}

interface OrganizationManagerDashboardPanelProps {
  orgIds: string[] | null | undefined;
}

const OrganizationManagerDashboardPanel: React.FC<
  OrganizationManagerDashboardPanelProps
> = ({ orgIds }) => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  // Property Modals
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] = useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(null);
  // Residents Modals & State
  const [isManageResidentsModalOpen, setIsManageResidentsModalOpen] = useState(false);
  const [propertyForResidents, setPropertyForResidents] = useState<PropertyType | null>(null);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<ResidentType | null>(null);
  const [refreshResidentsListKey, setRefreshResidentsListKey] = useState(0);
  
  const [refreshPropertiesListKey, setRefreshPropertiesListKey] = useState(0);
  const [tabValue, setTabValue] = useState(0); 

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(true);
  };

  const handleCloseCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(false);
  };

  const handlePropertyCreated = () => {
    setSnackbarMessage('Property created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsCreatePropertyModalOpen(false);
    setRefreshPropertiesListKey(prev => prev + 1);
  };

  const handleOpenEditPropertyModal = (property: PropertyType) => {
    setPropertyToEdit(property);
    setIsEditPropertyModalOpen(true);
  };

  const handleCloseEditPropertyModal = () => {
    setPropertyToEdit(null);
    setIsEditPropertyModalOpen(false);
  };

  const handlePropertyUpdated = () => {
    setSnackbarMessage('Property updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditPropertyModalOpen(false);
    setPropertyToEdit(null);
    setRefreshPropertiesListKey(prev => prev + 1);
  };

  // Resident Management Handlers (similar to AdminDashboardPanel)
  const handleManageResidents = (property: PropertyType) => {
    setPropertyForResidents(property);
    setIsManageResidentsModalOpen(true);
  };

  const handleCloseManageResidentsModal = () => {
    setIsManageResidentsModalOpen(false);
    setPropertyForResidents(null);
  };

  const handleOpenEditResidentModal = (resident: ResidentType) => {
    setResidentToEdit(resident);
    setIsEditResidentModalOpen(true);
  };

  const handleCloseEditResidentModal = () => {
    setResidentToEdit(null);
    setIsEditResidentModalOpen(false);
  };
  
  const handleResidentInvited = () => {
    setSnackbarMessage('Resident invited successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setRefreshResidentsListKey(prev => prev + 1);
  };

  const handleResidentUpdated = () => {
    setSnackbarMessage('Resident updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditResidentModalOpen(false);
    setResidentToEdit(null);
    setRefreshResidentsListKey(prev => prev + 1);
  };

  const handlePropertiesUpdate = () => {
    setRefreshPropertiesListKey(prev => prev + 1);
  };

  const handleAddOrgSuccess = () => {
    handleCloseAddOrgModal();
    setSnackbarMessage('Organization created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    fetchOrganizations(); 
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  if (loading) {
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

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity='error'>{error.message}</Alert>
      </Paper>
    );
  }

  const selectedOrganization = organizations.find(
    (org) => org.id === selectedOrgId
  );

  return (
    <Container component='main' maxWidth='lg'>
      <Paper sx={{ p: 2, mb: 4 }} elevation={6}>
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
            sx={{ mb: { xs: 1, sm: 0 } }}
          >
            <AdminPanelSettings
              fontSize='large'
              color='primary'
              sx={{ mr: 1 }}
            />
            <Typography variant='h4' color='primary'>
              Organization Dashboard
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              mt: { xs: 1, sm: 0 },
            }}
          >
            Add Organization
          </Button>
        </Box>

        {organizations.length > 0 && (
          <FormControl fullWidth margin='normal' sx={{ mt: 2 }}>
            <InputLabel id='om-org-selector-label'>
              Select Organization
            </InputLabel>
            <Select
              labelId='om-org-selector-label'
              id='om-org-selector'
              value={selectedOrgId}
              label='Select Organization'
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
          <Alert severity='info' sx={{ mt: 1, mb: 2 }}>
            Managing Organization: {selectedOrganization.name}
          </Alert>
        )}

        {selectedOrgId && selectedOrganization && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="organization manager actions tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                <Tab label="Property Managers" {...a11yProps(0)} />
                <Tab label="Properties & Residents" {...a11yProps(1)} />
                <Tab label="Campaigns" {...a11yProps(2)} />
                <Tab label="AI Assistant" icon={<ChatBubbleOutlineIcon />} {...a11yProps(3)} />
              </Tabs>
            </Box>
            <TabPanel value={tabValue} index={0}>
              <OrgScopedPropertyManagerManagement
                organizationId={selectedOrgId}
                organizationCreatedBy={selectedOrganization?.createdBy || null}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreatePropertyModal}
                sx={{ mb: 2 }}
                disabled={!selectedOrgId}
              >
                Create Property
              </Button>
              <OrganizationPropertiesList
                key={refreshPropertiesListKey}
                organizationId={selectedOrgId}
                onEditProperty={handleOpenEditPropertyModal}
                onManageResidents={handleManageResidents} // Should now align as handleManageResidents expects PropertyType
                onPropertiesUpdate={handlePropertiesUpdate}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <OrgManagerCampaignsView />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ height: 'calc(100vh - 400px)', minHeight: '400px' /* Adjust Xpx based on surrounding elements and org selector */ }}>
                <ChatView />
              </Box>
            </TabPanel>
          </>
        )}
         {!selectedOrgId && organizations.length > 0 && (
          <Typography sx={{p:2}}>Please select an organization to manage.</Typography>
        )}
        {organizations.length === 0 && !loading && (
            <Typography sx={{p:2}}>
                You are not currently managing any organizations. You can create one using the "Add Organization" button.
            </Typography>
        )}
      </Paper>

      <AddOrganizationModal
        open={isAddOrgModalOpen}
        onClose={handleCloseAddOrgModal}
        onOrganizationCreated={handleAddOrgSuccess}
      />

      {selectedOrgId && (
        <AddOrganizationModal
          open={isCreatePropertyModalOpen}
          onClose={handleCloseCreatePropertyModal}
          title="Create New Property"
        >
          <CreatePropertyForm
            organizationId={selectedOrgId}
            onSuccess={handlePropertyCreated}
            onCancel={handleCloseCreatePropertyModal}
          />
        </AddOrganizationModal>
      )}

      {propertyToEdit && selectedOrgId && (
        <EditPropertyModal
          propertyData={propertyToEdit}
          organizationId={selectedOrgId} // Pass organizationId
          open={isEditPropertyModalOpen}
          onClose={handleCloseEditPropertyModal}
          onSuccess={handlePropertyUpdated}
        />
      )}

      {/* Modal for Managing Residents for OM */}
      {propertyForResidents && selectedOrgId && (
        <AddOrganizationModal
          open={isManageResidentsModalOpen}
          onClose={handleCloseManageResidentsModal}
          title={`Residents for Property: ${propertyForResidents.name}`}
        >
          <Box>
            <Typography variant="h6" gutterBottom>Invite New Resident</Typography>
            <InviteResidentForm
              organizationId={selectedOrgId}
              propertyId={propertyForResidents.id}
              propertyName={propertyForResidents.name}
              onInvitationSent={handleResidentInvited}
            />
            <Divider sx={{my: 2}} />
            <Typography variant="h6" gutterBottom>Current Residents</Typography>
            <PropertyResidentsTable
              key={refreshResidentsListKey}
              organizationId={selectedOrgId}
              propertyId={propertyForResidents.id}
              onEditResident={handleOpenEditResidentModal}
              refreshKey={refreshResidentsListKey}
            />
          </Box>
        </AddOrganizationModal>
      )}

      {residentToEdit && selectedOrgId && propertyForResidents && (
        <EditResidentModal
          open={isEditResidentModalOpen}
          onClose={handleCloseEditResidentModal}
          residentData={residentToEdit}
          organizationId={selectedOrgId}
          propertyId={propertyForResidents.id}
          onSuccess={handleResidentUpdated}
        />
      )}

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

export default OrganizationManagerDashboardPanel;
