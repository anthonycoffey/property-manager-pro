import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Container, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requiredOrgId?: string;
  requiredPropertyId?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredOrgId,
  requiredPropertyId,
}) => {
  const location = useLocation(); // Get current location
  const {
    currentUser,
    loading,
    roles,
    organizationId,
    organizationIds,
    propertyId,
  } = useAuth();

  if (loading) {
    return (
      <Container maxWidth='sm'>
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='50vh'
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!currentUser && (!organizationId || !organizationIds)) {
    return <Navigate to='/login' replace state={{ from: location, ...location.state }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = roles.some((role) => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to='/unauthorized' replace state={{ from: location, ...location.state }} />;
    }
  }

  if (requiredOrgId) {
    if (roles.includes('organization_manager')) {
      if (!organizationIds || !organizationIds.includes(requiredOrgId)) {
        return <Navigate to='/unauthorized' replace state={{ from: location, ...location.state }} />;
      }
    } else {
      if (organizationId !== requiredOrgId) {
        return <Navigate to='/unauthorized' replace state={{ from: location, ...location.state }} />;
      }
    }
  }

  if (requiredPropertyId && propertyId !== requiredPropertyId) {
    return <Navigate to='/unauthorized' replace state={{ from: location, ...location.state }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
