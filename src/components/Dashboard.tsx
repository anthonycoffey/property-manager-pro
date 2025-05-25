import React, { useState, useRef, useCallback, useEffect } from 'react'; // Added useEffect, useRef, useCallback
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
  Dialog, // Added Dialog
  DialogTitle, // Added DialogTitle
  DialogContent, // Added DialogContent
  DialogActions, // Added DialogActions
  IconButton,
  Stack, // Added IconButton
} from '@mui/material'; // Added Button
import AddIcon from '@mui/icons-material/Add'; // Added AddIcon
import CloseIcon from '@mui/icons-material/Close'; // Added CloseIcon for Dialog
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore'; // Added for fetching org name
import { db } from '../firebaseConfig'; // Added for fetching org name

// Admin Components
import OrganizationSelector from './Admin/OrganizationSelector';
import PropertyManagerManagement from './Admin/PropertyManagerManagement';
// InvitePropertyManagerForm is no longer directly imported here as it's inside PropertyManagerManagement
import OrganizationManagementPanel, {
  type OrganizationManagementPanelRef,
} from './Admin/OrganizationManagementPanel'; // Added import and type

// Property Manager Components
import PropertyManagerPropertiesList from './PropertyManager/PropertyManagerPropertiesList';
import InviteResidentForm from './PropertyManager/InviteResidentForm';
import CreatePropertyForm from './PropertyManager/CreatePropertyForm';
import PropertySelectorDropdown from './PropertyManager/PropertySelectorDropdown';
import EditPropertyModal from './PropertyManager/EditPropertyModal'; // Added EditPropertyModal
import type { Property as PropertyType } from '../types'; // Added PropertyType import
import ResidentDashboard from './Resident/ResidentDashboard'; // Added ResidentDashboard
import { AdminPanelSettings } from '@mui/icons-material';

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
  const { currentUser, roles, organizationId } = useAuth();
  const [adminTabValue, setAdminTabValue] = useState(0);
  const [pmTabValue, setPmTabValue] = useState(0);
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(
    null
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [selectedPropertyName, setSelectedPropertyName] = useState<
    string | null
  >(null);
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const organizationPanelRef = useRef<OrganizationManagementPanelRef>(null);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(
    null
  );
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0);

  // Fetch organization name
  useEffect(() => {
    const fetchOrgName = async () => {
      if (organizationId) {
        try {
          const orgDocRef = doc(db, 'organizations', organizationId);
          const orgDocSnap = await getDoc(orgDocRef);
          if (orgDocSnap.exists()) {
            setOrganizationName(orgDocSnap.data()?.name || 'N/A');
          } else {
            setOrganizationName('N/A');
          }
        } catch (error) {
          console.error('Error fetching organization name:', error);
          setOrganizationName('Error');
        }
      }
    };

    if (roles.includes('property_manager')) {
      fetchOrgName();
    }
  }, [organizationId, roles]);

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

  const handlePmTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setPmTabValue(newValue);
    },
    []
  );

  const handlePropertySelect = useCallback(
    (propertyId: string | null, propertyName?: string | null) => {
      setSelectedPropertyId(propertyId);
      setSelectedPropertyName(propertyName ?? null);
    },
    []
  );

  const handleOpenCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(true);
  };

  const handleCloseCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(false);
  };

  const handlePropertyCreated = () => {
    handleCloseCreatePropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1);
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
    handleCloseEditPropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      {currentUser && (
        <Typography variant='body1' sx={{ mb: 2 }}>
          Logged in as: {currentUser.email}
        </Typography>
      )}

      {/* Admin Section */}
      {roles.includes('admin') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Stack direction='row' alignItems='center'>
              <AdminPanelSettings fontSize='large' color="primary" sx={{ mr: 1 }} />
              <Typography variant='h4' color='secondary'>
                Admin Dashboard
              </Typography>
            </Stack>
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={handleOpenAddOrgModal}
              sx={{ float: 'right' }}
            >
              Add Organization
            </Button>
          </Box>

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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {/* OrganizationSelector and its wrapper Box removed from this tab */}
            </Box>
            <OrganizationManagementPanel ref={organizationPanelRef} />
          </TabPanel>
          <TabPanel value={adminTabValue} index={1}>
            <OrganizationSelector
              selectedOrganizationId={selectedAdminOrgId}
              onOrganizationChange={handleAdminOrgChange}
            />
            <Divider sx={{ my: 2 }} />
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          </TabPanel>
        </Paper>
      )}

      {/* Property Manager Section */}
      {roles.includes('property_manager') && (
        <Paper elevation={3} sx={{ mb: 4, p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant='h4' color='secondary'>
              {organizationName || organizationId}
            </Typography>
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={handleOpenCreatePropertyModal}
            >
              Add Property
            </Button>
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={pmTabValue}
              onChange={handlePmTabChange}
              aria-label='property manager actions tabs'
            >
              <Tab label='My Properties' {...a11yProps(0)} />
              <Tab label='Invite Resident' {...a11yProps(1)} />
            </Tabs>
          </Box>
          <TabPanel value={pmTabValue} index={0}>
            <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
              Your Managed Properties
            </Typography>
            <PropertyManagerPropertiesList
              key={refreshPropertiesKey}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={(id: string) => handlePropertySelect(id)}
              onEditProperty={handleOpenEditPropertyModal}
              onPropertiesUpdate={() =>
                setRefreshPropertiesKey((prev) => prev + 1)
              }
            />
          </TabPanel>
          <TabPanel value={pmTabValue} index={1}>
            <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
              Invite New Resident
            </Typography>
            <PropertySelectorDropdown
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={handlePropertySelect}
            />
            {selectedPropertyId ? (
              <InviteResidentForm
                organizationId={organizationId || ''}
                propertyId={selectedPropertyId}
                propertyName={selectedPropertyName || undefined}
              />
            ) : (
              <Alert severity='info' sx={{ mt: 2 }}>
                Please select a property from the dropdown above to invite a
                resident.
              </Alert>
            )}
          </TabPanel>
        </Paper>
      )}

      {/* Create Property Modal */}
      <Dialog
        open={isCreatePropertyModalOpen}
        onClose={handleCloseCreatePropertyModal}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>
          Create New Property
          <IconButton
            aria-label='close'
            onClick={handleCloseCreatePropertyModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <CreatePropertyForm onSuccess={handlePropertyCreated} />
        </DialogContent>
      </Dialog>

      {/* Edit Property Modal */}
      {propertyToEdit && (
        <EditPropertyModal
          open={isEditPropertyModalOpen}
          onClose={handleCloseEditPropertyModal}
          propertyData={propertyToEdit}
          onSuccess={handlePropertyUpdated}
        />
      )}

      {/* Resident Section */}
      {roles.includes('resident') && <ResidentDashboard />}

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
