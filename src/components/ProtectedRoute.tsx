import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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
    return <Navigate to='/login' replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = roles.some((role) => allowedRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to='/unauthorized' replace />;
    }
  }

  if (requiredOrgId) {
    if (roles.includes('organization_manager')) {
      if (!organizationIds || !organizationIds.includes(requiredOrgId)) {
        return <Navigate to='/unauthorized' replace />;
      }
    } else {
      if (organizationId !== requiredOrgId) {
        return <Navigate to='/unauthorized' replace />;
      }
    }
  }

  if (requiredPropertyId && propertyId !== requiredPropertyId) {
    return <Navigate to='/unauthorized' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
