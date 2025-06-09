import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Container,
  Stack,
  Divider,
  Card,
  CardActionArea,
  CardContent, // Added for testimonial section
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import { Outlet } from 'react-router-dom';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import PropertySelectorDropdown from '../PropertyManager/PropertySelectorDropdown';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import TestimonialCard from '../Marketing/TestimonialCard'; // For testimonial section

import {
  PropertyManagerProvider,
  usePropertyManagerContext,
} from '../../contexts/PropertyManagerContext';
import { useAuth } from '../../hooks/useAuth';
import PropertyManagerQuickNav from './PropertyManager/PropertyManagerQuickNav';

interface PropertyManagerDashboardPanelProps {
  organizationId: string | null;
}

const PropertyManagerDashboardContent: React.FC<
  PropertyManagerDashboardPanelProps
> = ({ organizationId }) => {
  const { selectedPropertyId, setSelectedPropertyId, setSelectedPropertyName } =
    usePropertyManagerContext();

  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0);

  useEffect(() => {
    const fetchOrgName = async () => {
      if (organizationId) {
        try {
          const orgDocRef = doc(db, 'organizations', organizationId);
          const orgDocSnap = await getDoc(orgDocRef);
          setOrganizationName(
            orgDocSnap.exists() ? orgDocSnap.data()?.name || 'N/A' : 'N/A'
          );
        } catch (error) {
          console.error('Error fetching organization name:', error);
          setOrganizationName('Error');
        }
      } else {
        setOrganizationName('Your Organization');
      }
    };
    fetchOrgName();
  }, [organizationId]);

  const handlePropertySelect = useCallback(
    (propertyId: string | null, propertyName?: string | null) => {
      setSelectedPropertyId(propertyId);
      setSelectedPropertyName(propertyName ?? null);
    },
    [setSelectedPropertyId, setSelectedPropertyName]
  );

  const handleOpenCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(true);
  const handleCloseCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(false);

  const handlePropertyCreated = () => {
    handleCloseCreatePropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1);
  };

  if (!organizationId) {
    return (
      <Container component='main' maxWidth='xl'>
        <Alert severity='error' sx={{ mt: 2 }}>
          Organization ID is missing. Cannot display Property Manager dashboard.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1}>
            <DomainAddIcon fontSize='large' color='primary' />
            <Typography variant='h4' color='primary'>
              {organizationName || 'Property Management'}
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenCreatePropertyModal}
            sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 2, sm: 0 } }}
          >
            Add Property
          </Button>
        </Box>

        <PropertySelectorDropdown
          organizationId={organizationId}
          selectedPropertyId={selectedPropertyId}
          onPropertyChange={handlePropertySelect}
          key={`prop-selector-${refreshPropertiesKey}`}
          label='Select Property to Manage'
        />

        <Box sx={{ mt: 2 }}>
          {selectedPropertyId ? (
            <Outlet />
          ) : (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select a property from the dropdown to see more options.
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Testimonial Section - Added back */}
      {organizationId && ( // Only show if org context is available
        <>
          <Divider sx={{ my: 6, borderColor: 'secondary.main' }} />
          <Box
            sx={{
              mt: 4,
              p: { xs: 1, sm: 2, lg: 3 },
              backgroundColor: 'background.default',
            }}
          >
            <Typography
              variant='h5'
              gutterBottom
              sx={{ mb: 2, textAlign: 'center' }}
            >
              Valued Feedback
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-start' },
                gap: { xs: 2, md: 4 },
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <TestimonialCard
                quote='Robert and his team were amazing!! Our residents really loved the customer service they had during our on site event. Mark was exceptional!'
                author='Amanda Martin'
                authorRole='Property Manager'
              />
              {/* Add more TestimonialCards if needed, or make them dynamic */}
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 4, md: 10 },
                justifyContent: 'center',
                alignItems: 'center',
                mt: 3,
              }}
            >
              <Box
                component='img'
                src='/review1.png'
                alt='5.0 rating'
                sx={{ width: { xs: 100, sm: 140 }, height: 'auto' }}
              />
              <Box
                component='img'
                src='/review2.png'
                alt='Experience badge'
                sx={{ width: { xs: 100, sm: 140 }, height: 'auto' }}
              />
              <Box
                component='img'
                src='/review3.png'
                alt='Satisfaction badge'
                sx={{ width: { xs: 100, sm: 140 }, height: 'auto' }}
              />
            </Box>
          </Box>
        </>
      )}

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
          <CreatePropertyForm
            onSuccess={handlePropertyCreated}
            organizationId={organizationId}
            onCancel={handleCloseCreatePropertyModal}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

const PropertyManagerDashboardPanel: React.FC<
  PropertyManagerDashboardPanelProps
> = (props) => {
  const { organizationId: authOrganizationId } = useAuth();
  // Use prop if provided, otherwise fallback to auth's organizationId
  const currentOrganizationId =
    props.organizationId || authOrganizationId || null;

  return (
    <PropertyManagerProvider>
      <PropertyManagerQuickNav />
      {/* <Divider sx={{ my: 4 }} /> */}
      <PropertyManagerDashboardContent organizationId={currentOrganizationId} />
    </PropertyManagerProvider>
  );
};

export default PropertyManagerDashboardPanel;
