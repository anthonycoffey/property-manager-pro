import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { navigationItems } from '../../config/navigationConfig'; 
import type { NavItemConfig, UserRole } from '../../config/navigationConfig'; 
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../../hooks/useAuth';

const findNavItemByPath = (path: string, items: NavItemConfig[]): NavItemConfig | undefined => {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.children) {
      const childMatch = findNavItemByPath(path, item.children);
      if (childMatch) return childMatch;
    }
  }
  return undefined;
};

const getPathSegmentName = (segment: string, fullPath: string, userNavItems: NavItemConfig[]): string => {
  const navItem = findNavItemByPath(fullPath, userNavItems);
  if (navItem) {
    return navItem.text;
  }
  // Fallback for segments not directly in navConfig (e.g., dynamic IDs)
  // or base role paths if not handled by home link text
  if (segment === 'admin' || segment === 'organization-manager' || segment === 'property-manager' || segment === 'resident') {
    // Could map these to "Admin Area", "Org. Manager Area" etc. if desired as separate breadcrumbs
    // For now, if homeName is specific (e.g. "Admin Overview"), these might be redundant.
    // Returning empty string will filter them out if not needed.
    return ''; 
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

const BreadcrumbsComponent: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const userRoles: UserRole[] = currentUser?.customClaims?.roles
    ? (currentUser.customClaims.roles as UserRole[])
    : ['guest'];
  
  const userNavItems = navigationItems.filter(navItem => 
    navItem.roles.some(role => userRoles.includes(role))
  );

  const homeNavItem = userNavItems.length > 0 ? userNavItems[0] : null;
  
  // Only render breadcrumbs if there's a valid home/default navigation item for the user
  // and if we are within the /dashboard/* path structure.
  if (!homeNavItem || !location.pathname.startsWith('/dashboard') || pathnames.length < 2) {
    // pathnames.length < 2 means it's just '/dashboard', which should redirect.
    return null; 
  }

  const homePath = homeNavItem.path;
  const homeName = homeNavItem.text;

  return (
    <Box sx={{ mb: 2, px: {xs: 0, sm: 1} }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link 
          component={RouterLink} 
          underline={location.pathname === homePath ? "none" : "hover"}
          color={location.pathname === homePath ? "text.primary" : "inherit"}
          to={homePath} 
          sx={{display: 'flex', alignItems: 'center'}}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {homeName}
        </Link>
        
        {pathnames.slice(1).map((value, index) => { // Start mapping from the segment after "dashboard"
          // Current segment path construction needs to be relative to /dashboard
          const currentPathSegments = pathnames.slice(1, index + 2); // e.g., ['admin', 'overview']
          const to = `/dashboard/${currentPathSegments.join('/')}`;

          // If 'to' is the same as homePath, we've already rendered it.
          if (to === homePath) return null;

          const isLast = index === pathnames.slice(1).length - 1;
          // Pass the full path `to` for name lookup
          const displayName = getPathSegmentName(value, to, userNavItems); 

          if (!displayName) return null; // Skip if segment name is empty (e.g. for base role paths)
          
          return isLast ? (
            <Typography color="text.primary" key={to}>
              {displayName}
            </Typography>
          ) : (
            <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
              {displayName}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbsComponent;
