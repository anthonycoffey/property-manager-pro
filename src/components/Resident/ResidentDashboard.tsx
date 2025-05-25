import React from 'react';
import { Box, Typography, Paper, Grid, Container, Tabs, Tab, Divider } from '@mui/material'; // Added Divider
import { useAuth } from '../../hooks/useAuth';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import PropertyDetailsView from './PropertyDetailsView';
import ResidentProfileManagement from './ResidentProfileManagement'; // Import the new component
import CreateServiceRequestForm from './CreateServiceRequestForm'; // Import new component
import ServiceRequestList from './ServiceRequestList'; // Import new component

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
      id={`resident-tabpanel-${index}`}
      aria-labelledby={`resident-tab-${index}`}
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
    id: `resident-tab-${index}`,
    'aria-controls': `resident-tabpanel-${index}`,
  };
}

const ResidentDashboard: React.FC = () => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const [tabValue, setTabValue] = React.useState(0);

  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!currentUser) {
    return <Typography>Loading resident data...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" gutterBottom component="div" sx={{ mb: 2 }}>
          Welcome, {currentUser.displayName || 'Resident'}!
        </Typography>
        <Typography variant="subtitle1" gutterBottom component="div" sx={{ mb: 2 }}>
          Organization ID: {organizationId || 'N/A'}
        </Typography>
        <Typography variant="subtitle1" gutterBottom component="div" sx={{ mb: 4 }}>
          Property ID: {propertyId || 'N/A'}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleChangeTab} aria-label="resident dashboard tabs">
            <Tab icon={<ApartmentIcon />} label="My Property" {...a11yProps(0)} />
            <Tab icon={<PersonIcon />} label="My Profile" {...a11yProps(1)} />
            <Tab icon={<BuildIcon />} label="Service Requests" {...a11yProps(2)} />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <PropertyDetailsView />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ResidentProfileManagement />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <CreateServiceRequestForm 
            onServiceRequestSubmitted={() => {
              // Potentially refresh the list or show a global success message
              // For now, ServiceRequestList uses onSnapshot so it will update automatically
              console.log("Service request submitted, list should auto-refresh.");
            }} 
          />
          <Divider sx={{ my: 3 }} />
          <ServiceRequestList />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ResidentDashboard;
