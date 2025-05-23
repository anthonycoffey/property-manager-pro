import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Import useAuth from the new hooks directory

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; // Optional: array of roles allowed to access this route
  requiredOrgId?: string; // Optional: specific organization ID required
  requiredPropertyId?: string; // Optional: specific property ID required
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredOrgId,
  requiredPropertyId,
}) => {
  const { currentUser, loading, roles, organizationId, propertyId } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check for roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = roles.some((role) => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />; // Redirect if no allowed role
    }
  }

  // Check for organization ID
  if (requiredOrgId && organizationId !== requiredOrgId) {
    return <Navigate to="/unauthorized" replace />; // Redirect if organization ID doesn't match
  }

  // Check for property ID
  if (requiredPropertyId && propertyId !== requiredPropertyId) {
    return <Navigate to="/unauthorized" replace />; // Redirect if property ID doesn't match
  }

  return <>{children}</>;
};

export default ProtectedRoute;
