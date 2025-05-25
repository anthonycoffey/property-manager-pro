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
  IconButton, // Added IconButton
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
import OrganizationManagementPanel, { type OrganizationManagementPanelRef } from './Admin/OrganizationManagementPanel'; // Added import and type

// Property Manager Components
import PropertyManagerPropertiesList from './PropertyManager/PropertyManagerPropertiesList'; // Added
import InviteResidentForm from './PropertyManager/InviteResidentForm'; // Added
import CreatePropertyForm from './PropertyManager/CreatePropertyForm'; // Added
import PropertySelectorDropdown from './PropertyManager/PropertySelectorDropdown'; // Added

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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null); // Renamed
  const [selectedPropertyName, setSelectedPropertyName] = useState<string | null>(null); // Renamed
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] = useState(false); // Added state for modal
  const [organizationName, setOrganizationName] = useState<string | null>(null); // Added state for org name
  const organizationPanelRef = useRef<OrganizationManagementPanelRef>(null); // Added ref

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
          console.error("Error fetching organization name:", error);
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

  const handlePmTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setPmTabValue(newValue);
  }, []);

  // Renamed and updated to handle calls with or without propertyName
  const handlePropertySelect = useCallback((propertyId: string | null, propertyName?: string | null) => {
    setSelectedPropertyId(propertyId);
    setSelectedPropertyName(propertyName ?? null); // Ensure it's null if undefined
    // Optionally, switch to the "Invite Resident" tab automatically
    // if (propertyId) setPmTabValue(1); // Example: switch if a property is selected
  }, []);

  const handleOpenCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(true);
  };

  const handleCloseCreatePropertyModal = () => {
    setIsCreatePropertyModalOpen(false);
  };

  const handlePropertyCreated = () => {
    handleCloseCreatePropertyModal();
    // TODO: Optionally refresh the properties list here if needed
    // For example, by refetching or updating state in PropertyManagerPropertiesList
    // This might involve passing a refresh callback down to PropertyManagerPropertiesList
    // or using a global state/context for properties.
    // For now, manual refresh or re-navigation might be needed to see the new property immediately.
  };

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant='h5' color='secondary'>
              Property Manager Panel ({organizationName || (organizationId ? 'Loading Org...' : 'N/A')})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreatePropertyModal}
            >
              Create Property
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
              {/* Create Property Tab removed */}
            </Tabs>
          </Box>
          <TabPanel value={pmTabValue} index={0}> {/* My Properties */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Your Managed Properties</Typography>
            <PropertyManagerPropertiesList
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={(id: string) => handlePropertySelect(id)}
            />
          </TabPanel>
          <TabPanel value={pmTabValue} index={1}> {/* Invite Resident */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Invite New Resident</Typography>
            <PropertySelectorDropdown
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={handlePropertySelect} // Use renamed handler
            />
            {/* Divider sx={{ my: 2 }} removed as per feedback */}
            {selectedPropertyId ? (
              <InviteResidentForm
                organizationId={organizationId || ''}
                propertyId={selectedPropertyId}
                propertyName={selectedPropertyName || undefined} // Pass renamed property name
              />
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>Please select a property from the dropdown above to invite a resident.</Alert>
            )}
          </TabPanel>
          {/* TabPanel for Create Property removed */}
        </Paper>
      )}

      {/* Create Property Modal */}
      <Dialog open={isCreatePropertyModalOpen} onClose={handleCloseCreatePropertyModal} fullWidth maxWidth="sm">
        <DialogTitle>
          Create New Property
          <IconButton
            aria-label="close"
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
        {/* DialogActions can be added here if needed, e.g., for a manual close button if the form doesn't have one */}
      </Dialog>

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
