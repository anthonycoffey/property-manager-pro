import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore'; // Type-only import
import { db } from '../../../firebaseConfig';
import OrganizationSelector from '../OrganizationSelector'; // Standard Admin Org Selector
import PropertySelectorDropdown from '../../PropertyManager/PropertySelectorDropdown';
import PropertyCampaignsView from '../../PropertyManager/Campaigns/PropertyCampaignsView';

interface Organization {
  id: string;
  name: string;
}

const AdminCampaignsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  // const [selectedPropertyName, setSelectedPropertyName] = useState<string | null>(null); // Not strictly needed for display here
  // OrganizationSelector fetches its own data

  const handleOrganizationChange = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    setSelectedPropertyId(null); // Reset property when org changes
    // setSelectedPropertyName(null);
  };

  const handlePropertyChange = (propertyId: string | null, /* propertyName?: string */) => {
    setSelectedPropertyId(propertyId);
    // setSelectedPropertyName(propertyName || null);
  };

  if (!currentUser || !currentUser.customClaims?.roles?.includes('admin')) {
    return <Typography color="error">Access Denied. You are not an Administrator.</Typography>;
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        Global Campaign Management
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Select Organization:</Typography>
        {/* OrganizationSelector will show its own loading/error state */}
        <OrganizationSelector
          selectedOrganizationId={selectedOrganizationId}
          onOrganizationChange={handleOrganizationChange}
          // label="All Organizations" // Label is internal to OrganizationSelector
        />
      </Box>

      {selectedOrganizationId && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Select Property:</Typography>
          <PropertySelectorDropdown
            organizationId={selectedOrganizationId}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={handlePropertyChange}
            label="Properties"
          />
        </Box>
      )}

      {selectedOrganizationId && selectedPropertyId && (
        <PropertyCampaignsView
          organizationId={selectedOrganizationId}
          propertyId={selectedPropertyId}
        />
      )}
      {selectedOrganizationId && !selectedPropertyId && (
        <Typography sx={{mt: 2}}>Please select a property to view campaigns.</Typography>
      )}
       {!selectedOrganizationId && (
        <Typography sx={{mt: 2}}>Please select an organization to manage campaigns.</Typography>
      )}
    </Paper>
  );
};

export default AdminCampaignsView;
