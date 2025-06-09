import React from 'react';
import { Divider, Paper } from '@mui/material';
import InviteOrganizationManagerForm from '../../Admin/InviteOrganizationManagerForm';
import OrganizationManagerAssignments from '../../Admin/OrganizationManagerAssignments';

const AdminOrgManagersView: React.FC = () => {
  return (
    <Paper sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <InviteOrganizationManagerForm />
      <Divider sx={{ mb: 4, mt: 2 }} />
      <OrganizationManagerAssignments />
    </Paper>
  );
};

export default AdminOrgManagersView;
