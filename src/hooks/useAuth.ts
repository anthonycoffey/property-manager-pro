import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';

// Define a type for the user with custom claims
interface CustomClaims {
  roles?: string[];
  organizationId?: string;
  propertyId?: string;
}

// Extend the Firebase User type to include custom claims
export interface CustomUser extends User { // Added export
  customClaims?: CustomClaims;
}

interface AuthContextType {
  currentUser: CustomUser | null;
  loading: boolean;
  // Add custom claims directly to the context type for easier access
  roles: string[];
  organizationId: string | null | undefined; // Allow undefined
  propertyId: string | null | undefined; // Allow undefined
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
