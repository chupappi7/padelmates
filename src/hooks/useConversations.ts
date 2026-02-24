import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ConversationType = "dm" | "court" | "match";

export interface UnifiedConversation {
  id: string;
  type: ConversationType;
  title: string;
  contextLabel?: string; // e.g. listing name for court threads
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderName?: string;
  unreadCount: number;
  chatId?: string;
  gameId?: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const results: UnifiedConversation[] = [];

    // ── 1. FETCH CHATS (DMs + Court threads) ────────────────────────────
    const { data: chats } = await supabase
      .from("chats")
      .select("*")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (chats && chats.length > 0) {
      // Collect other user IDs and listing IDs
      const otherUserIds = chats.map((c) =>
        c.user_1_id === user.id ? c.user_2_id : c.user_1_id
      );
      const listingIds = chats
        .filter((c) => c.listing_id)
        .map((c) => c.listing_id!);

      // Fetch profiles + games in parallel
      const [profilesRes, gamesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", [...new Set(otherUserIds)]),
        listingIds.length > 0
          ? supabase
              .from("games")
              .select("id, title, location, court_number")
              .in("id", [...new Set(listingIds)])
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profilesRes.data?.forEach((p) => {
        profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      });

      const gameMap: Record<string, { title: string; location: string; court_number: string | null }> = {};
      gamesRes.data?.forEach((g) => {
        gameMap[g.id] = { title: g.title, location: g.location, court_number: g.court_number };
      });

      // Batch fetch latest messages for all chats
      for (const chat of chats) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("message, created_at, sender_id")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const otherUserId =
          chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id;
        const profile = profileMap[otherUserId];
        const lastMsg = msgs?.[0];
        const isCourt = !!chat.listing_id;
        const game = chat.listing_id ? gameMap[chat.listing_id] : null;

        const senderName =
          lastMsg?.sender_id === user.id
            ? "You"
            : profile?.name || "Unknown";

        results.push({
          id: chat.id,
          type: isCourt ? "court" : "dm",
          title: profile?.name || "Unknown",
          contextLabel: isCourt && game
            ? `${game.title}${game.court_number ? ` · Court ${game.court_number}` : ""}`
            : undefined,
          avatarUrl: profile?.avatar_url || null,
          lastMessage: lastMsg?.message || "",
          lastMessageAt: lastMsg?.created_at || chat.created_at,
          lastMessageSenderName: lastMsg ? senderName : undefined,
          unreadCount: 0,
          chatId: chat.id,
          gameId: chat.listing_id || undefined,
        });
      }
    }

    // ── 2. FETCH MATCH GROUP CHATS ──────────────────────────────────────
    // Games where user is host or player, excluding court_sharing
    const { data: playerGames } = await supabase
      .from("game_players")
      .select("game_id")
      .eq("user_id", user.id);

    const { data: hostedGames } = await supabase
      .from("games")
      .select("id")
      .eq("host_id", user.id)
      .neq("payment_mode", "court_sharing");

    const playerGameIds = new Set(playerGames?.map((p) => p.game_id) || []);
    const hostedGameIds = new Set(hostedGames?.map((g) => g.id) || []);
    const allMatchGameIds = [...new Set([...playerGameIds, ...hostedGameIds])];

    if (allMatchGameIds.length > 0) {
      // Filter out court_sharing games for player games
      const { data: matchGames } = await supabase
        .from("games")
        .select("id, title, location, payment_mode, host_id")
        .in("id", allMatchGameIds)
        .neq("payment_mode", "court_sharing");

      if (matchGames && matchGames.length > 0) {
        for (const game of matchGames) {
          const { data: msgs } = await supabase
            .from("game_messages")
            .select("message, created_at, user_id")
            .eq("game_id", game.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = msgs?.[0];

          // Get sender name for last message
          let senderName: string | undefined;
          if (lastMsg) {
            if (lastMsg.user_id === user.id) {
              senderName = "You";
            } else {
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("user_id", lastMsg.user_id)
                .maybeSingle();
              senderName = senderProfile?.name || "Unknown";
            }
          }

          results.push({
            id: `game-${game.id}`,
            type: "match",
            title: game.title,
            contextLabel: game.location,
            avatarUrl: null,
            lastMessage: lastMsg?.message || "",
            lastMessageAt: lastMsg?.created_at || "",
            lastMessageSenderName: senderName,
            unreadCount: 0,
            gameId: game.id,
          });
        }
      }
    }

    // Sort all by most recent
    results.sort(
      (a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime()
    );

    setConversations(results);
    setTotalUnread(results.reduce((sum, c) => sum + c.unreadCount, 0));
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
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_messages" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { conversations, loading, totalUnread, refetch: fetchConversations };
}
