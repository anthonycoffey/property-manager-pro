import React, { useState } from 'react'; // Removed useContext, createContext
import type { ReactNode } from 'react';
import type { Organization } from '../types';
import { OrgManagerContext } from './OrgManagerContextDefinition'; // Import from new definition file

// OrgManagerContextType and OrgManagerContext are now imported

interface OrgManagerProviderProps {
  children: ReactNode;
  initialOrgs?: Organization[]; // Allow passing initial orgs if fetched by a parent
  initialSelectedOrgId?: string | null;
}

export const OrgManagerProvider: React.FC<OrgManagerProviderProps> = ({
  children,
  initialOrgs = [],
  initialSelectedOrgId = null,
}) => {
  const [organizations, setOrganizations] =
    useState<Organization[]>(initialOrgs);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    initialSelectedOrgId
  );

  const selectedOrganization =
    organizations.find((org) => org.id === selectedOrgId) || null;

  return (
    <OrgManagerContext.Provider
      value={{
        selectedOrgId,
        setSelectedOrgId,
        organizations,
        setOrganizations,
        selectedOrganization,
      }}
    >
      {children}
    </OrgManagerContext.Provider>
  );
};
