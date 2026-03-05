import { useUserProfileContext } from "@/contexts/UserProfileContext";

/**
 * Returns the cached user profile from context.
 * No re-fetching on navigation — profile persists app-wide.
 */
export function useUserProfile() {
  const { profile } = useUserProfileContext();
  return profile;
}
