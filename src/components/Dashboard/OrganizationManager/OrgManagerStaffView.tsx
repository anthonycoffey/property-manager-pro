import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import OrgScopedPropertyManagerManagement from '../../OrganizationManager/OrgScopedPropertyManagerManagement';
// import { useAuth } from '../../../hooks/useAuth'; // No longer needed directly here
import { useOrgManagerContext } from '../../../contexts/OrgManagerContext';

// interface OrgManagerStaffViewProps {
//   selectedOrgId: string | null; // Will come from context
//   selectedOrgCreatedBy: string | null; // Will come from context (selectedOrganization.createdBy)
// }

const OrgManagerStaffView: React.FC = () => {
  const { selectedOrgId, selectedOrganization } = useOrgManagerContext();

  if (!selectedOrgId || !selectedOrganization) {
    return (
      <Alert severity='info'>
        Please select an organization to manage staff.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Property Manager Staff for {selectedOrganization.name}
      </Typography>
      <OrgScopedPropertyManagerManagement
        organizationId={selectedOrgId}
        organizationCreatedBy={selectedOrganization.createdBy || null}
      />
    </Box>
  );
};

export default OrgManagerStaffView;
