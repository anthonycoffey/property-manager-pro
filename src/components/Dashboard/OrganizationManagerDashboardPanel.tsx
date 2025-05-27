import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Tabs, Tab, type SelectChangeEvent } from '@mui/material'; // Added type keyword for SelectChangeEvent
import { useAuth } from '../../hooks/useAuth';
import OrgScopedPropertyManagerManagement from '../OrganizationManager/OrgScopedPropertyManagerManagement'; // Import the new component

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
  const { currentUser } = useAuth(); // May need more from useAuth later
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (orgIds && orgIds.length > 0) {
      setSelectedOrgId(orgIds[0]); // Default to the first organization
    } else {
      setSelectedOrgId('');
    }
  }, [orgIds]);

  const handleOrgChange = (event: SelectChangeEvent<string>) => { 
    setSelectedOrgId(event.target.value as string);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!orgIds || orgIds.length === 0) {
    return (
      <Paper sx={{ p: 2, margin: 2 }}>
        <Typography variant="h6">Organization Manager Dashboard</Typography>
        <Typography>
          You are not currently assigned to manage any organizations. Please contact an administrator.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, margin: 2, mb: 0, borderBottomLeftRadius:0, borderBottomRightRadius:0 }}>
        <Typography variant="h5" gutterBottom>
          Organization Manager Dashboard
        </Typography>
        {currentUser && <Typography variant="subtitle1">Welcome, {currentUser.displayName || currentUser.email}</Typography>}

        {orgIds.length > 1 && (
          <FormControl fullWidth margin="normal">
            <InputLabel id="om-org-selector-label">Select Organization</InputLabel>
            <Select
              labelId="om-org-selector-label"
              id="om-org-selector"
              value={selectedOrgId}
              label="Select Organization"
              onChange={handleOrgChange}
            >
              {orgIds.map((id) => (
                // In a real app, you'd fetch organization names to display here
                <MenuItem key={id} value={id}>
                  Organization ID: {id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
         {orgIds.length === 1 && selectedOrgId && (
            <Typography variant="h6" sx={{mt: 1}}>Managing Organization ID: {selectedOrgId}</Typography>
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
            <OrgScopedPropertyManagerManagement organizationId={selectedOrgId} />
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
