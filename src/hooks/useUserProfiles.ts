import { useContext, useEffect, useMemo } from 'react';
import { UserProfileContext } from '../contexts/UserProfileContextDefinition';
import type { UserProfileContextType, UserProfile } from '../contexts/UserProfileContextDefinition';

/**
 * A hook to access user profiles from the UserProfileContext.
 * It requests profiles for the given UIDs and returns the cached data and loading state.
 *
 * @param uids An array of user IDs for which to fetch profiles.
 * @returns An object containing the profiles map, a loading indicator, and the raw profiles for the requested UIDs.
 */
export const useUserProfiles = (uids: string[]) => {
  const context = useContext(UserProfileContext);

  if (!context) {
    throw new Error('useUserProfiles must be used within a UserProfileProvider');
  }

  const { profiles: allProfiles, fetchUserProfiles, isLoading } = context as UserProfileContextType;

  // Effect to fetch profiles when the list of UIDs changes
  useEffect(() => {
    // Filter out any empty/null/undefined UIDs before fetching
    const validUids = uids.filter(uid => uid);
    if (validUids.length > 0) {
      fetchUserProfiles(validUids);
    }
  }, [uids, fetchUserProfiles]);

  // Memoize the returned profiles object to prevent unnecessary re-renders
  const requestedProfiles = useMemo(() => {
    const profileMap: Record<string, UserProfile> = {};
    uids.forEach(uid => {
      if (allProfiles[uid]) {
        profileMap[uid] = allProfiles[uid].profile;
      }
    });
    return profileMap;
  }, [uids, allProfiles]);

  return {
    profiles: requestedProfiles, // A map of UID -> UserProfile for the requested UIDs
    isLoading,
  };
};
