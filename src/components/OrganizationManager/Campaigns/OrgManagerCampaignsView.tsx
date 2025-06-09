import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { useOrgManagerContext } from '../../../hooks/useOrgManagerContext';
import PropertySelectorDropdown from '../../PropertyManager/PropertySelectorDropdown';
import PropertyCampaignsView from '../../PropertyManager/Campaigns/PropertyCampaignsView';

const OrgManagerCampaignsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedOrgId, selectedOrganization } = useOrgManagerContext();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );

  // Reset selectedPropertyId when selectedOrgId (from context) changes
  useEffect(() => {
    setSelectedPropertyId(null);
  }, [selectedOrgId]);

  const handlePropertyChange = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
  };

  if (
    !currentUser ||
    !currentUser.customClaims?.roles?.includes('organization_manager')
  ) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Access Denied. You are not an Organization Manager.
      </Alert>
    );
  }

  if (!selectedOrgId || !selectedOrganization) {
    // This message is now primarily handled by the parent OrganizationManagerDashboardPanel
    // but can serve as a fallback if this component is rendered without a selected org.
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Please select an organization from the dropdown above to manage
        campaigns.
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom>
        Campaigns for {selectedOrganization.name}
      </Typography>

      <Box sx={{ mb: 2, mt: 2 }}>
        <PropertySelectorDropdown
          organizationId={selectedOrgId} // selectedOrgId is guaranteed to be non-null here
          selectedPropertyId={selectedPropertyId}
          onPropertyChange={handlePropertyChange}
          label='Select Property for Campaigns'
        />
      </Box>

      {selectedPropertyId ? (
        <PropertyCampaignsView
          organizationId={selectedOrgId} // selectedOrgId is guaranteed to be non-null
          propertyId={selectedPropertyId}
        />
      ) : (
        <Typography sx={{ mt: 2 }}>
          Please select a property to view and manage its campaigns.
        </Typography>
      )}
    </Paper>
  );
};

export default OrgManagerCampaignsView;
