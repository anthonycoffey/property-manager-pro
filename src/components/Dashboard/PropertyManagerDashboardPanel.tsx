import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type { Property as PropertyType } from '../../types';

import PropertyManagerPropertiesList from '../PropertyManager/PropertyManagerPropertiesList';
import InviteResidentForm from '../PropertyManager/InviteResidentForm';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import PropertySelectorDropdown from '../PropertyManager/PropertySelectorDropdown';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';

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

interface PropertyManagerDashboardPanelProps {
  organizationId: string | null;
}

const PropertyManagerDashboardPanel: React.FC<PropertyManagerDashboardPanelProps> = ({ organizationId }) => {
  const [pmTabValue, setPmTabValue] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState<string | null>(null);
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(null);
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0);

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
      } else {
        setOrganizationName('Organization');
      }
    };
    fetchOrgName();
  }, [organizationId]);

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
          {organizationName || 'Property Manager Dashboard'}
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
          <Tab label='Properties' {...a11yProps(0)} />
          <Tab label='Residents' {...a11yProps(1)} />
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

      {propertyToEdit && (
        <EditPropertyModal
          open={isEditPropertyModalOpen}
          onClose={handleCloseEditPropertyModal}
          propertyData={propertyToEdit}
          onSuccess={handlePropertyUpdated}
        />
      )}
    </Paper>
  );
};

export default PropertyManagerDashboardPanel;
