import React, { useState } from 'react';
import OrganizationSelector from '../components/Admin/OrganizationSelector';
import PropertyManagerManagement from '../components/Admin/PropertyManagerManagement';
import { Box, Typography, Paper, Divider } from '@mui/material';

const AdminPropertyManagerPage: React.FC = () => {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  return (
    <Box sx={{ p: 3 }}> {/* Added a surrounding Box for padding consistent with Dashboard */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Manage Property Managers (Standalone Page)
        </Typography>
        <OrganizationSelector
          selectedOrganizationId={selectedOrgId}
          onOrganizationChange={setSelectedOrgId}
        />
        <Divider sx={{ my: 2 }} />
        <PropertyManagerManagement organizationId={selectedOrgId} />
      </Paper>
    </Box>
  );
};

export default AdminPropertyManagerPage;
