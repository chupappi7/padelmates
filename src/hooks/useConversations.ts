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
  gameDateTime?: string;
  gameEndDateTime?: string | null;
  courtTakenBy?: string | null;
  prefs: ConversationPrefs;
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
    const endTime = convo.gameEndDateTime || convo.gameDateTime;
    if (endTime) {
      const end = new Date(endTime);
      const hoursAfter = (now.getTime() - end.getTime()) / (1000 * 60 * 60);
      if (hoursAfter > 24) return true;
    }
  }

  if (convo.type === "court") {
    if (convo.courtTakenBy) return true;
    if (convo.gameDateTime) {
      const gameDate = new Date(convo.gameDateTime);
      if (now > gameDate && !convo.courtTakenBy) return true;
    }
  }

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

    // Fetch preferences + chats + player games + hosted games in parallel
    const [prefsRes, chatsRes, playerGamesRes, hostedGamesRes] = await Promise.all([
      supabase
        .from("conversation_preferences")
        .select("conversation_id, archived, muted, deleted, last_read_at")
        .eq("user_id", user.id),
      supabase
        .from("chats")
        .select("*")
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("game_players")
        .select("game_id")
        .eq("user_id", user.id),
      supabase
        .from("games")
        .select("id")
        .eq("host_id", user.id)
        .neq("payment_mode", "court_sharing"),
    ]);

    const prefsMap: Record<string, ConversationPrefs & { last_read_at: string | null }> = {};
    prefsRes.data?.forEach((p: any) => {
      prefsMap[p.conversation_id] = {
        archived: p.archived,
        muted: p.muted,
        deleted: p.deleted,
        last_read_at: p.last_read_at,
      };
    });

    const getPrefs = (id: string): ConversationPrefs =>
      prefsMap[id] || { archived: false, muted: false, deleted: false };

    const getLastReadAt = (id: string): string | null =>
      prefsMap[id]?.last_read_at || null;

    // ── 1. PROCESS CHATS (DMs + Court threads) ──────────────────────────
    const chats = chatsRes.data || [];
    if (chats.length > 0) {
      const otherUserIds = [...new Set(chats.map((c) =>
        c.user_1_id === user.id ? c.user_2_id : c.user_1_id
      ))];
      const listingIds = [...new Set(chats.filter((c) => c.listing_id).map((c) => c.listing_id!))];
      const chatIds = chats.filter((c) => !getPrefs(c.id).deleted).map((c) => c.id);

      // Batch fetch profiles, games, and ALL last messages in parallel
      const [profilesRes, gamesRes, allChatMsgsRes, chatUnreadCounts] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", otherUserIds),
        listingIds.length > 0
          ? supabase
              .from("games")
              .select("id, title, location, court_number, date_time, end_date_time, court_taken_by")
              .in("id", listingIds)
          : Promise.resolve({ data: [] as any[] }),
        // Fetch recent messages for all chats at once (get last few per chat)
        chatIds.length > 0
          ? supabase
              .from("chat_messages")
              .select("chat_id, message, created_at, sender_id")
              .in("chat_id", chatIds)
              .order("created_at", { ascending: false })
              .limit(chatIds.length * 2)
          : Promise.resolve({ data: [] as any[] }),
        // Fetch unread counts: messages from others after last_read_at
        chatIds.length > 0
          ? (async () => {
              const counts: Record<string, number> = {};
              await Promise.all(
                chatIds.map(async (cid) => {
                  const lastRead = getLastReadAt(cid);
                  let query = supabase
                    .from("chat_messages")
                    .select("id", { count: "exact", head: true })
                    .eq("chat_id", cid)
                    .neq("sender_id", user.id);
                  if (lastRead) {
                    query = query.gt("created_at", lastRead);
                  }
                  const { count } = await query;
                  counts[cid] = count || 0;
                })
              );
              return counts;
            })()
          : Promise.resolve({} as Record<string, number>),
      ]);

      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profilesRes.data?.forEach((p) => {
        profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      });

      const gameMap: Record<string, { title: string; location: string; court_number: string | null; date_time: string; end_date_time: string | null; court_taken_by: string | null }> = {};
      (gamesRes.data || []).forEach((g: any) => {
        gameMap[g.id] = { title: g.title, location: g.location, court_number: g.court_number, date_time: g.date_time, end_date_time: g.end_date_time, court_taken_by: g.court_taken_by };
      });

      // Build last message map (first occurrence per chat_id since ordered desc)
      const lastChatMsgMap: Record<string, { message: string; created_at: string; sender_id: string }> = {};
      (allChatMsgsRes.data || []).forEach((m: any) => {
        if (!lastChatMsgMap[m.chat_id]) {
          lastChatMsgMap[m.chat_id] = { message: m.message, created_at: m.created_at, sender_id: m.sender_id };
        }
      });

      for (const chat of chats) {
        const prefs = getPrefs(chat.id);
        if (prefs.deleted) continue;

        const otherUserId = chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id;
        const profile = profileMap[otherUserId];
        const lastMsg = lastChatMsgMap[chat.id];
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
          unreadCount: (chatUnreadCounts as Record<string, number>)[chat.id] || 0,
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

    // ── 2. PROCESS MATCH GROUP CHATS ────────────────────────────────────
    const playerGameIds = new Set(playerGamesRes.data?.map((p) => p.game_id) || []);
    const hostedGameIds = new Set(hostedGamesRes.data?.map((g) => g.id) || []);
    const allMatchGameIds = [...new Set([...playerGameIds, ...hostedGameIds])];

    if (allMatchGameIds.length > 0) {
      // Fetch match games and their last messages in parallel
      const [matchGamesRes, allGameMsgsRes, gameUnreadCounts] = await Promise.all([
        supabase
          .from("games")
          .select("id, title, location, payment_mode, host_id, date_time, end_date_time")
          .in("id", allMatchGameIds)
          .neq("payment_mode", "court_sharing"),
        supabase
          .from("game_messages")
          .select("game_id, message, created_at, user_id")
          .in("game_id", allMatchGameIds)
          .order("created_at", { ascending: false })
          .limit(allMatchGameIds.length * 2),
        (async () => {
          const counts: Record<string, number> = {};
          await Promise.all(
            allMatchGameIds.map(async (gid) => {
              const convoId = `game-${gid}`;
              const lastRead = getLastReadAt(convoId);
              let query = supabase
                .from("game_messages")
                .select("id", { count: "exact", head: true })
                .eq("game_id", gid)
                .neq("user_id", user.id);
              if (lastRead) {
                query = query.gt("created_at", lastRead);
              }
              const { count } = await query;
              counts[gid] = count || 0;
            })
          );
          return counts;
        })(),
      ]);

      const matchGames = matchGamesRes.data || [];

      // Build last game message map
      const lastGameMsgMap: Record<string, { message: string; created_at: string; user_id: string }> = {};
      (allGameMsgsRes.data || []).forEach((m: any) => {
        if (!lastGameMsgMap[m.game_id]) {
          lastGameMsgMap[m.game_id] = { message: m.message, created_at: m.created_at, user_id: m.user_id };
        }
      });

      // Collect all sender user_ids we need to resolve names for
      const senderIdsToResolve = new Set<string>();
      for (const game of matchGames) {
        const lastMsg = lastGameMsgMap[game.id];
        if (lastMsg && lastMsg.user_id !== user.id) {
          senderIdsToResolve.add(lastMsg.user_id);
        }
      }

      // Batch fetch all sender profiles at once
      const senderProfileMap: Record<string, string> = {};
      if (senderIdsToResolve.size > 0) {
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", Array.from(senderIdsToResolve));
        senderProfiles?.forEach((p) => {
          senderProfileMap[p.user_id] = p.name;
        });
      }

      for (const game of matchGames) {
        const convoId = `game-${game.id}`;
        const prefs = getPrefs(convoId);
        if (prefs.deleted) continue;

        const lastMsg = lastGameMsgMap[game.id];
        let senderName: string | undefined;
        if (lastMsg) {
          senderName = lastMsg.user_id === user.id ? "You" : senderProfileMap[lastMsg.user_id] || "Unknown";
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
          unreadCount: (gameUnreadCounts as Record<string, number>)[game.id] || 0,
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

    results.sort(
      (a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime()
    );

    setConversations(results);
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

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from("conversation_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("conversation_preferences")
          .update({ last_read_at: now })
          .eq("id", existing.id);
      } else {
        await supabase.from("conversation_preferences").insert({
          user_id: user.id,
          conversation_id: conversationId,
          last_read_at: now,
        });
      }

      // Optimistic update
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        setTotalUnread(
          updated
            .filter((c) => !c.prefs.archived && !c.autoArchived && !c.prefs.muted && !c.prefs.deleted)
            .reduce((sum, c) => sum + c.unreadCount, 0)
        );
        return updated;
      });
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

  return { conversations, loading, totalUnread, refetch: fetchConversations, updatePreference, markAsRead };
}
