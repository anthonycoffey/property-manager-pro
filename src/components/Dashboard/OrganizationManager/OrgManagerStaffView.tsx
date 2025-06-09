import React from 'react';
import {  Alert, Paper } from '@mui/material';
import OrgScopedPropertyManagerManagement from '../../OrganizationManager/OrgScopedPropertyManagerManagement';
import { useOrgManagerContext } from '../../../hooks/useOrgManagerContext';

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
    <Paper sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <OrgScopedPropertyManagerManagement
        organizationId={selectedOrgId}
        organizationCreatedBy={selectedOrganization.createdBy || null}
      />
    </Paper>
  );
};

export default OrgManagerStaffView;
