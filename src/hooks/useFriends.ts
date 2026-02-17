import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FriendProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  skill_level: number;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile: FriendProfile;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friendship[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching friendships:", error);
      setLoading(false);
      return;
    }

    const friendships = data || [];
    
    // Get all unique user IDs that aren't the current user
    const otherUserIds = friendships.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch profiles for these users
    let profiles: FriendProfile[] = [];
    if (otherUserIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, skill_level")
        .in("user_id", otherUserIds);
      profiles = profileData || [];
    }

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    const enriched: Friendship[] = friendships.map(f => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      return {
        ...f,
        profile: profileMap.get(otherId) || { user_id: otherId, name: "Unknown", avatar_url: null, skill_level: 3 },
      };
    });

    setFriends(enriched.filter(f => f.status === "accepted"));
    setIncomingRequests(enriched.filter(f => f.status === "pending" && f.addressee_id === user.id));
    setOutgoingRequests(enriched.filter(f => f.status === "pending" && f.requester_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    } as any);

    if (error) {
      if (error.code === "23505") {
        toast.error("Friend request already sent");
      } else {
        toast.error("Failed to send request");
      }
      return;
    }
    toast.success("Friend request sent!");
    fetchFriends();
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" } as any)
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to accept request");
      return;
    }
    toast.success("Friend request accepted!");
    fetchFriends();
  };

  const rejectRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to decline request");
      return;
    }
    toast("Request declined");
    fetchFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to remove friend");
      return;
    }
    toast("Friend removed");
    fetchFriends();
  };

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refetch: fetchFriends,
  };
}

export type { FriendProfile, Friendship };
