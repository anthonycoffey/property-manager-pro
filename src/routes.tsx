import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AcceptOrgManagerInvitationPage from './pages/AcceptOrgManagerInvitationPage';
import DemoPage from './pages/DemoPage'; // Added import for DemoPage
import LostPasswordPage from './pages/LostPasswordPage'; // Added import for LostPasswordPage
import CampaignDetailsPage from './pages/CampaignDetailsPage'; 
import JoinCampaignPage from './pages/JoinCampaignPage'; // Added import for JoinCampaignPage
import PublicCampaignHandlerPage from './pages/PublicCampaignHandlerPage'; // Added for new flow

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
        path="/campaigns/:campaignId"
        element={
          <ProtectedRoute>
            <CampaignDetailsPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/join-public-campaign" element={<PublicCampaignHandlerPage />} /> {/* New route for public campaign link handling */}
      <Route path="/join-campaign" element={<JoinCampaignPage />} /> {/* Added route for joining a campaign */}
      <Route path="/accept-org-manager-invitation" element={<AcceptOrgManagerInvitationPage />} />
      <Route path="/lost-password" element={<LostPasswordPage />} />
      <Route path="/demo" element={<DemoPage />} /> {/* Added public demo route */}
      {/* Placeholder for unauthorized access */}
      <Route path="/unauthorized" element={<div>You are not authorized to view this page.</div>} />
      {/* Add more public and protected routes as needed */}
      <Route path="/" element={<LoginForm />} /> {/* Default route */}
    </Routes>
  );
};

export default AppRoutes;
