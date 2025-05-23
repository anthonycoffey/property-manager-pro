import React from 'react';
import { Box, Typography } from '@mui/material';
import LogoutButton from './LogoutButton'; // Assuming LogoutButton.tsx is in the same directory
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { currentUser, roles, organizationId, propertyId } = useAuth();

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

      {roles.includes('admin') && (
        <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
          You are an Administrator. You have full access.
        </Typography>
      )}

      {roles.includes('property_manager') && (
        <Typography variant="h6" color="secondary" sx={{ mt: 2 }}>
          You are a Property Manager for Organization ID: {organizationId || 'N/A'}.
        </Typography>
      )}

      {roles.includes('resident') && (
        <Typography variant="h6" color="info" sx={{ mt: 2 }}>
          You are a Resident. Your Organization ID: {organizationId || 'N/A'}, Property ID: {propertyId || 'N/A'}.
        </Typography>
      )}

      <Box sx={{ mt: 3 }}>
        <LogoutButton />
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        This is a protected route. Your access is determined by your roles and assigned IDs.
      </Typography>
    </Box>
  );
};

export default Dashboard;
