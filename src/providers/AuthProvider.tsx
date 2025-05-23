import React, { useEffect, useState, type ReactNode } from 'react';
import { auth } from '../firebaseConfig';
import { AuthContext, type CustomUser } from '../hooks/useAuth'; // Import CustomUser as type-only

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Force refresh ID token to get latest custom claims
        const idTokenResult = await user.getIdTokenResult(true);
        const claims = idTokenResult.claims;

        const updatedUser: CustomUser = {
          ...user,
          customClaims: {
            roles: claims.roles as string[] || [],
            organizationId: claims.organizationId as string || undefined,
            propertyId: claims.propertyId as string || undefined,
          },
        };
        setCurrentUser(updatedUser);
        setRoles(claims.roles as string[] || []);
        setOrganizationId(claims.organizationId as string || null);
        setPropertyId(claims.propertyId as string || null);
      } else {
        setCurrentUser(null);
        setRoles([]);
        setOrganizationId(null);
        setPropertyId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    roles,
    organizationId,
    propertyId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
