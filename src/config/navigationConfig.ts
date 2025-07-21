import React from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People'; // For PM Residents tab
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PolicyIcon from '@mui/icons-material/Policy';

// Define UserRole type if not already globally available
export type UserRole =
  | 'admin'
  | 'organization_manager'
  | 'property_manager'
  | 'resident'
  | 'guest'; // Guest role for login/public links

export interface NavItemConfig {
  text: string;
  icon: React.ElementType; // MUI Icon component
  path: string; // Absolute path
  roles: UserRole[];
  children?: NavItemConfig[]; // For nested routes/sub-menus if needed later
  // For future use if selectors are embedded in drawer:
  // isSelector?: boolean;
  // selectorComponent?: React.ElementType;
}

export const navigationItems: NavItemConfig[] = [
  // --- Admin Links ---
  // Corresponds to AdminDashboardPanel tabs
  {
    text: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard/admin/overview',
    roles: ['admin'],
  },
  {
    text: 'Organizations',
    icon: BusinessIcon,
    path: '/dashboard/admin/organizations',
    roles: ['admin'],
  },
  {
    text: 'Org. Managers',
    icon: GroupIcon,
    path: '/dashboard/admin/org-managers',
    roles: ['admin'],
  },
  {
    text: 'Property Managers',
    icon: AssignmentIndIcon,
    path: '/dashboard/admin/property-managers', // Will require org selection on page
    roles: ['admin'],
  },
  {
    text: 'Properties & Residents',
    icon: HomeWorkIcon,
    path: '/dashboard/admin/properties', // Will require org selection on page
    roles: ['admin'],
  },
  {
    text: 'Campaigns',
    icon: CampaignIcon,
    path: '/dashboard/admin/campaigns',
    roles: ['admin'],
  },
  {
    text: 'AI Assistant',
    icon: ChatBubbleOutlineIcon,
    path: '/dashboard/admin/ai-assistant',
    roles: ['admin'],
  },

  // --- Organization Manager Links ---
  // Corresponds to OrganizationManagerDashboardPanel tabs
  // Paths will need to incorporate :orgId or views will handle org selection
  {
    text: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard/organization-manager/overview', // Page will need org selector or use :orgId
    roles: ['organization_manager'],
  },
  {
    text: 'Staff',
    icon: AssignmentIndIcon,
    path: '/dashboard/organization-manager/staff', // Page will need org selector or use :orgId
    roles: ['organization_manager'],
  },
  {
    text: 'Properties',
    icon: HomeWorkIcon,
    path: '/dashboard/organization-manager/properties', // Page will need org selector or use :orgId
    roles: ['organization_manager'],
  },
  {
    text: 'Campaigns',
    icon: CampaignIcon,
    path: '/dashboard/organization-manager/campaigns', // Page will need org selector or use :orgId
    roles: ['organization_manager'],
  },
  {
    text: 'AI Assistant',
    icon: ChatBubbleOutlineIcon,
    path: '/dashboard/organization-manager/ai-assistant',
    roles: ['organization_manager'],
  },

  // --- Property Manager Links ---
  // Corresponds to PropertyManagerDashboardPanel tabs
  // Paths will need to incorporate :propertyId or views will handle property selection
  {
    text: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard/property-manager/overview', // Page will need property selector
    roles: ['property_manager'],
  },
  {
    text: 'My Properties',
    icon: HomeWorkIcon,
    path: '/dashboard/property-manager/my-properties',
    roles: ['property_manager'],
  },
  {
    text: 'Residents',
    icon: PeopleIcon, // Changed from Group to PeopleIcon for PM
    path: '/dashboard/property-manager/residents', // Page will need property selector
    roles: ['property_manager'],
  },
  {
    text: 'Campaigns',
    icon: CampaignIcon,
    path: '/dashboard/property-manager/campaigns', // Page will need property selector
    roles: ['property_manager'],
  },
  {
    text: 'Report Violation',
    icon: ReportProblemIcon,
    path: '/dashboard/property-manager/report-violation',
    roles: ['property_manager'],
  },
  {
    text: 'Violations',
    icon: PolicyIcon,
    path: '/dashboard/property-manager/violations',
    roles: ['property_manager'],
  },
  {
    text: 'AI Assistant',
    icon: ChatBubbleOutlineIcon,
    path: '/dashboard/property-manager/ai-assistant',
    roles: ['property_manager'],
  },
  {
    text: 'My Account',
    icon: PersonIcon,
    path: '/dashboard/property-manager/my-account',
    roles: ['property_manager'],
  },

  // --- Resident Links ---
  // Corresponds to ResidentDashboard tabs (Reordered for My Profile to be default)
  {
    text: 'My Profile',
    icon: PersonIcon,
    path: '/dashboard/resident/my-profile',
    roles: ['resident'],
  },
  {
    text: 'My Property',
    icon: HomeWorkIcon,
    path: '/dashboard/resident/my-property',
    roles: ['resident'],
  },
  {
    text: 'Request Service',
    icon: BuildIcon,
    path: '/dashboard/resident/service-request',
    roles: ['resident'],
  },
  {
    text: 'My Violations',
    icon: PolicyIcon,
    path: '/dashboard/resident/my-violations',
    roles: ['resident'],
  },
  {
    text: 'AI Assistant',
    icon: ChatBubbleOutlineIcon,
    path: '/dashboard/resident/ai-assistant',
    roles: ['resident'],
  },
];
