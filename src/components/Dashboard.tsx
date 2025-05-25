import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

import AdminDashboardPanel from './Dashboard/AdminDashboardPanel';
import PropertyManagerDashboardPanel from './Dashboard/PropertyManagerDashboardPanel';
import ResidentDashboard from './Resident/ResidentDashboard';

const Dashboard: React.FC = () => {
  const { currentUser, roles, organizationId } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      {currentUser && (
        <Typography variant='body1' sx={{ mb: 2 }}>
          Logged in as: {currentUser.email}
        </Typography>
      )}

      {roles.includes('admin') && <AdminDashboardPanel />}

      {roles.includes('property_manager') && (
        <PropertyManagerDashboardPanel organizationId={organizationId ?? null} />
      )}

      {roles.includes('resident') && <ResidentDashboard />}

      {!roles.includes('admin') &&
        !roles.includes('property_manager') &&
        !roles.includes('resident') && (
          <Typography
            variant='body1'
            sx={{ mt: 2 }}
            dangerouslySetInnerHTML={{
              __html:
                "Welcome! We're just finishing setting up your account. Your personalized dashboard will be ready shortly. If it doesn't appear automatically, please <a href=\"javascript:window.location.reload(true)\" style=\"color: inherit; text-decoration: underline;\">refresh this page</a>.",
            }}
          />
        )}
    </Box>
  );
};

export default Dashboard;
