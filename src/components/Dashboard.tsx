import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboardPanel from './Dashboard/AdminDashboardPanel';
import PropertyManagerDashboardPanel from './Dashboard/PropertyManagerDashboardPanel';
import OrganizationManagerDashboardPanel from './Dashboard/OrganizationManagerDashboardPanel';
import ResidentDashboard from './Resident/ResidentDashboard';
import GuestDashboardPanel from './Dashboard/GuestDashboardPanel'; // Import the new component

const Dashboard: React.FC = () => {
  const { roles, organizationId, organizationIds } = useAuth();

  return (
    <>
      {roles.includes('admin') && <AdminDashboardPanel />}

      {roles.includes('organization_manager') && (
        <OrganizationManagerDashboardPanel orgIds={organizationIds} />
      )}

      {roles.includes('property_manager') && (
        <PropertyManagerDashboardPanel
          organizationId={organizationId ?? null}
        />
      )}

      {roles.includes('resident') && <ResidentDashboard />}

      {!roles.includes('admin') &&
        !roles.includes('organization_manager') &&
        !roles.includes('property_manager') &&
        !roles.includes('resident') && <GuestDashboardPanel />}
    </>
  );
};

export default Dashboard;
