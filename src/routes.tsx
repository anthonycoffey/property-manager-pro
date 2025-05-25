import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AcceptInvitationPage from './pages/AcceptInvitationPage';

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
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      {/* Placeholder for unauthorized access */}
      <Route path="/unauthorized" element={<div>You are not authorized to view this page.</div>} />
      {/* Add more public and protected routes as needed */}
      <Route path="/" element={<LoginForm />} /> {/* Default route */}
    </Routes>
  );
};

export default AppRoutes;
