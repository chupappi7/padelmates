import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface AppNotification {
  id: string;
  type: "friend_request" | "game_confirmed" | "announcement" | "game_join" | "game_leave" | "game_request" | "credit_received" | "credit_prompt";
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
  const skipNextRefetch = useRef(false);

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

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Subscribe to realtime changes so badge updates when notifications are read/inserted
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          if (skipNextRefetch.current) {
            skipNextRefetch.current = false;
            return;
          }
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = useCallback(async (notification: AppNotification) => {
    if (notification.read) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    // Only DB notifications can be persisted
    if (notification._dbId) {
      skipNextRefetch.current = true;
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
    skipNextRefetch.current = true;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, refetch: fetchNotifications, markAsRead, markAllAsRead };
}
