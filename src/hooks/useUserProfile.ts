import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  region: string | null;
  name: string;
  skill_level: number;
  pdr_rating: number | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("region, name, skill_level, pdr_rating")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as any);
      });
  }, [user]);

  return profile;
}
