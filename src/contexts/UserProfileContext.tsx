import React, { useState, useCallback, type ReactNode } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  UserProfileContext,
  type UserProfile,
  type UserProfileCache,
} from './UserProfileContextDefinition';

// The duration for which a cached profile is considered fresh (30 minutes)
const CACHE_DURATION_MS = 30 * 60 * 1000;

interface UserProfileProviderProps {
  children: ReactNode;
}

// The provider component
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({
  children,
}) => {
  const [profiles, setProfiles] = useState<UserProfileCache>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchUserProfiles = useCallback(
    async (uids: string[]) => {
      console.log('[UserProfileProvider] Fetch triggered for UIDs:', uids);
      const now = Date.now();
      const uidsToFetch: string[] = [];

      // Determine which UIDs need fetching (either not in cache or stale)
      uids.forEach((uid) => {
        const cached = profiles[uid];
        if (!cached || now - cached.timestamp > CACHE_DURATION_MS) {
          uidsToFetch.push(uid);
        }
      });

      console.log('[UserProfileProvider] Stale or missing UIDs to fetch:', uidsToFetch);

      // If there are no UIDs to fetch, we're done
      if (uidsToFetch.length === 0) {
        console.log('[UserProfileProvider] All requested profiles are fresh in cache. Aborting fetch.');
        return;
      }

      setIsLoading(true);

      try {
        const functions = getFunctions();
        const getUserProfiles = httpsCallable<
          { uids: string[] },
          Record<string, UserProfile>
        >(functions, 'getUserProfiles');

        const result = await getUserProfiles({ uids: uidsToFetch });
        const newProfiles = result.data;

        console.log('[UserProfileProvider] Fetched new profiles from cloud function:', newProfiles);

        // Update the cache with the newly fetched profiles
        setProfiles((prevProfiles) => {
          const updatedProfiles: UserProfileCache = { ...prevProfiles };
          Object.keys(newProfiles).forEach((uid) => {
            updatedProfiles[uid] = {
              profile: newProfiles[uid],
              timestamp: now,
            };
          });
          return updatedProfiles;
        });
      } catch (error) {
        console.error('Error fetching user profiles:', error);
        // In a real app, you might want to handle this more gracefully
      } finally {
        setIsLoading(false);
      }
    },
    [profiles]
  );

  const value = {
    profiles,
    fetchUserProfiles,
    isLoading,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
