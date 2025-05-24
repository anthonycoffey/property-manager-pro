import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
// import PropertyManagerManagement from './components/Admin/PropertyManagerManagement'; // No longer directly used here
import AcceptInvitationPage from './pages/AcceptInvitationPage'; // Import the new page
import AdminPropertyManagerPage from './pages/AdminPropertyManagerPage'; // Import the new wrapper page

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
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      {/* Placeholder for unauthorized access */}
      <Route path="/unauthorized" element={<div>You are not authorized to view this page.</div>} />
      {/* Add more public and protected routes as needed */}
      <Route path="/" element={<LoginForm />} /> {/* Default route */}
    </Routes>
  );
};

export default AppRoutes;
