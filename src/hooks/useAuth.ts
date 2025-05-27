import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

interface CustomClaims {
  roles?: string[];
  organizationId?: string;
  propertyId?: string;
}

export interface CustomUser extends User {
  customClaims?: CustomClaims;
}

interface AuthContextType {
  currentUser: CustomUser | null;
  loading: boolean;
  roles: string[];
  organizationId: string | null | undefined;
  propertyId: string | null | undefined;
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
