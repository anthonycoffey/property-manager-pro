import React from 'react';
import { Box, Alert } from '@mui/material';
import PropertyCampaignsView from '../../PropertyManager/Campaigns/PropertyCampaignsView';
import { usePropertyManagerContext } from '../../../hooks/usePropertyManagerContext';
import { useAuth } from '../../../hooks/useAuth';

const PropertyManagerCampaignsViewWrapper: React.FC = () => {
  const { selectedPropertyId } = usePropertyManagerContext();
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
    <Box>
      <PropertyCampaignsView
        organizationId={organizationId}
        propertyId={selectedPropertyId}
      />
    </Box>
  );
};

export default PropertyManagerCampaignsViewWrapper;
