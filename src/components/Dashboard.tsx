import React from 'react';
import { Box, Typography } from '@mui/material';
import LogoutButton from './LogoutButton'; // Assuming LogoutButton.tsx is in the same directory
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to the Dashboard!
      </Typography>
      {currentUser && (
        <Typography variant="body1">
          Logged in as: {currentUser.email}
        </Typography>
      )}
      <Box sx={{ mt: 3 }}>
        <LogoutButton />
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        This is a protected route. You should only see this if you are logged in.
      </Typography>
    </Box>
  );
};

export default Dashboard;
