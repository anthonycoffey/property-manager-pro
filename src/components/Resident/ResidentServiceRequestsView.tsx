import React from 'react';
import { Typography, Card, CardContent } from '@mui/material';
import CreateServiceRequestForm from './CreateServiceRequestForm';

const ResidentServiceRequestsView: React.FC = () => {
  const handleServiceRequestSubmitted = () => {
    console.log(
      'Service request submitted, list should auto-refresh via onSnapshot.'
    );
  };

  return (
    <Card>
      <CardContent>
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Request Service
        </Typography>
        <CreateServiceRequestForm
          onServiceRequestSubmitted={handleServiceRequestSubmitted}
        />
      </CardContent>
    </Card>
  );
};

export default ResidentServiceRequestsView;
