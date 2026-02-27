import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatGameContext } from "@/lib/formatGameContext";

export type ConversationType = "dm" | "court" | "match";

export interface ConversationPrefs {
  archived: boolean;
  muted: boolean;
  deleted: boolean;
}

export interface UnifiedConversation {
  id: string;
  type: ConversationType;
  title: string;
  contextLabel?: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderName?: string;
  unreadCount: number;
  chatId?: string;
  gameId?: string;
  // Auto-archive metadata
  gameDateTime?: string;
  gameEndDateTime?: string | null;
  courtTakenBy?: string | null;
  // Preferences
  prefs: ConversationPrefs;
  // Auto-archive computed
  autoArchived: boolean;
}

function computeAutoArchive(convo: {
  type: ConversationType;
  gameDateTime?: string;
  gameEndDateTime?: string | null;
  courtTakenBy?: string | null;
}): boolean {
  const now = new Date();

  if (convo.type === "match") {
    // Archive match chats 24h after game end
    const endTime = convo.gameEndDateTime || convo.gameDateTime;
    if (endTime) {
      const end = new Date(endTime);
      const hoursAfter = (now.getTime() - end.getTime()) / (1000 * 60 * 60);
      if (hoursAfter > 24) return true;
    }
  }

  if (convo.type === "court") {
    // If court is sold/taken, archive after 48h
    if (convo.courtTakenBy) {
      // We don't have the exact sold time, so we use game date as proxy
      // In practice this would need a sold_at timestamp
      return true; // simplified: sold = archived
    }
    // If listing date passed without being sold
    if (convo.gameDateTime) {
      const gameDate = new Date(convo.gameDateTime);
      if (now > gameDate && !convo.courtTakenBy) return true;
    }
  }

  // DMs: never auto-archive
  return false;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const results: UnifiedConversation[] = [];

    // Fetch user preferences
    const { data: prefsData } = await supabase
      .from("conversation_preferences")
      .select("conversation_id, archived, muted, deleted")
      .eq("user_id", user.id);

    const prefsMap: Record<string, ConversationPrefs> = {};
    prefsData?.forEach((p) => {
      prefsMap[p.conversation_id] = {
        archived: p.archived,
        muted: p.muted,
        deleted: p.deleted,
      };
    });

    const getPrefs = (id: string): ConversationPrefs =>
      prefsMap[id] || { archived: false, muted: false, deleted: false };

    // ── 1. FETCH CHATS (DMs + Court threads) ────────────────────────────
    const { data: chats } = await supabase
      .from("chats")
      .select("*")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (chats && chats.length > 0) {
      const otherUserIds = chats.map((c) =>
        c.user_1_id === user.id ? c.user_2_id : c.user_1_id
      );
      const listingIds = chats
        .filter((c) => c.listing_id)
        .map((c) => c.listing_id!);

      const [profilesRes, gamesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", [...new Set(otherUserIds)]),
        listingIds.length > 0
          ? supabase
              .from("games")
              .select("id, title, location, court_number, date_time, end_date_time, court_taken_by")
              .in("id", [...new Set(listingIds)])
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profilesRes.data?.forEach((p) => {
        profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      });

      const gameMap: Record<string, { title: string; location: string; court_number: string | null; date_time: string; end_date_time: string | null; court_taken_by: string | null }> = {};
      gamesRes.data?.forEach((g: any) => {
        gameMap[g.id] = { title: g.title, location: g.location, court_number: g.court_number, date_time: g.date_time, end_date_time: g.end_date_time, court_taken_by: g.court_taken_by };
      });

      for (const chat of chats) {
        const prefs = getPrefs(chat.id);
        if (prefs.deleted) continue;

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("message, created_at, sender_id")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const otherUserId = chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id;
        const profile = profileMap[otherUserId];
        const lastMsg = msgs?.[0];
        const isCourt = !!chat.listing_id;
        const game = chat.listing_id ? gameMap[chat.listing_id] : null;

        const senderName = lastMsg?.sender_id === user.id ? "You" : profile?.name || "Unknown";

        const convo: UnifiedConversation = {
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
          gameDateTime: game?.date_time,
          gameEndDateTime: game?.end_date_time,
          courtTakenBy: game?.court_taken_by,
          prefs,
          autoArchived: false,
        };
        convo.autoArchived = computeAutoArchive(convo);
        results.push(convo);
      }
    }

    // ── 2. FETCH MATCH GROUP CHATS ──────────────────────────────────────
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
      const { data: matchGames } = await supabase
        .from("games")
        .select("id, title, location, payment_mode, host_id, date_time, end_date_time")
        .in("id", allMatchGameIds)
        .neq("payment_mode", "court_sharing");

      if (matchGames && matchGames.length > 0) {
        for (const game of matchGames) {
          const convoId = `game-${game.id}`;
          const prefs = getPrefs(convoId);
          if (prefs.deleted) continue;

          const { data: msgs } = await supabase
            .from("game_messages")
            .select("message, created_at, user_id")
            .eq("game_id", game.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = msgs?.[0];
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

          const convo: UnifiedConversation = {
            id: convoId,
            type: "match",
            title: game.title,
            contextLabel: formatGameContext(game.location, game.date_time),
            avatarUrl: null,
            lastMessage: lastMsg?.message || "",
            lastMessageAt: lastMsg?.created_at || "",
            lastMessageSenderName: senderName,
            unreadCount: 0,
            gameId: game.id,
            gameDateTime: game.date_time,
            gameEndDateTime: game.end_date_time,
            prefs,
            autoArchived: false,
          };
          convo.autoArchived = computeAutoArchive(convo);
          results.push(convo);
        }
      }
    }

    results.sort(
      (a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime()
    );

    setConversations(results);
    // Only count unread from active (non-archived, non-muted, non-deleted)
    setTotalUnread(
      results
        .filter((c) => !c.prefs.archived && !c.autoArchived && !c.prefs.muted && !c.prefs.deleted)
        .reduce((sum, c) => sum + c.unreadCount, 0)
    );
    setLoading(false);
  }, [user?.id]);

  const updatePreference = useCallback(
    async (conversationId: string, updates: Partial<ConversationPrefs>) => {
      if (!user) return;

      const { data: existing } = await supabase
        .from("conversation_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("conversation_preferences")
          .update(updates)
          .eq("id", existing.id);
      } else {
        await supabase.from("conversation_preferences").insert({
          user_id: user.id,
          conversation_id: conversationId,
          archived: updates.archived ?? false,
          muted: updates.muted ?? false,
          deleted: updates.deleted ?? false,
        });
      }

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, prefs: { ...c.prefs, ...updates } }
            : c
        )
      );
    },
    [user?.id]
  );

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => fetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chats" }, () => fetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_messages" }, () => fetchConversations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  return { conversations, loading, totalUnread, refetch: fetchConversations, updatePreference };
}
