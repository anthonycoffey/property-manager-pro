import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import CreateCampaignModal from './CreateCampaignModal';
import CampaignsTable from './CampaignsTable';
// import PropertySelectorDropdown from '../PropertySelectorDropdown'; // If needed for selection within this view

interface PropertyCampaignsViewProps {
  organizationId: string | null; // Passed from parent dashboard
  // If this view itself handles property selection:
  // properties: Array<{ id: string; name: string; address?: { street: string } }>;
  // selectedPropertyId?: string;
  // onPropertySelected?: (propertyId: string) => void;

  // If property is always passed in (simpler for first integration):
  propertyId: string | null;
}

const PropertyCampaignsView: React.FC<PropertyCampaignsViewProps> = ({
  organizationId,
  propertyId,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateModal = () => {
    if (propertyId && organizationId) {
      setIsCreateModalOpen(true);
    } else {
      // Handle error or prompt for property/org selection if not available
      console.error(
        'Organization or Property ID is missing, cannot open create campaign modal.'
      );
      // Optionally, set an error message to display to the user
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Optionally, refresh campaigns list if a new one was created
  };

  // If propertyId is not yet selected, show a message or a selector
  // For now, assuming propertyId is provided.
  if (!propertyId || !organizationId) {
    return (
      <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
        <Typography variant='body1'>
          Please select an organization and property to manage campaigns.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant='h6'>Campaigns</Typography>
        <Button
          variant='contained'
          color='primary'
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleOpenCreateModal}
          disabled={!propertyId || !organizationId}
        >
          Create New Campaign
        </Button>
      </Box>

      <CampaignsTable organizationId={organizationId} propertyId={propertyId} />

      <CreateCampaignModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        organizationId={organizationId}
        propertyId={propertyId}
        // onCampaignCreated={() => { /* Potentially refresh list or show notification */ }}
      />
    </Box>
  );
};

export default PropertyCampaignsView;
