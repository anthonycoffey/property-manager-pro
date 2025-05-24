import React, { useState } from 'react';
import { Box, Typography, Paper, Divider, Tabs, Tab } from '@mui/material';
import LogoutButton from './LogoutButton';
import { useAuth } from '../hooks/useAuth';

// Admin Components
import OrganizationSelector from './Admin/OrganizationSelector'; // Added import
import PropertyManagerManagement from './Admin/PropertyManagerManagement';
import InvitePropertyManagerForm from './Admin/InvitePropertyManagerForm';

// Property Manager Components
import CreatePropertyForm from './PropertyManager/CreatePropertyForm';
import InviteResidentForm from './PropertyManager/InviteResidentForm';

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
  const [pmTabValue, setPmTabValue] = useState(0);
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(null); // Added state for selected org

  const handleAdminOrgChange = (orgId: string | null) => { // Added handler
    setSelectedAdminOrgId(orgId);
    // Potentially reset adminTabValue or other related states if needed when org changes
  };

  const handleAdminTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setAdminTabValue(newValue);
  };

  const handlePmTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setPmTabValue(newValue);
  };

  // Example property ID for InviteResidentForm, in a real app this would be dynamic
  // (e.g., selected from a list of properties the PM manages)
  const examplePropertyIdForResidentInvite = "property123";


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
              <Tab label="Manage Property Managers" {...a11yProps(0)} />
              <Tab label="Invite Property Manager" {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={adminTabValue} index={0}>
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          </TabPanel>
          <TabPanel value={adminTabValue} index={1}>
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
           <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={pmTabValue} onChange={handlePmTabChange} aria-label="property manager actions tabs">
              <Tab label="Create Property" {...a11yProps(0)} />
              <Tab label="Invite Resident" {...a11yProps(1)} />
              {/* Add more tabs for other PM actions like viewing properties, managing residents etc. */}
            </Tabs>
          </Box>
          <TabPanel value={pmTabValue} index={0}>
            <CreatePropertyForm />
          </TabPanel>
          <TabPanel value={pmTabValue} index={1}>
            {/* In a real app, propertyId would come from a selected property context */}
            <InviteResidentForm propertyId={examplePropertyIdForResidentInvite} />
            <Typography variant="caption" display="block" sx={{mt: 1}}>
                (Note: Currently inviting to a sample property ID: {examplePropertyIdForResidentInvite})
            </Typography>
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
      
      {!roles.includes('admin') && !roles.includes('property_manager') && !roles.includes('resident') && (
        <Typography variant='body1' sx={{ mt: 2 }}>
          Your role is currently: {roles.join(', ') || 'Undefined'}. Specific dashboard content will appear once your role is fully provisioned or associated.
        </Typography>
      )}

    </Box>
  );
};

export default Dashboard;
