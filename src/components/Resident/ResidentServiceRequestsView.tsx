import React from 'react';
import { Typography, Card, CardContent, CardHeader } from '@mui/material';
import CreateServiceRequestForm from './CreateServiceRequestForm';
import { EventAvailable } from '@mui/icons-material';

const ResidentServiceRequestsView: React.FC = () => {
  const handleServiceRequestSubmitted = () => {
    console.log(
      'Service request submitted, list should auto-refresh via onSnapshot.'
    );
  };

  return (
    <Card>
        <CardHeader
          avatar={<EventAvailable color='primary' />}
          title={
            <Typography variant='h5' component='div'>
          Request Service
            </Typography>
          }
          sx={{ mb: 2 }}
        />
      <CardContent>
        <CreateServiceRequestForm
          onServiceRequestSubmitted={handleServiceRequestSubmitted}
        />
      </CardContent>
    </Card>
  );
};

export default ResidentServiceRequestsView;
