/**
 * Represents the public-facing profile of a user.
 */
export interface UserProfile {
  displayName: string;
  photoURL: string | null;
}

/**
 * Represents a user profile stored in the cache, including a timestamp
 * to determine when the data should be considered stale.
 */
export interface CachedUserProfile {
  profile: UserProfile;
  timestamp: number; // Unix timestamp (ms) of when the profile was fetched
}

/**
 * The structure of the cache object, mapping UIDs to their cached profile data.
 */
export type UserProfileCache = Record<string, CachedUserProfile>;

/**
 * Defines the shape of the UserProfileContext, including the cache
 * and the function to fetch user profiles.
 */
export interface UserProfileContextType {
  profiles: UserProfileCache;
  fetchUserProfiles: (uids: string[]) => Promise<void>;
  isLoading: boolean;
}

import { createContext } from 'react';

// Create the context with a default value
export const UserProfileContext = createContext<
  UserProfileContextType | undefined
>(undefined);
