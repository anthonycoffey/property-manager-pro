import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';
import { Container, Typography, CircularProgress, Alert, Paper, Box, Tabs, Tab, Button } from '@mui/material'; // Added Button
import InviteResidentForm from '../components/PropertyManager/InviteResidentForm'; // Assuming this path

interface PropertyDetails {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  // Add other relevant property fields
}

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
      id={`property-management-tabpanel-${index}`}
      aria-labelledby={`property-management-tab-${index}`}
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
    id: `property-management-tab-${index}`,
    'aria-controls': `property-management-tabpanel-${index}`,
  };
}

const PropertyManagementPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { currentUser, organizationId } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!currentUser || !organizationId || !propertyId) {
        setError('User, organization, or property ID not found.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const propertyRef = doc(db, `organizations/${organizationId}/properties/${propertyId}`);
        const docSnap = await getDoc(propertyRef);

        if (docSnap.exists()) {
          setProperty({ id: docSnap.id, ...docSnap.data() } as PropertyDetails);
        } else {
          setError('Property not found.');
        }
      } catch (err) {
        console.error("Error fetching property details:", err);
        setError('Failed to fetch property details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [currentUser, organizationId, propertyId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => navigate('/pm/properties')}>
            Back to Properties
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!property) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">Property data is not available.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {property.name}
        </Typography>
        <Typography variant="subtitle1">
          {`${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zip}`}
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="property management tabs">
          <Tab label="Invite Residents" {...a11yProps(0)} />
          <Tab label="Manage Residents" {...a11yProps(1)} disabled /> {/* Placeholder */}
          <Tab label="Service Requests" {...a11yProps(2)} disabled /> {/* Placeholder */}
        </Tabs>
      </Box>
      <TabPanel value={currentTab} index={0}>
        {organizationId && propertyId && (
          <InviteResidentForm organizationId={organizationId} propertyId={propertyId} />
        )}
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <Typography>Resident management features will be here.</Typography>
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <Typography>Service request management features will be here.</Typography>
      </TabPanel>
    </Container>
  );
};

export default PropertyManagementPage;
