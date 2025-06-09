import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Tabs,
  Tab,
  Divider,
  Stack,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import TestimonialCard from '../Marketing/TestimonialCard'; // Added
import PropertyDetailsView from './PropertyDetailsView';
import ResidentProfileManagement from './ResidentProfileManagement';
import CreateServiceRequestForm from './CreateServiceRequestForm';
import ServiceRequestList from './ServiceRequestList';
import ChatView from '../Chat/ChatView';

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
    <Container component='main' maxWidth='xl'>
      <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
        <Stack direction='row' alignItems='center' sx={{ mb: 2 }}>
          <AccountCircleIcon fontSize='large' color='primary' sx={{ mr: 1 }} />
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
          <Box
            sx={{
              minHeight: '400px',
            }}
          >
            <ChatView />
          </Box>
        </TabPanel>
      </Paper>
      <Divider sx={{ my: 6, borderColor: 'secondary.main' }} />
      {/* Testimonials Section */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          backgroundColor: 'background.default',
        }}
      >
        <Typography
          variant='h5'
          gutterBottom
          sx={{ mb: 2, textAlign: 'center' }}
        >
          What Other Residents Are Saying
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          <TestimonialCard
            quote='Friendly fast service 😊🙏'
            author='Samalam C'
            authorRole='Resident'
          />
          <TestimonialCard
            quote='He did amazing!! Very professional!!'
            author='A&A kidz'
            authorRole='Resident'
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 2, md: 10 },
            justifyContent: 'center',
            alignItems: 'center',
            mt: 3,
          }}
        >
          <Box
            component='img'
            src='/review1.png'
            alt='5.0 rating'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
          <Box
            component='img'
            src='/review2.png'
            alt='35 years experience'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
          <Box
            component='img'
            src='/review3.png'
            alt='satisfaction guaranteed'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default ResidentDashboard;
