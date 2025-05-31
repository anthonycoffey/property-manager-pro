import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Tabs,
  Tab,
  Divider,
  Stack, // Added Stack
} from '@mui/material'; // Added Divider, Removed Grid
import { useAuth } from '../../hooks/useAuth';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Added AccountCircleIcon
import ApartmentIcon from '@mui/icons-material/Apartment';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // Icon for Chat
import PropertyDetailsView from './PropertyDetailsView';
import ResidentProfileManagement from './ResidentProfileManagement'; // Import the new component
import CreateServiceRequestForm from './CreateServiceRequestForm'; // Import new component
import ServiceRequestList from './ServiceRequestList'; // Import new component
import ChatView from '../Chat/ChatView'; // Import ChatView

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
      id={`resident-tabpanel-${index}`}
      aria-labelledby={`resident-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = React.useState(0);

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!currentUser) {
    return <Typography>Loading resident data...</Typography>;
  }

  return (
    <Container component='main' maxWidth='lg'>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }} elevation={6}>
        <Stack direction='row' alignItems='center' sx={{ mb: 2 }}>
          <AccountCircleIcon
            fontSize='large'
            color='primary'
            sx={{ mr: 1 }}
          />
          <Typography variant='h4' color='primary'>
            Resident Dashboard
          </Typography>
        </Stack>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTab}
            aria-label='resident dashboard tabs'
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
          >
            <Tab
              icon={<ApartmentIcon />}
              label='My Property'
              {...a11yProps(0)}
            />
            <Tab icon={<PersonIcon />} label='My Profile' {...a11yProps(1)} />
            <Tab
              icon={<BuildIcon />}
              label='Service Requests'
              {...a11yProps(2)}
            />
            <Tab
              icon={<ChatBubbleOutlineIcon />}
              label='AI Assistant'
              {...a11yProps(3)}
            />
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
              console.log(
                'Service request submitted, list should auto-refresh.'
              );
            }}
          />
          <Divider sx={{ my: 3 }} />
          <ServiceRequestList />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          {/* The ChatView component will manage its own height within this panel */}
          <Box sx={{ height: 'calc(100vh - 260px)', minHeight: '400px' /* Adjust Xpx based on surrounding elements */ }}>
            <ChatView />
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default ResidentDashboard;
