import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  CardActions,
  CardHeader,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

import AdminDashboardPanel from './Dashboard/AdminDashboardPanel';
import PropertyManagerDashboardPanel from './Dashboard/PropertyManagerDashboardPanel';
import OrganizationManagerDashboardPanel from './Dashboard/OrganizationManagerDashboardPanel';
import ResidentDashboard from './Resident/ResidentDashboard';
import GuestDashboardPanel from './Dashboard/GuestDashboardPanel'; // Import the new component
import { Cached } from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const { roles, organizationId, organizationIds } = useAuth();

  return (
    <Box>
      {roles.includes('admin') && <AdminDashboardPanel />}

      {roles.includes('organization_manager') && (
        <OrganizationManagerDashboardPanel orgIds={organizationIds} />
      )}

      {roles.includes('property_manager') && !roles.includes('organization_manager') && ( // Ensure OM doesn't also see PM panel if they have both roles for some reason
        <PropertyManagerDashboardPanel
          organizationId={organizationId ?? null}
        />
      )}

      {roles.includes('resident') && <ResidentDashboard />}

      {!roles.includes('admin') &&
        !roles.includes('organization_manager') &&
        !roles.includes('property_manager') &&
        !roles.includes('resident') && (
          <GuestDashboardPanel />
        )}
    </Box>
  );
};

export default Dashboard;
