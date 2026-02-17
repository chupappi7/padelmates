import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface AppNotification {
  id: string;
  type: "friend_request" | "game_confirmed" | "announcement" | "game_join" | "game_leave" | "game_request";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
  /** DB notification id (without prefix) for marking read */
  _dbId?: string;
}

/** Aggregates notifications from multiple sources with read/unread state */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const results: AppNotification[] = [];

    // 1. DB-persisted notifications
    const { data: dbNotifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    dbNotifs?.forEach((n: any) => {
      results.push({
        id: `notif_${n.id}`,
        type: n.type as AppNotification["type"],
        title: n.title,
        message: n.message,
        created_at: n.created_at,
        read: n.read,
        link: n.link,
        _dbId: n.id,
      });
    });

    // 2. Incoming friend requests (pending)
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

    // 3. Accepted join requests (game confirmed) – enriched with context
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
        .select("id, title, location, date_time, max_players")
        .in("id", gameIds);

      const gameMap = new Map(games?.map((g) => [g.id, g]) || []);

      // Get player counts per game
      const { data: playerRows } = await supabase
        .from("game_players")
        .select("game_id")
        .in("game_id", gameIds);

      const countMap = new Map<string, number>();
      playerRows?.forEach((p) => countMap.set(p.game_id, (countMap.get(p.game_id) || 0) + 1));

      acceptedJoins.forEach((j) => {
        const g = gameMap.get(j.game_id);
        const title = g?.title || "a game";
        let ctx = "";
        if (g) {
          const dateStr = format(new Date(g.date_time), "MMM d, h:mm a");
          const count = countMap.get(j.game_id) || 0;
          ctx = ` | ${g.location} · ${dateStr} · ${count}/${g.max_players}`;
        }
        results.push({
          id: `jc_${j.id}`,
          type: "game_confirmed",
          title: "Confirmed to Play",
          message: `You've been confirmed for "${title}"${ctx}`,
          created_at: j.updated_at,
          read: false,
          link: `/games/${j.game_id}`,
        });
      });
    }

    // 4. Club announcements
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

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = useCallback(async (notification: AppNotification) => {
    if (notification.read) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    // Only DB notifications can be persisted
    if (notification._dbId) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification._dbId);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Mark all DB notifications as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, refetch: fetchNotifications, markAsRead, markAllAsRead };
}
