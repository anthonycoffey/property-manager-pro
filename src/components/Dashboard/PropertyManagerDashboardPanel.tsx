import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Outlet, useLocation } from 'react-router-dom'; // useLocation already here, good.

import PropertySelectorDropdown from '../PropertyManager/PropertySelectorDropdown';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import TestimonialCard from '../Marketing/TestimonialCard'; // For testimonial section

import { PropertyManagerProvider } from '../../contexts/PropertyManagerContext';
import { usePropertyManagerContext } from '../../hooks/usePropertyManagerContext'; // Corrected import path
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
  const location = useLocation();
  const { pathname } = location;
  const aiAssistancePath = '/dashboard/property-manager/ai-assistant';

  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0);

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
      <Paper elevation={3} sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
        {pathname !== aiAssistancePath && (
          <>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'flex-end',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
              }}
            >
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
          </>
        )}

        <Box sx={{ mt: 1 }}>
          {pathname === aiAssistancePath ? (
            <Outlet /> // Always render Outlet for AI assistance route
          ) : selectedPropertyId ? (
            <Outlet /> // For other routes, render Outlet only if a property is selected
          ) : (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select a property from the dropdown to see more options.
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Testimonial Section - Added back */}
      {pathname !== aiAssistancePath && ( // Only show if org context is available
        <>
          <Divider sx={{ mt: 6 }} />
          <Box
            sx={{
              my: 6,
              pb: 6,
              backgroundColor: 'background.default',
            }}
          >
            <Typography
              variant='h5'
              gutterBottom
              sx={{ mb: 4, textAlign: 'center' }}
            >
              What Other Property Managers Are Saying
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
              {/* <TestimonialCard
                quote='The best service we have ever had. The team is professional, courteous, and always on time. Highly recommended!'
                author='John Smith'
                authorRole='Property Manager'
              /> */}
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
  const location = useLocation();
  const { organizationId: authOrganizationId } = useAuth();
  const currentOrganizationId =
    props.organizationId || authOrganizationId || null;

  return (
    <PropertyManagerProvider>
      {location.pathname === '/dashboard/property-manager/overview' &&
        currentOrganizationId && <PropertyManagerQuickNav />}

      <PropertyManagerDashboardContent organizationId={currentOrganizationId} />
    </PropertyManagerProvider>
  );
};

export default PropertyManagerDashboardPanel;
