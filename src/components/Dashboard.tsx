import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { navigationItems } from '../config/navigationConfig'; 
import type { UserRole } from '../config/navigationConfig';
import BreadcrumbsComponent from './Layout/BreadcrumbsComponent'; // Import Breadcrumbs

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

  // If roles are still loading or user has no roles (after ProtectedRoute check)
  // This might indicate an issue or a user state not yet fully resolved.
  // ProtectedRoute should ideally handle unauthenticated users.
  // If an authenticated user has no roles, this is a specific state to consider.
  if (userRoles.length === 0 && currentUser) { 
    // Authenticated but no roles assigned - this is an edge case.
    // The index route in AppRoutes will show "Select an option from the menu."
    // which might be acceptable, or a specific message/page could be shown.
    // For now, allowing Outlet to render the index route's "Select an option..."
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
