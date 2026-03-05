import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  region: string | null;
  name: string;
  skill_level: number;
  pdr_rating: number | null;
  avatar_url: string | null;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  refreshProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";

  const [profile, setProfile] = useState<UserProfile | null>(
    user ? {
      region: null,
      name: googleName,
      skill_level: 0,
      pdr_rating: null,
      avatar_url: googleAvatar,
    } : null
  );

  const fetchProfile = useCallback(() => {
    if (!user) { setProfile(null); return; }
    supabase
      .from("profiles")
      .select("region, name, skill_level, pdr_rating, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const resolvedAvatar = (data as any).avatar_url || googleAvatar;
          setProfile({ ...(data as any), avatar_url: resolvedAvatar });
        }
      });
  }, [user, googleAvatar]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // When user changes (login/logout), reset immediately with google data
  useEffect(() => {
    if (user) {
      setProfile(prev => prev ?? {
        region: null,
        name: googleName,
        skill_level: 0,
        pdr_rating: null,
        avatar_url: googleAvatar,
      });
    } else {
      setProfile(null);
    }
  }, [user?.id]);

  return (
    <UserProfileContext.Provider value={{ profile, refreshProfile: fetchProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileContext() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfileContext must be used within a UserProfileProvider");
  }
  return context;
}
