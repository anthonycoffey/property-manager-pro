import { useContext } from 'react';
import { OrgManagerContext } from '../contexts/OrgManagerContextDefinition'; // Updated path
import type { OrgManagerContextType } from '../contexts/OrgManagerContextDefinition'; // Updated path

export const useOrgManagerContext = (): OrgManagerContextType => {
  const context = useContext(OrgManagerContext);
  if (!context) {
    throw new Error('useOrgManagerContext must be used within an OrgManagerProvider');
  }
  return context;
};
