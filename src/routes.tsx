import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Added Navigate
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
// Removed Outlet import as it's not directly used at this top level anymore for all routes, but by child layout routes
// import { Outlet } from 'react-router-dom';

import AdminOverviewView from './components/Dashboard/Admin/AdminOverviewView';
// OrganizationManagementPanel is now rendered by AdminOrganizationsView
// import OrganizationManagementPanel from './components/Admin/OrganizationManagementPanel';
import AdminOrganizationsView from './components/Dashboard/Admin/AdminOrganizationsView'; // Added
import AdminOrgManagersView from './components/Dashboard/Admin/AdminOrgManagersView';
import AdminPropertyManagersView from './components/Dashboard/Admin/AdminPropertyManagersView';
import AdminPropertiesAndResidentsView from './components/Dashboard/Admin/AdminPropertiesAndResidentsView';
import AdminCampaignsView from './components/Admin/Campaigns/AdminCampaignsView';
import ChatView from './components/Chat/ChatView';

import OrganizationManagerDashboardPanel from './components/Dashboard/OrganizationManagerDashboardPanel';
import OrgManagerOverviewView from './components/Dashboard/OrganizationManager/OrgManagerOverviewView';
import OrgManagerStaffView from './components/Dashboard/OrganizationManager/OrgManagerStaffView';
import OrgManagerPropertiesView from './components/Dashboard/OrganizationManager/OrgManagerPropertiesView';
import OrgManagerCampaignsView from './components/OrganizationManager/Campaigns/OrgManagerCampaignsView';

import PropertyManagerDashboardPanel from './components/Dashboard/PropertyManagerDashboardPanel';
import PropertyManagerOverviewView from './components/Dashboard/PropertyManager/PropertyManagerOverviewView';
import PropertyManagerMyPropertiesView from './components/Dashboard/PropertyManager/PropertyManagerMyPropertiesView';
import PropertyManagerResidentsView from './components/Dashboard/PropertyManager/PropertyManagerResidentsView';
import PropertyManagerCampaignsViewWrapper from './components/Dashboard/PropertyManager/PropertyManagerCampaignsViewWrapper';
import MyAccountPage from './pages/PropertyManager/MyAccountPage';
import ReportViolationPage from './pages/PropertyManager/ReportViolationPage';
import ViolationsDashboardPage from './pages/PropertyManager/ViolationsDashboardPage';
import PropertyNotificationsView from './components/PropertyManager/Notifications/PropertyNotificationsView';

import ResidentDashboard from './components/Resident/ResidentDashboard'; // Import Resident Layout
import PropertyDetailsView from './components/Resident/PropertyDetailsView';
import ResidentProfileManagement from './components/Resident/ResidentProfileManagement';
import ResidentServiceRequestsView from './components/Resident/ResidentServiceRequestsView';
import MyViolationsListView from './components/Resident/MyViolationsListView';
import ViolationDetailView from './components/Resident/ViolationDetailView';

import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AcceptOrgManagerInvitationPage from './pages/AcceptOrgManagerInvitationPage';
import DemoPage from './pages/DemoPage';
import LostPasswordPage from './pages/LostPasswordPage';
import CampaignDetailsPage from './pages/CampaignDetailsPage';
import JoinCampaignPage from './pages/JoinCampaignPage';
import PublicCampaignHandlerPage from './pages/PublicCampaignHandlerPage';
import DeleteAccountPage from './pages/DeleteAccountPage';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/login' element={<LoginForm />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route
        path='/dashboard'
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        {/* Admin Routes - Direct children of /dashboard Outlet */}
        <Route path='admin/overview' element={<AdminOverviewView />} />
        <Route
          path='admin/organizations'
          element={<AdminOrganizationsView />}
        />
        <Route path='admin/org-managers' element={<AdminOrgManagersView />} />
        <Route
          path='admin/property-managers'
          element={<AdminPropertyManagersView />}
        />
        <Route
          path='admin/properties'
          element={<AdminPropertiesAndResidentsView />}
        />
        <Route path='admin/campaigns' element={<AdminCampaignsView />} />
        <Route path='admin/ai-assistant' element={<ChatView />} />

        {/* Organization Manager Routes - Nested under OrganizationManagerDashboardPanel */}
        <Route
          path='organization-manager'
          element={<OrganizationManagerDashboardPanel orgIds={undefined} />}
        >
          <Route path='overview' element={<OrgManagerOverviewView />} />
          <Route path='staff' element={<OrgManagerStaffView />} />
          <Route path='properties' element={<OrgManagerPropertiesView />} />
          <Route path='campaigns' element={<OrgManagerCampaignsView />} />
          <Route path='ai-assistant' element={<ChatView />} />
          <Route index element={<Navigate to='overview' replace />} />
        </Route>

        {/* Property Manager Routes - Nested under PropertyManagerDashboardPanel */}
        <Route
          path='property-manager'
          element={<PropertyManagerDashboardPanel organizationId={null} />}
        >
          <Route path='overview' element={<PropertyManagerOverviewView />} />
          <Route
            path='my-properties'
            element={<PropertyManagerMyPropertiesView />}
          />
          <Route path='residents' element={<PropertyManagerResidentsView />} />
          <Route
            path='campaigns'
            element={<PropertyManagerCampaignsViewWrapper />}
          />
          <Route path='report-violation' element={<ReportViolationPage />} />
          <Route path='violations' element={<ViolationsDashboardPage />} />
          <Route
            path='property-notifications'
            element={<PropertyNotificationsView />}
          />
          <Route path='ai-assistant' element={<ChatView />} />
          <Route index element={<Navigate to='overview' replace />} />
        </Route>

        {/* Standalone Property Manager page */}
        <Route path='property-manager/my-account' element={<MyAccountPage />} />

        {/* Resident Routes - Nested under ResidentDashboard */}
        <Route path='resident' element={<ResidentDashboard />}>
          <Route path='my-profile' element={<ResidentProfileManagement />} />
          <Route path='my-property' element={<PropertyDetailsView />} />
          <Route
            path='service-request'
            element={<ResidentServiceRequestsView />}
          />
          <Route path='violations' element={<MyViolationsListView />} />
          <Route
            path='violations/:violationId'
            element={<ViolationDetailView />}
          />
          <Route path='ai-assistant' element={<ChatView />} />
          <Route index element={<Navigate to='my-profile' replace />} />{' '}
          {/* Default to my-profile */}
        </Route>

        <Route
          index
          element={<div>Loading dashboard or no applicable view...</div>}
        />
      </Route>

      <Route
        path='/campaigns/:campaignId'
        element={
          <ProtectedRoute>
            <CampaignDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route path='/accept-invitation' element={<AcceptInvitationPage />} />
      <Route
        path='/join-public-campaign'
        element={<PublicCampaignHandlerPage />}
      />
      <Route path='/join-campaign' element={<JoinCampaignPage />} />
      <Route
        path='/accept-org-manager-invitation'
        element={<AcceptOrgManagerInvitationPage />}
      />
      <Route path='/lost-password' element={<LostPasswordPage />} />
      <Route path='/demo' element={<DemoPage />} />
      <Route
        path='/delete-account'
        element={
          <ProtectedRoute>
            <DeleteAccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/unauthorized'
        element={<div>You are not authorized to view this page.</div>}
      />
      <Route path='/' element={<LoginForm />} />
    </Routes>
  );
};

export default AppRoutes;
