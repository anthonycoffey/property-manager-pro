import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AdminPropertyManagerPage from './pages/AdminPropertyManagerPage';
import PropertyListPage from './pages/PropertyListPage'; // Added import
import PropertyManagementPage from './pages/PropertyManagementPage'; // Added import

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/property-managers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPropertyManagerPage />
          </ProtectedRoute>
        }
      />
      {/* Property Manager Routes */}
      <Route
        path="/pm/properties"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pm/property/:propertyId"
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            <PropertyManagementPage />
          </ProtectedRoute>
        }
      />
       <Route
        path="/pm/create-property" // Route for CreatePropertyForm
        element={
          <ProtectedRoute allowedRoles={['property_manager']}>
            {/* Assuming CreatePropertyForm is rendered within a generic page or Dashboard context */}
            {/* For now, let's point to Dashboard, assuming it handles this or a new page is made */}
            <Dashboard /> 
          </ProtectedRoute>
        }
      />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      {/* Placeholder for unauthorized access */}
      <Route path="/unauthorized" element={<div>You are not authorized to view this page.</div>} />
      {/* Add more public and protected routes as needed */}
      <Route path="/" element={<LoginForm />} /> {/* Default route */}
    </Routes>
  );
};

export default AppRoutes;
