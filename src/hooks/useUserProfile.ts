import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  region: string | null;
  name: string;
  skill_level: number;
  pdr_rating: number | null;
  avatar_url: string | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  
  // Use Google metadata as immediate default to avoid avatar flash
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

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase
      .from("profiles")
      .select("region, name, skill_level, pdr_rating, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          // If profile has no custom avatar, keep Google avatar
          const resolvedAvatar = (data as any).avatar_url || googleAvatar;
          setProfile({ ...(data as any), avatar_url: resolvedAvatar });
        }
      });
  }, [user]);

  return profile;
}
