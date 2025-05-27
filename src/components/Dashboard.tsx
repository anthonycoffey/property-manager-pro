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
import { Cached } from '@mui/icons-material';

const handleReload = () => {
  window.location.reload();
};

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
          <Container component='main' maxWidth='sm'>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Card sx={{ maxWidth: 600, pb: 2 }}>
                <CardHeader title='Account Setup in Progress' />
                <CardContent>
                  <Typography
                    variant='body1'
                    sx={{  textAlign: 'center' }}
                  >
                    We're just finishing setting up your account. Please click
                    the button below to refresh the page. If you continue to see
                    this message, please contact support for assistance.
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center' }}>
                  <Button
                    variant='contained'
                    onClick={handleReload}
                    startIcon={<Cached />}
                  >
                    Refresh Page
                  </Button>
                </CardActions>
              </Card>
            </Box>
          </Container>
        )}
    </Box>
  );
};

export default Dashboard;
