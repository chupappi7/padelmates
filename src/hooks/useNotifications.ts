import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  type: "friend_request" | "game_confirmed" | "announcement";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const results: AppNotification[] = [];

    // 1. Incoming friend requests (pending)
    const { data: friendReqs } = await supabase
      .from("friendships")
      .select("id, requester_id, created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (friendReqs && friendReqs.length > 0) {
      const requesterIds = friendReqs.map((f) => f.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", requesterIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      friendReqs.forEach((f) => {
        results.push({
          id: `fr_${f.id}`,
          type: "friend_request",
          title: "Friend Request",
          message: `${nameMap.get(f.requester_id) || "Someone"} sent you a friend request`,
          created_at: f.created_at,
          read: false,
          link: "/friends?tab=requests",
        });
      });
    }

    // 2. Accepted join requests (game confirmed)
    const { data: acceptedJoins } = await supabase
      .from("join_requests")
      .select("id, game_id, updated_at, status")
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (acceptedJoins && acceptedJoins.length > 0) {
      const gameIds = acceptedJoins.map((j) => j.game_id);
      const { data: games } = await supabase
        .from("games")
        .select("id, title")
        .in("id", gameIds);

      const gameMap = new Map(games?.map((g) => [g.id, g.title]) || []);

      acceptedJoins.forEach((j) => {
        results.push({
          id: `jc_${j.id}`,
          type: "game_confirmed",
          title: "Confirmed to Play",
          message: `You've been confirmed for "${gameMap.get(j.game_id) || "a game"}"`,
          created_at: j.updated_at,
          read: false,
          link: `/games/${j.game_id}`,
        });
      });
    }

    // 3. Club announcements (from clubs user follows)
    const { data: follows } = await supabase
      .from("club_followers")
      .select("club_id")
      .eq("user_id", user.id);

    if (follows && follows.length > 0) {
      const clubIds = follows.map((f) => f.club_id);
      const { data: announcements } = await supabase
        .from("club_announcements")
        .select("id, title, content, created_at, club_id")
        .in("club_id", clubIds)
        .order("created_at", { ascending: false })
        .limit(5);

      announcements?.forEach((a) => {
        results.push({
          id: `ann_${a.id}`,
          type: "announcement",
          title: a.title,
          message: a.content.substring(0, 80),
          created_at: a.created_at,
          read: false,
        });
      });
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, refetch: fetchNotifications };
}
