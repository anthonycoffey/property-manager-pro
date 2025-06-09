import React from 'react';
import { Box, Typography, Container, Paper, Stack } from '@mui/material';
import { AdminPanelSettings } from '@mui/icons-material';

// Note: The original content of this panel has been moved to separate routed views:
// - AdminOverviewView.tsx
// - OrganizationManagementPanel.tsx (directly used)
// - AdminOrgManagersView.tsx
// - AdminPropertyManagersView.tsx
// - AdminPropertiesAndResidentsView.tsx
// - AdminCampaignsView.tsx (directly used)
// - ChatView.tsx (directly used for AI Assistant)
// This component is now a placeholder and will likely be removed or refactored further.

const AdminDashboardPanel: React.FC = () => {
  return (
    <Container component="main" maxWidth="xl">
      <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AdminPanelSettings fontSize="large" color="primary" />
            <Typography variant="h4" color="primary">
              Admin Area
            </Typography>
          </Stack>
        </Box>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Admin functionalities are now accessible via the navigation drawer.
        </Typography>
        {/* 
          The Tab and TabPanel structure has been removed. 
          Navigation is handled by src/routes.tsx and src/components/Layout/AppBarComponent.tsx.
          The content for each former tab is now a separate component rendered by a route.
          For example:
          - Dashboard content is in AdminOverviewView.tsx
          - Organizations content is in OrganizationManagementPanel.tsx
          - etc.
        */}
      </Paper>
    </Container>
  );
};

export default AdminDashboardPanel;
