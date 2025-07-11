import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Container,
  Divider,
  Typography,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Outlet, useLocation } from 'react-router-dom';

import PropertySelectorDropdown from '../PropertyManager/PropertySelectorDropdown';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import TestimonialCard from '../Marketing/TestimonialCard';

import { PropertyManagerProvider } from '../../contexts/PropertyManagerContext';
import { UserProfileProvider } from '../../contexts/UserProfileContext';
import { usePropertyManagerContext } from '../../hooks/usePropertyManagerContext';
import { useAuth } from '../../hooks/useAuth';
import { navigationItems } from '../../config/navigationConfig';
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

  // Find the current navigation item based on the path
  const currentNavItem = useMemo(
    () => navigationItems.find((item) => item.path === pathname),
    [pathname]
  );

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

  // AI Assistant gets a full-screen view without the card wrapper
  if (pathname === aiAssistancePath) {
    return <Outlet />;
  }

  return (
    <>
      <Card>
        {currentNavItem && (
          <CardHeader
            avatar={
              <currentNavItem.icon
                color='primary'
                sx={{
                  width: { xs: 28, md: 32 },
                  height: { xs: 28, md: 32 },
                }}
              />
            }
            title={
              <Typography variant='h5' component='div'>
                {currentNavItem.text}
              </Typography>
            }
            sx={{ pb: 0, pt: 3 }}
          />
        )}
        <CardContent>
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

          <Box sx={{ mt: 2 }}>
            {selectedPropertyId ? (
              <Outlet /> // For other routes, render Outlet only if a property is selected
            ) : (
              <Alert severity='info' sx={{ mt: 2 }}>
                Please select a property from the dropdown to see more options.
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Testimonial Section - Added back */}
      {pathname !== aiAssistancePath && ( // Only show if org context is available
        <>
          <Divider sx={{ mt: 8 }} />
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
                alignItems: { xs: 'center' },
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <TestimonialCard
                quote='Robert and his team were amazing!! Our residents really loved the customer service they had during our on site event. Mark was exceptional!'
                author='Amanda Martin'
                authorRole='Property Manager'
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
  const location = useLocation();
  const { organizationId: authOrganizationId } = useAuth();
  const currentOrganizationId =
    props.organizationId || authOrganizationId || null;

  return (
    <PropertyManagerProvider>
      <UserProfileProvider>
        {location.pathname === '/dashboard/property-manager/overview' &&
          currentOrganizationId && <PropertyManagerQuickNav />}

        <PropertyManagerDashboardContent organizationId={currentOrganizationId} />
      </UserProfileProvider>
    </PropertyManagerProvider>
  );
};

export default PropertyManagerDashboardPanel;
