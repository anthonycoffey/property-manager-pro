import React, { useState, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { Link as RouterLink } from 'react-router-dom'; // Added
import {
  Box,
  Typography,
  Paper,
  Divider,
  Tabs,
  Tab,
  Button,
  Alert, // Added Alert
} from '@mui/material'; // Added Button
import AddIcon from '@mui/icons-material/Add'; // Added AddIcon
import { useAuth } from '../hooks/useAuth';

// Admin Components
import OrganizationSelector from './Admin/OrganizationSelector';
import PropertyManagerManagement from './Admin/PropertyManagerManagement';
// InvitePropertyManagerForm is no longer directly imported here as it's inside PropertyManagerManagement
import OrganizationManagementPanel, { type OrganizationManagementPanelRef } from './Admin/OrganizationManagementPanel'; // Added import and type

// Property Manager Components
import PropertyManagerPropertiesList from './PropertyManager/PropertyManagerPropertiesList'; // Added
import InviteResidentForm from './PropertyManager/InviteResidentForm'; // Added

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

const Dashboard: React.FC = () => {
  const { currentUser, roles, organizationId, propertyId } = useAuth();
  const [adminTabValue, setAdminTabValue] = useState(0);
  const [pmTabValue, setPmTabValue] = useState(0); // Added state for PM tabs
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(null);
  const [selectedPropertyIdForPM, setSelectedPropertyIdForPM] = useState<string | null>(null); // Added state for selected property for PM
  const organizationPanelRef = useRef<OrganizationManagementPanelRef>(null); // Added ref

  const handleAdminOrgChange = (orgId: string | null) => {
    setSelectedAdminOrgId(orgId);
  };

  const handleOpenAddOrgModal = () => {
    organizationPanelRef.current?.openAddModal();
  };

  const handleAdminTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setAdminTabValue(newValue);
  };

  const handlePmTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setPmTabValue(newValue);
  }, []);

  const handlePropertySelectForPM = useCallback((propertyId: string) => {
    setSelectedPropertyIdForPM(propertyId);
    // Optionally, switch to the "Invite Resident" tab automatically
    // setPmTabValue(1); 
  }, []);

  // examplePropertyIdForResidentInvite is no longer needed here

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' gutterBottom>
        Dashboard
      </Typography>
      {currentUser && (
        <Typography variant='body1' sx={{ mb: 2 }}>
          Logged in as: {currentUser.email}
        </Typography>
      )}

      {/* Admin Section */}
      {roles.includes('admin') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          {/* "Administrator Panel" Typography removed */}
          {/* OrganizationSelector moved into TabPanels */}
          {/* Divider related to old OrganizationSelector position removed */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={adminTabValue}
              onChange={handleAdminTabChange}
              aria-label='admin actions tabs'
            >
              <Tab label='Organizations' {...a11yProps(0)} />
              <Tab label='Property Managers' {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={adminTabValue} index={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
              {/* OrganizationSelector and its wrapper Box removed from this tab */}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddOrgModal}
                // sx={{ ml: 2 }} // ml:2 removed as it's the only item aligned to end
              >
                Add Organization
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <OrganizationManagementPanel ref={organizationPanelRef} />
          </TabPanel>
          <TabPanel value={adminTabValue} index={1}>
            {/* OrganizationSelector remains in the Property Managers tab, placed directly as before */}
            <OrganizationSelector
              selectedOrganizationId={selectedAdminOrgId}
              onOrganizationChange={handleAdminOrgChange}
            />
            <Divider sx={{ my: 2 }} />
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          </TabPanel>
          {/* TabPanel for InvitePropertyManagerForm removed */}
        </Paper>
      )}

      {/* Property Manager Section */}
      {roles.includes('property_manager') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Typography variant='h5' color='secondary' sx={{ mb: 2 }}>
            Property Manager Panel (Org ID: {organizationId || 'N/A'})
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={pmTabValue}
              onChange={handlePmTabChange}
              aria-label='property manager actions tabs'
            >
              <Tab label='My Properties' {...a11yProps(0)} />
              <Tab label='Invite Resident' {...a11yProps(1)} />
              <Tab label='Create Property' {...a11yProps(2)} />
            </Tabs>
          </Box>
          <TabPanel value={pmTabValue} index={0}>
            <PropertyManagerPropertiesList
              selectedPropertyId={selectedPropertyIdForPM}
              onPropertySelect={handlePropertySelectForPM}
            />
          </TabPanel>
          <TabPanel value={pmTabValue} index={1}>
            {selectedPropertyIdForPM ? (
              <InviteResidentForm
                organizationId={organizationId || ''} // Pass organizationId
                propertyId={selectedPropertyIdForPM}
              />
            ) : (
              <Alert severity="info">Please select a property from the "My Properties" tab to invite a resident.</Alert>
            )}
          </TabPanel>
          <TabPanel value={pmTabValue} index={2}>
            {/* Placeholder for CreatePropertyForm if you want it in a tab */}
            {/* For now, linking to the page as before, or you can embed CreatePropertyForm here */}
            <Typography variant="h6" gutterBottom>Create New Property</Typography>
            <Button
              variant='outlined'
              component={RouterLink}
              to='/pm/create-property'
            >
              Go to Create Property Page
            </Button>
            {/* Or embed directly: <CreatePropertyForm /> */}
          </TabPanel>
        </Paper>
      )}

      {/* Resident Section */}
      {roles.includes('resident') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Typography variant='h5' color='info' sx={{ mb: 2 }}>
            Resident Portal
          </Typography>
          <Typography variant='body1'>
            Welcome, Resident! Your Organization ID: {organizationId || 'N/A'},
            Property ID: {propertyId || 'N/A'}.
          </Typography>
          {/* Resident specific components would go here */}
        </Paper>
      )}

      {!roles.includes('admin') &&
        !roles.includes('property_manager') &&
        !roles.includes('resident') && (
          <Typography variant='body1' sx={{ mt: 2 }}>
            Your role is currently: {roles.join(', ') || 'Undefined'}. Specific
            dashboard content will appear once your role is fully provisioned or
            associated.
          </Typography>
        )}
    </Box>
  );
};

export default Dashboard;
