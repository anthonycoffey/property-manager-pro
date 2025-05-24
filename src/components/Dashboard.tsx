import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Added
import { Box, Typography, Paper, Divider, Tabs, Tab, Button } from '@mui/material'; // Added Button
import LogoutButton from './LogoutButton';
import { useAuth } from '../hooks/useAuth';

// Admin Components
import OrganizationSelector from './Admin/OrganizationSelector';
import PropertyManagerManagement from './Admin/PropertyManagerManagement';
import InvitePropertyManagerForm from './Admin/InvitePropertyManagerForm';
import OrganizationManagementPanel from './Admin/OrganizationManagementPanel'; // Added import

// Property Manager Components
// InviteResidentForm is no longer directly used here

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}


const Dashboard: React.FC = () => {
  const { currentUser, roles, organizationId, propertyId } = useAuth();
  const [adminTabValue, setAdminTabValue] = useState(0);
  // const [pmTabValue, setPmTabValue] = useState(0); // Removed pmTabValue
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(null);

  const handleAdminOrgChange = (orgId: string | null) => {
    setSelectedAdminOrgId(orgId);
  };

  const handleAdminTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setAdminTabValue(newValue);
  };

  // const handlePmTabChange = (_event: React.SyntheticEvent, newValue: number) => { // Removed handlePmTabChange
  //   setPmTabValue(newValue);
  // };

  // examplePropertyIdForResidentInvite is no longer needed here

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h4' gutterBottom>
        Dashboard
      </Typography>
      {currentUser && (
        <Typography variant='body1' sx={{ mb: 2 }}>
          Logged in as: {currentUser.email} <LogoutButton />
        </Typography>
      )}

      {/* Admin Section */}
      {roles.includes('admin') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Typography variant='h5' color='primary' sx={{ mb: 2 }}>
            Administrator Panel
          </Typography>
          <OrganizationSelector
            selectedOrganizationId={selectedAdminOrgId}
            onOrganizationChange={handleAdminOrgChange}
          />
          <Divider sx={{ my: 2 }} />
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={adminTabValue} onChange={handleAdminTabChange} aria-label="admin actions tabs">
              <Tab label="Manage Organizations" {...a11yProps(0)} />
              <Tab label="Manage Property Managers" {...a11yProps(1)} />
              <Tab label="Invite Property Manager" {...a11yProps(2)} />
            </Tabs>
          </Box>
          <TabPanel value={adminTabValue} index={0}>
            <OrganizationManagementPanel />
          </TabPanel>
          <TabPanel value={adminTabValue} index={1}>
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          </TabPanel>
          <TabPanel value={adminTabValue} index={2}>
            <InvitePropertyManagerForm />
          </TabPanel>
        </Paper>
      )}

      {/* Property Manager Section */}
      {roles.includes('property_manager') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Typography variant='h5' color='secondary' sx={{ mb: 2 }}>
            Property Manager Panel (Org ID: {organizationId || 'N/A'})
          </Typography>
          <Button 
            variant="contained" 
            component={RouterLink} 
            to="/pm/properties" 
            sx={{ mr: 2 }}
          >
            View & Manage My Properties
          </Button>
          <Button 
            variant="outlined" 
            component={RouterLink}
            to="/pm/create-property" // This route points to Dashboard, which will show CreatePropertyForm via its own logic if needed
          >
            Create New Property
          </Button>
          {/* 
            Alternatively, if CreatePropertyForm should always be visible on this dashboard for PMs:
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6' sx={{ mb: 1 }}>Create a New Property</Typography>
            <CreatePropertyForm /> 
          */}
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
      
      {!roles.includes('admin') && !roles.includes('property_manager') && !roles.includes('resident') && (
        <Typography variant='body1' sx={{ mt: 2 }}>
          Your role is currently: {roles.join(', ') || 'Undefined'}. Specific dashboard content will appear once your role is fully provisioned or associated.
        </Typography>
      )}

    </Box>
  );
};

export default Dashboard;
