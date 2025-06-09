import { createContext } from 'react';
import type { Organization } from '../types'; // Assuming Organization type is in src/types

export interface OrgManagerContextType {
  selectedOrgId: string | null;
  setSelectedOrgId: (orgId: string | null) => void;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  selectedOrganization: Organization | null; // To easily access name, createdBy etc.
}

export const OrgManagerContext = createContext<OrgManagerContextType | undefined>(undefined);
