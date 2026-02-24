import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderId: string;
  unreadCount: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get all chats for this user
    const { data: chats } = await supabase
      .from("chats")
      .select("*")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!chats || chats.length === 0) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    // Get all other user IDs
    const otherUserIds = chats.map((c) =>
      c.user_1_id === user.id ? c.user_2_id : c.user_1_id
    );

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", otherUserIds);

    const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
    profiles?.forEach((p) => {
      profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
    });

    // Fetch latest message for each chat
    const convos: Conversation[] = [];

    for (const chat of chats) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("message, created_at, sender_id")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const otherUserId = chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id;
      const profile = profileMap[otherUserId];

      if (msgs && msgs.length > 0) {
        convos.push({
          chatId: chat.id,
          otherUserId,
          otherUserName: profile?.name || "Unknown",
          otherUserAvatar: profile?.avatar_url || null,
          lastMessage: msgs[0].message,
          lastMessageAt: msgs[0].created_at,
          lastMessageSenderId: msgs[0].sender_id,
          unreadCount: 0, // simplified for now
        });
      } else {
        convos.push({
          chatId: chat.id,
          otherUserId,
          otherUserName: profile?.name || "Unknown",
          otherUserAvatar: profile?.avatar_url || null,
          lastMessage: "",
          lastMessageAt: chat.created_at,
          lastMessageSenderId: "",
          unreadCount: 0,
        });
      }
    }

    // Sort by most recent message
    convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setConversations(convos);
    setTotalUnread(convos.reduce((sum, c) => sum + c.unreadCount, 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { conversations, loading, totalUnread, refetch: fetchConversations };
}
