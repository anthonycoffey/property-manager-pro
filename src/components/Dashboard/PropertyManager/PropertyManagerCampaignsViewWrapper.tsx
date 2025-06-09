import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import PropertyCampaignsView from '../../PropertyManager/Campaigns/PropertyCampaignsView';
import { usePropertyManagerContext } from '../../../contexts/PropertyManagerContext';
import { useAuth } from '../../../hooks/useAuth';

const PropertyManagerCampaignsViewWrapper: React.FC = () => {
  const { selectedPropertyId, selectedPropertyName } =
    usePropertyManagerContext();
  const { organizationId } = useAuth();

  if (!organizationId) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Organization context is missing.
      </Alert>
    );
  }
  if (!selectedPropertyId) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Please select a property to manage campaigns.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Manage Invitation Campaigns for{' '}
        {selectedPropertyName || 'Selected Property'}
      </Typography>
      <PropertyCampaignsView
        organizationId={organizationId}
        propertyId={selectedPropertyId}
      />
    </Box>
  );
};

export default PropertyManagerCampaignsViewWrapper;
