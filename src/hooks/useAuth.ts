import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

interface CustomClaims {
  roles?: string[];
  organizationId?: string; // For PMs, Residents (single org)
  organizationIds?: string[]; // For Organization Managers (multiple orgs)
  propertyId?: string;
}

export interface CustomUser extends User {
  customClaims?: CustomClaims;
}

interface AuthContextType {
  currentUser: CustomUser | null;
  loading: boolean;
  roles: string[];
  organizationId: string | null | undefined; // Primarily for PMs/Residents
  organizationIds: string[] | null | undefined; // For Organization Managers
  propertyId: string | null | undefined;
  signOutUser?: () => Promise<void>; // Added for sign out functionality
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
