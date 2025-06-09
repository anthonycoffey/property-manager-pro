import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react'; // Import ReactNode as type
import type { Organization } from '../types'; // Assuming Organization type is in src/types

interface OrgManagerContextType {
  selectedOrgId: string | null;
  setSelectedOrgId: (orgId: string | null) => void;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  selectedOrganization: Organization | null; // To easily access name, createdBy etc.
}

const OrgManagerContext = createContext<OrgManagerContextType | undefined>(undefined);

export const useOrgManagerContext = () => {
  const context = useContext(OrgManagerContext);
  if (!context) {
    throw new Error('useOrgManagerContext must be used within an OrgManagerProvider');
  }
  return context;
};

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
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrgs);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(initialSelectedOrgId);

  const selectedOrganization = organizations.find(org => org.id === selectedOrgId) || null;

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
