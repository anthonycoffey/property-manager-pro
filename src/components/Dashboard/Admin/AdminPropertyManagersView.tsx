import React, { useState } from 'react';
import { Typography, Divider, Box, Paper, Alert } from '@mui/material';
import OrganizationSelector from '../../Admin/OrganizationSelector';
import PropertyManagerManagement from '../../Admin/PropertyManagerManagement';

const AdminPropertyManagersView: React.FC = () => {
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(
    null
  );

  const handleAdminOrgChange = (orgId: string | null) => {
    setSelectedAdminOrgId(orgId);
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <OrganizationSelector
        selectedOrganizationId={selectedAdminOrgId}
        onOrganizationChange={handleAdminOrgChange}
      />
      {selectedAdminOrgId ? (
        <PropertyManagerManagement organizationId={selectedAdminOrgId} />
      ) : (
        <Alert severity='info' sx={{ mt: 2 }}>
          Select an organization to view and manage its property managers.
        </Alert>
      )}
    </Paper>
  );
};

export default AdminPropertyManagersView;
