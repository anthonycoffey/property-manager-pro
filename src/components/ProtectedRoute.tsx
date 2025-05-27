import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Import useAuth from the new hooks directory
import { CircularProgress, Container, Box } from '@mui/material';

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
  const { currentUser, loading, roles, organizationId, organizationIds, propertyId } = useAuth();

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh" // Ensure it takes full viewport height to center vertically
        >
          <CircularProgress />
        </Box>
      </Container>
    ); 
  }

  if (!currentUser) {
    // console.log('ProtectedRoute: currentUser is null, redirecting to /login. Current loading state:', loading); // Debug log removed
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
  if (requiredOrgId) {
    if (roles.includes('organization_manager')) {
      // For organization_manager, check if requiredOrgId is in their organizationIds array
      if (!organizationIds || !organizationIds.includes(requiredOrgId)) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else {
      // For other roles (like property_manager), use the single organizationId claim
      if (organizationId !== requiredOrgId) {
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  // Check for property ID
  if (requiredPropertyId && propertyId !== requiredPropertyId) {
    return <Navigate to="/unauthorized" replace />; // Redirect if property ID doesn't match
  }

  return <>{children}</>;
};

export default ProtectedRoute;
