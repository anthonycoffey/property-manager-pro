import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { navigationItems } from '../config/navigationConfig';
import type { UserRole } from '../config/navigationConfig';
import BreadcrumbsComponent from './Layout/BreadcrumbsComponent'; // Import Breadcrumbs
import GuestDashboardPanel from './Dashboard/GuestDashboardPanel'; // Import GuestDashboardPanel

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth(); // Get currentUser to access customClaims.roles
  const location = useLocation();

  // Use customClaims.roles for checking roles
  const userRoles: UserRole[] = currentUser?.customClaims?.roles
    ? (currentUser.customClaims.roles as UserRole[])
    : [];

  // If user lands on /dashboard directly, redirect to their first available navigation item's path
  if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
    if (userRoles.length > 0) {
      const firstValidNavItem = navigationItems.find(item =>
        item.roles.some(role => userRoles.includes(role))
      );
      if (firstValidNavItem) {
        return <Navigate to={firstValidNavItem.path} replace />;
      }
    }
    // If no roles or no valid path found (should not happen for logged-in users with roles),
    // or if it's a guest somehow landing here (ProtectedRoute should prevent this),
    // show a loading/error or redirect to login.
    // The index route in AppRoutes.tsx shows "Select an option..." which is fine if no redirect happens.
  }

  // If an authenticated user has no roles, render the GuestDashboardPanel.
  if (userRoles.length === 0 && currentUser) {
    return <GuestDashboardPanel />;
  }
  
  // The Outlet will render the matched child route (e.g., AdminOverviewView, etc.)
  // or the index route if path is exactly /dashboard and no redirect occurred.
  return (
    <>
      <BreadcrumbsComponent />
      <Outlet />
    </>
  );
};

export default Dashboard;
