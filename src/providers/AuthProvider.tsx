import React, { useEffect, useState, type ReactNode } from 'react';
import { auth } from '../firebaseConfig';
import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth'; // Import FirebaseUser and IdTokenResult types from firebase/auth
import { AuthContext, type CustomUser } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // undefined: initial state, Firebase SDK hasn't responded yet.
  // null: Firebase SDK responded, no user.
  // FirebaseUser: Firebase SDK responded, user object present.
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);
  
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  
  // true: initial SDK check pending OR processing a logged-in user's claims.
  // false: SDK check complete and no user OR user processed and claims loaded.
  const [loading, setLoading] = useState(true);

  // Effect 1: Subscribe to Firebase Auth state changes
  useEffect(() => {
    // console.log('AuthProvider: Subscribing to onAuthStateChanged.');
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // console.log('AuthProvider: onAuthStateChanged raw event. User UID:', user ? user.uid : null);
      setFirebaseUser(user); // Update the raw Firebase user state
    });
    return () => {
      // console.log('AuthProvider: Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, []);

  // Effect 2: Process changes to firebaseUser
  useEffect(() => {
    // console.log('AuthProvider: Processing firebaseUser change. Current firebaseUser UID:', firebaseUser ? firebaseUser.uid : String(firebaseUser));

    if (firebaseUser === undefined) {
      // console.log('AuthProvider: firebaseUser is undefined (initial state). Setting loading to true.');
      setLoading(true); // Still waiting for the first auth state from Firebase SDK
      return;
    }

    if (firebaseUser) { // A user object exists
      // console.log('AuthProvider: firebaseUser is present. Setting loading to true for claim processing.');
      setLoading(true); // Indicate processing has started for this user
      let isMounted = true;

      firebaseUser.getIdTokenResult(true) // Force refresh claims
        .then((idTokenResult: IdTokenResult) => {
          if (!isMounted) return;
          const claims = idTokenResult.claims;
          // console.log('AuthProvider: Claims fetched:', claims);
          const processedUser: CustomUser = {
            ...firebaseUser,
            customClaims: {
              roles: claims.roles as string[] || [],
              organizationId: claims.organizationId as string || undefined,
              propertyId: claims.propertyId as string || undefined,
            },
          };
          setCurrentUser(processedUser);
          setRoles(claims.roles as string[] || []);
          setOrganizationId(claims.organizationId as string || null);
          setPropertyId(claims.propertyId as string || null);
          // console.log('AuthProvider: User processed, claims set. Setting loading to false.');
          setLoading(false);
        })
        .catch((error: unknown) => {
          if (!isMounted) return;
          console.error('AuthProvider: Error fetching token claims:', error); // Keep error log
          setCurrentUser(null); // Clear user on error
          setRoles([]);
          setOrganizationId(null);
          setPropertyId(null);
          setLoading(false); // Finish loading even on error
        });
      
      return () => { isMounted = false; }; // Cleanup for async operation
    } else { // firebaseUser is null (no user)
      // console.log('AuthProvider: firebaseUser is null. Clearing user data, setting loading to false.');
      setCurrentUser(null);
      setRoles([]);
      setOrganizationId(null);
      setPropertyId(null);
      setLoading(false);
    }
  }, [firebaseUser]); // This effect runs when firebaseUser changes

  const value = {
    currentUser,
    loading, // This loading state is now more robustly managed
    roles,
    organizationId,
    propertyId,
  };
  
  // console.log('AuthProvider: Rendering. Loading state:', loading, 'CurrentUser UID:', currentUser ? currentUser.uid : null);

  // Render children only when not loading.
  // This gate is crucial. If loading is true, children (including router) shouldn't render.
  if (loading) {
     // You might want a more sophisticated global loading spinner here
    // console.log('AuthProvider: Global loading state is true, rendering loading indicator.');
    return <div>Authenticating...</div>; 
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
