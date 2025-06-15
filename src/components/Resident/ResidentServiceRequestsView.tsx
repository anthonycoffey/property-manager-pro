import React from 'react';
import { Box, Typography } from '@mui/material';
import CreateServiceRequestForm from './CreateServiceRequestForm';

const ResidentServiceRequestsView: React.FC = () => {
  const handleServiceRequestSubmitted = () => {
    console.log(
      'Service request submitted, list should auto-refresh via onSnapshot.'
    );
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Request Service
      </Typography>
      <CreateServiceRequestForm
        onServiceRequestSubmitted={handleServiceRequestSubmitted}
      />
    </Box>
  );
};

export default ResidentServiceRequestsView;
