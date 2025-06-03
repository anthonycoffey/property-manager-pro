import React, { useEffect, useState, type ReactNode, useCallback } from 'react'; // Added useCallback
import { auth } from '../firebaseConfig';
import { signOut, type User as FirebaseUser, type IdTokenResult } from 'firebase/auth'; // Added signOut
import { AuthContext, type CustomUser } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<
    FirebaseUser | null | undefined
  >(undefined);

  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationIds, setOrganizationIds] = useState<string[] | null>(null); // New state
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      // State updates (currentUser to null, etc.) will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally re-throw or handle more gracefully
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (firebaseUser === undefined) {
      setLoading(true);
      return;
    }

    if (firebaseUser) {
      setLoading(true);
      let isMounted = true;

      firebaseUser
        .getIdTokenResult(true)
        .then((idTokenResult: IdTokenResult) => {
          if (!isMounted) return;
          const claims = idTokenResult.claims;
          const processedUser: CustomUser = {
            ...firebaseUser,
            customClaims: {
              roles: (claims.roles as string[]) || [],
              organizationId: (claims.organizationId as string) || undefined,
              organizationIds: (claims.organizationIds as string[]) || undefined,
              propertyId: (claims.propertyId as string) || undefined,
            },
          };
          setCurrentUser(processedUser);
          setRoles((claims.roles as string[]) || []);
          setOrganizationId((claims.organizationId as string) || null);
          setOrganizationIds((claims.organizationIds as string[]) || null);
          setPropertyId((claims.propertyId as string) || null);
          setLoading(false);
        })
        .catch((error: unknown) => {
          if (!isMounted) return;
          console.error('AuthProvider: Error fetching token claims:', error);
          setCurrentUser(null);
          setRoles([]);
          setOrganizationId(null);
          setOrganizationIds(null);
          setPropertyId(null);
          setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setCurrentUser(null);
      setRoles([]);
      setOrganizationId(null);
      setOrganizationIds(null);
      setPropertyId(null);
      setLoading(false);
    }
  }, [firebaseUser]);

  const value = {
    currentUser,
    loading,
    roles,
    organizationId,
    organizationIds,
    propertyId,
    signOutUser, // Added signOutUser to context
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
