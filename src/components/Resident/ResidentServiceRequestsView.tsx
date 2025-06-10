import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import CreateServiceRequestForm from './CreateServiceRequestForm';
import ServiceRequestList from './ServiceRequestList';

const ResidentServiceRequestsView: React.FC = () => {
  // The onServiceRequestSubmitted callback in CreateServiceRequestForm
  // might need to be connected to a snackbar or other global notification system
  // if immediate feedback beyond the list auto-refreshing is desired.
  // For now, console.log is fine as per original ResidentDashboard.
  const handleServiceRequestSubmitted = () => {
    console.log(
      'Service request submitted, list should auto-refresh via onSnapshot.'
    );
    // Potentially trigger a snackbar here
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Request Service
      </Typography>
      <CreateServiceRequestForm
        onServiceRequestSubmitted={handleServiceRequestSubmitted}
      />
      <Divider sx={{ my: 3 }} />
      <ServiceRequestList />
    </Box>
  );
};

export default ResidentServiceRequestsView;
