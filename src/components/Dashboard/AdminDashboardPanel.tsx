import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Tabs,
  Tab,
  Button,
  Stack,
  Snackbar,
  Alert,
  Container,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { AdminPanelSettings, ChatBubbleOutline as ChatBubbleOutlineIcon } from '@mui/icons-material'; // Added ChatBubbleOutlineIcon

import OrganizationSelector from '../Admin/OrganizationSelector';
import PropertyManagerManagement from '../Admin/PropertyManagerManagement';
import OrganizationManagementPanel from '../Admin/OrganizationManagementPanel';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import InviteOrganizationManagerForm from '../Admin/InviteOrganizationManagerForm';
import OrganizationManagerAssignments from '../Admin/OrganizationManagerAssignments';
import OrganizationPropertiesList from '../Admin/OrganizationPropertiesList';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';
import PropertyResidentsTable from '../PropertyManager/PropertyResidentsTable';
import InviteResidentForm from '../PropertyManager/InviteResidentForm';
import EditResidentModal from '../PropertyManager/EditResidentModal';
import AdminCampaignsView from '../Admin/Campaigns/AdminCampaignsView'; // Added
import ChatView from '../Chat/ChatView'; // Import ChatView
import type {
  Property as PropertyType,
  Resident as ResidentType,
} from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AdminDashboardPanel: React.FC = () => {
  const [adminTabValue, setAdminTabValue] = useState(0);
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(
    null
  );
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  // Property Modals
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(
    null
  );
  // Residents Modals & State
  const [isManageResidentsModalOpen, setIsManageResidentsModalOpen] =
    useState(false);
  const [propertyForResidents, setPropertyForResidents] =
    useState<PropertyType | null>(null);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<ResidentType | null>(
    null
  );
  const [refreshResidentsListKey, setRefreshResidentsListKey] = useState(0);

  const [refreshOrgListKey, setRefreshOrgListKey] = useState(0);
  const [refreshPropertiesListKey, setRefreshPropertiesListKey] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('success');

  const handleAdminOrgChange = (orgId: string | null) => {
    setSelectedAdminOrgId(orgId);
  };

  const handleOpenAddOrgModal = () => {
    setIsAddOrgModalOpen(true);
  };

  const handleCloseAddOrgModal = () => {
    setIsAddOrgModalOpen(false);
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
    setRefreshPropertiesListKey((prev) => prev + 1); // Refresh list
  };

  const handlePropertyUpdated = () => {
    setSnackbarMessage('Property updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditPropertyModalOpen(false);
    setPropertyToEdit(null);
    setRefreshPropertiesListKey((prev) => prev + 1); // Refresh list
  };

  const handleOpenEditPropertyModal = (property: PropertyType) => {
    setPropertyToEdit(property);
    setIsEditPropertyModalOpen(true);
  };

  const handleCloseEditPropertyModal = () => {
    setPropertyToEdit(null);
    setIsEditPropertyModalOpen(false);
  };

  const handleManageResidents = (property: PropertyType) => {
    // Changed to accept full property
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
    setRefreshResidentsListKey((prev) => prev + 1); // Refresh resident list
    // Note: InviteResidentForm might need an onCancel to close a sub-modal if it's in one
  };

  const handleResidentUpdated = () => {
    setSnackbarMessage('Resident updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditResidentModalOpen(false);
    setResidentToEdit(null);
    setRefreshResidentsListKey((prev) => prev + 1); // Refresh resident list
  };

  const handlePropertiesUpdate = () => {
    setRefreshPropertiesListKey((prev) => prev + 1);
  };

  const handleOrganizationCreated = (orgId: string) => {
    setSnackbarMessage(`Organization created successfully with ID: ${orgId}`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsAddOrgModalOpen(false);
    setRefreshOrgListKey((prev) => prev + 1);
  };

  const handleAdminTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setAdminTabValue(newValue);
  };

  return (
    <Container component='main' maxWidth='lg'>
      <Paper elevation={6} sx={{ mb: 4, p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
          }}
        >
          <Stack direction='row' alignItems='center'>
            <AdminPanelSettings
              fontSize='large'
              color='primary'
              sx={{ mr: 1 }}
            />
            <Typography variant='h4' color='primary'>
              Admin Dashboard
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              mt: { xs: 2, sm: 0 },
            }}
          >
            Add Organization
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={adminTabValue}
            onChange={handleAdminTabChange}
            aria-label='admin actions tabs'
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
          >
            <Tab label='Organizations' {...a11yProps(0)} />
            <Tab label='Organization Managers' {...a11yProps(1)} />
            <Tab label='Property Managers' {...a11yProps(2)} />
            <Tab label='Properties & Residents' {...a11yProps(3)} />
            <Tab label='Campaigns' {...a11yProps(4)} />
            <Tab label='AI Assistant' icon={<ChatBubbleOutlineIcon />} {...a11yProps(5)} />
          </Tabs>
        </Box>
        <TabPanel value={adminTabValue} index={0}>
          <OrganizationManagementPanel key={refreshOrgListKey} />
        </TabPanel>
        <TabPanel value={adminTabValue} index={1}>
          <Typography variant='h6' gutterBottom>
            Invite Organization Managers
          </Typography>
          <InviteOrganizationManagerForm />

          <Divider sx={{ my: 3 }} />

          <OrganizationManagerAssignments />
        </TabPanel>
        <TabPanel value={adminTabValue} index={2}>
          <OrganizationSelector
            selectedOrganizationId={selectedAdminOrgId}
            onOrganizationChange={handleAdminOrgChange}
          />
          <Divider sx={{ my: 2 }} />
          {selectedAdminOrgId ? (
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          ) : (
            <Typography>
              Select an organization to view its property managers.
            </Typography>
          )}
        </TabPanel>
        <TabPanel value={adminTabValue} index={3}>
          <OrganizationSelector
            selectedOrganizationId={selectedAdminOrgId}
            onOrganizationChange={handleAdminOrgChange}
          />
          <Divider sx={{ my: 2 }} />
          {selectedAdminOrgId ? (
            <>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={handleOpenCreatePropertyModal}
                sx={{ mb: 2 }}
              >
                Create Property
              </Button>
              <OrganizationPropertiesList
                key={refreshPropertiesListKey} // Add key for re-fetching
                organizationId={selectedAdminOrgId}
                onEditProperty={handleOpenEditPropertyModal}
                onManageResidents={handleManageResidents} // Directly use the handler
                onPropertiesUpdate={handlePropertiesUpdate}
              />
            </>
          ) : (
            <Typography>
              Select an organization to manage its properties and residents.
            </Typography>
          )}
        </TabPanel>
        <TabPanel value={adminTabValue} index={4}>
          <AdminCampaignsView />
        </TabPanel>
        <TabPanel value={adminTabValue} index={5}>
          <Box sx={{ height: 'calc(100vh - 320px)', minHeight: '400px' /* Adjust Xpx based on surrounding elements */ }}>
            <ChatView />
          </Box>
        </TabPanel>

        <AddOrganizationModal
          open={isAddOrgModalOpen}
          onClose={handleCloseAddOrgModal}
          onOrganizationCreated={handleOrganizationCreated}
        />

        {selectedAdminOrgId && (
          <AddOrganizationModal
            open={isCreatePropertyModalOpen}
            onClose={handleCloseCreatePropertyModal}
            title='Create New Property'
          >
            <CreatePropertyForm
              organizationId={selectedAdminOrgId}
              onSuccess={handlePropertyCreated}
              onCancel={handleCloseCreatePropertyModal}
            />
          </AddOrganizationModal>
        )}

        {propertyToEdit && selectedAdminOrgId && (
          <EditPropertyModal
            propertyData={propertyToEdit} // Corrected prop name
            organizationId={selectedAdminOrgId}
            open={isEditPropertyModalOpen}
            onClose={handleCloseEditPropertyModal}
            onSuccess={handlePropertyUpdated}
          />
        )}

        {/* Modal for Managing Residents */}
        {propertyForResidents && selectedAdminOrgId && (
          <AddOrganizationModal
            open={isManageResidentsModalOpen}
            onClose={handleCloseManageResidentsModal}
            title={`Residents for Property: ${propertyForResidents.name}`}
            // maxWidth="lg" // Consider making it larger
          >
            <Box>
              <Typography variant='h6' gutterBottom>
                Invite New Resident
              </Typography>
              <InviteResidentForm
                organizationId={selectedAdminOrgId}
                propertyId={propertyForResidents.id}
                propertyName={propertyForResidents.name}
                onInvitationSent={handleResidentInvited} // Corrected prop name
                // onCancel could be added if InviteResidentForm is complex enough to need its own cancel
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant='h6' gutterBottom>
                Current Residents
              </Typography>
              <PropertyResidentsTable
                key={refreshResidentsListKey}
                organizationId={selectedAdminOrgId}
                propertyId={propertyForResidents.id}
                onEditResident={handleOpenEditResidentModal}
                refreshKey={refreshResidentsListKey}
              />
            </Box>
          </AddOrganizationModal>
        )}

        {residentToEdit && selectedAdminOrgId && propertyForResidents && (
          <EditResidentModal
            open={isEditResidentModalOpen}
            onClose={handleCloseEditResidentModal}
            residentData={residentToEdit}
            organizationId={selectedAdminOrgId}
            propertyId={propertyForResidents.id}
            onSuccess={handleResidentUpdated}
          />
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default AdminDashboardPanel;
