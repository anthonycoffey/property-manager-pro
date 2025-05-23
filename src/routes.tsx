import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard'; // Placeholder
import ProtectedRoute from './components/ProtectedRoute'; // To be created
// import { AuthProvider } from './context/AuthContext'; // Will be used in main.tsx or App.tsx

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
      {/* Add more public and protected routes as needed */}
      <Route path="/" element={<LoginForm />} /> {/* Default route */}
    </Routes>
  );
};

export default AppRoutes;
