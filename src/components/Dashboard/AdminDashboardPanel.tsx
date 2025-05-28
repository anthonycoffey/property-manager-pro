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
import { AdminPanelSettings } from '@mui/icons-material';

import OrganizationSelector from '../Admin/OrganizationSelector';
import PropertyManagerManagement from '../Admin/PropertyManagerManagement';
import OrganizationManagementPanel from '../Admin/OrganizationManagementPanel';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import InviteOrganizationManagerForm from '../Admin/InviteOrganizationManagerForm';
import AssignOrgToManagerForm from '../Admin/AssignOrgToManagerForm'; // Import the new form for assigning

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
  const [refreshOrgListKey, setRefreshOrgListKey] = useState(0);
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
          </Tabs>
        </Box>
        <TabPanel value={adminTabValue} index={0}>
          <OrganizationManagementPanel key={refreshOrgListKey} />
        </TabPanel>
        <TabPanel value={adminTabValue} index={1}>
          <Typography variant='h6' gutterBottom>
            Invite Organization Manager
          </Typography>
          <InviteOrganizationManagerForm />

          <Divider sx={{ my: 3 }} />

          <Typography variant='h6' gutterBottom>
            Assign Organization
          </Typography>
          <AssignOrgToManagerForm />
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

        <AddOrganizationModal
          open={isAddOrgModalOpen}
          onClose={handleCloseAddOrgModal}
          onOrganizationCreated={handleOrganizationCreated}
        />

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
