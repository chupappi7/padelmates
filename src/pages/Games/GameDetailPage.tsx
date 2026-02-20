import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { JoinRequestModal } from "@/components/games/JoinRequestModal";
import { ParticipantsTab } from "@/components/games/ParticipantsTab";
import { MatchesTab } from "@/components/games/MatchesTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatGameContext } from "@/lib/formatGameContext";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  MessageCircle,
  Trophy,
  Clock,
  Info,
  Swords,
  Send,
  Pencil,
  Euro,
  Share2,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { CourtDMChat } from "@/components/games/CourtDMChat";
import { BookingProofTab } from "@/components/games/BookingProofTab";
import { ShieldCheck } from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string | null;
  location: string;
  court_number: string | null;
  date_time: string;
  end_date_time: string | null;
  skill_level: number;
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  price_per_player: number;
  payment_mode: string;
  visibility: string;
  host_id: string;
  host_is_playing: boolean;
  join_mode: string;
  scoreboard: unknown;
  court_taken_by: string | null;
  booking_screenshot_url: string | null;
  profiles: { name: string; avatar_url: string | null; skill_level?: number } | null;
}

interface Player {
  id: string;
  user_id: string;
  role: string;
  profiles: { name: string; avatar_url: string | null; skill_level: number } | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  note: string | null;
  payment_screenshot_url: string | null;
  payment_status: string;
  payment_due_at: string | null;
  profiles: { name: string; avatar_url: string | null; skill_level: number } | null;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

const formatLabels = {
  casual_match: "Casual Match",
  americano: "Americano",
  team_americano: "Team Americano",
};

type TabKey = "details" | "proof" | "participants" | "matches" | "chat";

const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "details", label: "Details", icon: Info },
  { key: "proof", label: "Proof", icon: ShieldCheck },
  { key: "participants", label: "Players", icon: Users },
  { key: "matches", label: "Matches", icon: Swords },
  { key: "chat", label: "Chat", icon: MessageCircle },
];

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [myInterest, setMyInterest] = useState<{ id: string; status: string } | null>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGame();
      fetchPlayers();
      fetchMessages();
      if (user) {
        fetchMyRequest();
        fetchMyInterest();
        fetchInterestCount();
        fetchUnreadMessageCount();
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`game-realtime-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` },
        () => { fetchPlayers(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_id=eq.${id}` },
        () => { fetchMessages(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          // Only bump count if not currently on the chat tab and message is not from us
          if (activeTab !== "chat" && payload.new?.sender_id !== user?.id) {
            fetchUnreadMessageCount();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, activeTab, user?.id]);

  useEffect(() => {
    if (game) fetchRequests();
  }, [game]);

  const fetchGame = async () => {
    const { data } = await supabase.from("games").select("*").eq("id", id).single();
    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url, skill_level")
        .eq("user_id", data.host_id)
        .single();
      setGame({ ...data, profiles: profile, host_is_playing: data.host_is_playing ?? true } as Game);
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("game_players").select("*").eq("game_id", id);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url, skill_level").in("user_id", userIds);
      const profileMap: Record<string, { name: string; avatar_url: string | null; skill_level: number }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url, skill_level: p.skill_level }; });
      setPlayers(data.map((p) => ({ ...p, profiles: profileMap[p.user_id] || null })) as Player[]);
    } else {
      setPlayers([]);
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from("join_requests").select("*").eq("game_id", id).order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url, skill_level").in("user_id", userIds);
      const profileMap: Record<string, { name: string; avatar_url: string | null; skill_level: number }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url, skill_level: p.skill_level }; });
      setRequests(data.map((r) => ({ ...r, profiles: profileMap[r.user_id] || null })) as JoinRequest[]);
    } else {
      setRequests([]);
    }
  };

  const fetchMyRequest = async () => {
    const { data } = await supabase.from("join_requests").select("*").eq("game_id", id).eq("user_id", user?.id).maybeSingle();
    if (data) {
      const { data: profile } = await supabase.from("profiles").select("name, avatar_url, skill_level").eq("user_id", data.user_id).single();
      setMyRequest({ ...data, profiles: profile } as JoinRequest);
    } else {
      setMyRequest(null);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase.from("game_messages").select("*").eq("game_id", id).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });
      setMessages(data.map((m) => ({ ...m, profiles: profileMap[m.user_id] || null })) as Message[]);
    } else {
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return;
    const { error } = await supabase.from("game_messages").insert({ game_id: id, user_id: user.id, message: newMessage });
    if (error) { toast.error("Failed to send message"); return; }
    setNewMessage("");
    fetchMessages();
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId);
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;
    const { error } = await supabase.from("join_requests").update({ status: "accepted" }).eq("id", requestId);
    if (error) { toast.error("Failed to accept request"); }
    else {
      await supabase.from("game_players").insert({ game_id: id, user_id: request.user_id });
      toast.success("Player accepted!");
      fetchRequests();
      fetchPlayers();
    }
    setActionLoading(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionLoading(requestId);
    const { error } = await supabase.from("join_requests").update({ status: "rejected" }).eq("id", requestId);
    if (error) { toast.error("Failed to reject request"); }
    else { toast.success("Request rejected"); fetchRequests(); }
    setActionLoading(null);
  };

  const notifyHost = async (type: string, title: string, message: string) => {
    if (!game || !user || game.host_id === user.id) return;
    await supabase.from("notifications").insert({
      user_id: game.host_id,
      type,
      title,
      message,
      link: `/games/${game.id}`,
    });
  };

  const handleDirectJoin = async () => {
    if (!user || !id) return;
    setJoinLoading(true);
    const { error } = await supabase.from("game_players").insert({ game_id: id, user_id: user.id });
    if (error) { toast.error("Failed to join game"); }
    else {
      toast.success("You've joined the game!");
      fetchPlayers();
      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      const hostPlaying = game?.host_is_playing ? 1 : 0;
      const ctx = game ? ` | ${formatGameContext(game.location, game.date_time, players.length + 1 + hostPlaying, game.max_players)}` : "";
      notifyHost("game_join", "Game Update", `${profile?.name || "Someone"} joined "${game?.title}"${ctx}`);
    }
    setJoinLoading(false);
  };

  const handleLeaveGame = async () => {
    if (!user || !id) return;
    setJoinLoading(true);
    const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
    const { error } = await supabase.from("game_players").delete().eq("game_id", id).eq("user_id", user.id);
    if (error) { toast.error("Failed to leave game"); }
    else {
      toast.success("You've left the game");
      setShowLeaveConfirm(false);
      fetchPlayers();
      await supabase.from("join_requests").delete().eq("game_id", id).eq("user_id", user.id);
      setMyRequest(null);
      const hostPlaying = game?.host_is_playing ? 1 : 0;
      const ctx = game ? ` | ${formatGameContext(game.location, game.date_time, players.length - 1 + hostPlaying, game.max_players)}` : "";
      notifyHost("game_leave", "Game Update", `${profile?.name || "Someone"} left "${game?.title}"${ctx}`);
    }
    setJoinLoading(false);
  };

  const isHost = user?.id === game?.host_id;
  const isAdmin = players.some((p) => p.user_id === user?.id && p.role === "admin");
  const isPlayer = players.some((p) => p.user_id === user?.id);
  const canManage = isHost || isAdmin;
  const isCourtSharing = game?.payment_mode === "court_sharing";
  const isCourtTaken = !!game?.court_taken_by;
  const prefilledPlayers: (string | { name: string; user_id: string })[] = Array.isArray((game as any)?.prefilled_players) ? (game as any).prefilled_players : [];
  const prefilledCount = prefilledPlayers.filter(p => {
    const name = typeof p === "string" ? p : p.name;
    return name.trim();
  }).length;
  const hostCount = game?.host_is_playing ? 1 : 0;
  const totalPlayers = players.length + hostCount + prefilledCount;
  const spotsLeft = game ? game.max_players - totalPlayers : 0;
  const isOpenJoin = game?.join_mode === "open";
  const userJoinStatus = myRequest?.status || null;
  const canAccessChat = isHost || isPlayer;
  const isInterested = !!myInterest;
  const interestedRequests = requests.filter(r => r.status === "pending");
  const canAccessDM = isCourtSharing && (isHost || isInterested);

  const fetchMyInterest = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("interests")
      .select("id, status")
      .eq("listing_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyInterest(data ? { id: data.id, status: data.status } : null);
  };

  const fetchInterestCount = async () => {
    if (!id) return;
    const { count } = await supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id);
    setInterestCount(count || 0);
  };

  const fetchUnreadMessageCount = async () => {
    if (!id || !user) return;
    const { data: chats } = await supabase
      .from("chats")
      .select("id")
      .eq("listing_id", id)
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`);
    if (!chats || chats.length === 0) { setUnreadMessageCount(0); return; }
    // Count threads (chats) that have at least one unread message from others
    const chatIds = chats.map((c) => c.id);
    const threadUnreadChecks = await Promise.all(
      chatIds.map((chatId) =>
        supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("chat_id", chatId)
          .neq("sender_id", user.id)
          .then(({ count }) => (count && count > 0 ? 1 : 0))
      )
    );
    setUnreadMessageCount(threadUnreadChecks.reduce((a, b) => a + b, 0));
  };

  const handleToggleRole = async (playerId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "player" : "admin";
    const { error } = await supabase.from("game_players").update({ role: newRole }).eq("id", playerId);
    if (error) { toast.error("Failed to update role"); }
    else { toast.success(newRole === "admin" ? "Promoted to admin" : "Demoted to player"); fetchPlayers(); }
  };

  const handleExpressInterest = async () => {
    if (!user || !id) return;
    setJoinLoading(true);
    // Insert into interests table
    const { error } = await supabase.from("interests").insert({
      listing_id: id,
      user_id: user.id,
    });
    if (error) {
      toast.error("Failed to express interest");
    } else {
      toast.success("Interest sent! You can now message the host.");
      fetchMyInterest();
      fetchInterestCount();
      // Notify host
      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      const ctx = game ? ` | ${formatGameContext(game.location, game.date_time)}` : "";
      notifyHost("game_request", "Court Interest", `${profile?.name || "Someone"} is interested in "${game?.title}"${ctx}`);
      // Auto-switch to messages tab
      setActiveTab("chat");
    }
    setJoinLoading(false);
  };

  const handleConfirmBooking = async (interestId: string, bookedUserId: string) => {
    if (!id) return;
    setJoinLoading(true);
    // Mark interest as confirmed
    await supabase.from("interests").update({ status: "confirmed" }).eq("id", interestId);
    // Mark court as taken
    const { error } = await supabase.from("games").update({ court_taken_by: bookedUserId }).eq("id", id);
    if (error) {
      toast.error("Failed to confirm booking");
    } else {
      toast.success("Booking confirmed! Court is now marked as taken.");
      fetchGame();
      fetchInterestCount();
      // Notify the confirmed user
      await supabase.from("notifications").insert({
        user_id: bookedUserId,
        type: "game_confirmed",
        title: "Court Booking Confirmed",
        message: `Your booking for "${game?.title}" has been confirmed by the host!`,
        link: `/games/${id}`,
      });
      // Notify all other interested users the court is taken
      const { data: otherInterests } = await supabase
        .from("interests")
        .select("user_id")
        .eq("listing_id", id)
        .neq("user_id", bookedUserId);
      for (const interest of otherInterests || []) {
        await supabase.from("notifications").insert({
          user_id: interest.user_id,
          type: "announcement",
          title: "Court Taken",
          message: `The court "${game?.title}" has been taken by someone else.`,
          link: `/games/${id}`,
        });
      }
    }
    setJoinLoading(false);
  };

  const handleMarkAsTaken = async () => {
    if (!id) return;
    setJoinLoading(true);
    const { error } = await supabase.from("games").update({ court_taken_by: user?.id }).eq("id", id);
    if (error) {
      toast.error("Failed to mark as taken");
    } else {
      toast.success("Court marked as taken!");
      fetchGame();
    }
    setJoinLoading(false);
  };

  const handleUndoTaken = async () => {
    if (!id) return;
    setJoinLoading(true);
    const { error } = await supabase.from("games").update({ court_taken_by: null }).eq("id", id);
    if (error) { toast.error("Failed to undo"); }
    else { toast.success("Court is available again"); fetchGame(); }
    setJoinLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <Button onClick={() => navigate("/games")}>Back to Games</Button>
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className={cn("min-h-screen bg-background md:pb-8", activeTab === "chat" ? "h-screen overflow-hidden pb-0" : "pb-32")}>
      <Navbar />

      <div className={cn("container max-w-4xl px-3 md:px-6", activeTab === "chat" ? "py-1 md:py-3 flex flex-col overflow-hidden" : "py-3 md:py-8")} style={activeTab === "chat" ? { height: "calc(100vh - 56px - 4.5rem)" } : undefined}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={activeTab === "chat" ? "flex flex-col flex-1 min-h-0 overflow-hidden" : ""}>
          {/* Back + Title */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-sm md:text-xl font-bold truncate">{game.title}</h1>
              {!isCourtSharing && (
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  <SkillBadge level={game.skill_level as number} size="sm" />
                </div>
              )}
              {isCourtSharing && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {game.location}{game.court_number ? ` · Court ${game.court_number}` : ""}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/games/${id}`;
                navigator.clipboard.writeText(url);
                toast.success("Invite link copied!");
              }}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {canManage && (
              <button
                onClick={() => navigate(`/games/${id}/edit`)}
                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Join Status Banner - compact strip */}
          {isCourtSharing && isInterested && !isHost && !isCourtTaken && myInterest?.status !== "confirmed" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary/10 text-primary border-primary/20 mb-2">
              <Heart className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">You're interested · Message host to discuss</p>
            </div>
          )}
          {isCourtSharing && isInterested && myInterest?.status === "confirmed" && !isHost && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-success/10 text-success border-success/20 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">Booking Confirmed 🎉</p>
            </div>
          )}
          {isCourtSharing && isCourtTaken && !isHost && myInterest?.status !== "confirmed" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted text-muted-foreground border-border mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">Court already claimed</p>
            </div>
          )}
          {!isCourtSharing && myRequest && !isPlayer && userJoinStatus === "pending" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-warning/10 text-warning border-warning/20 mb-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">Pending · Waiting for host</p>
            </div>
          )}
          {!isCourtSharing && myRequest && myRequest.status === "rejected" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-destructive/10 text-destructive border-destructive/20 mb-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <p className="text-xs font-semibold">Request rejected</p>
            </div>
          )}

          {/* Tab Navigation Buttons */}
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 mb-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              // Court sharing: show Details + Proof + Messages (DM) only
              if (isCourtSharing) {
                if (tab.key !== "details" && tab.key !== "proof" && tab.key !== "chat") return null;
                if (tab.key === "chat" && !canAccessDM) return null;
              } else {
                // Hide proof and chat for non-participants in regular games
                if (tab.key === "proof") return null;
                if (tab.key === "chat" && !canAccessChat) return null;
              }

              const isActive = activeTab === tab.key;
              const showBadge = tab.key === "participants" && isHost && pendingCount > 0;
              const showMsgBadge = tab.key === "chat" && isCourtSharing && activeTab !== "chat" && unreadMessageCount > 0 && !loading;

              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); if (tab.key === "chat") setUnreadMessageCount(0); }}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-1 justify-center relative",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{isCourtSharing && tab.key === "chat" ? "Messages" : tab.label}</span>
                  {showBadge && (
                    <span className="w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                  {showMsgBadge && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT */}

          {/* Details Tab */}
          {activeTab === "details" && (
            <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Info Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Location</p>
                      <p className="text-sm font-medium break-words">
                        {game.location}
                        {game.court_number && <span className="text-muted-foreground"> · Court {game.court_number}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Date & Time</p>
                      <p className="text-sm font-medium">
                        {format(new Date(game.date_time), "EEE, MMM d · HH:mm")}
                        {game.end_date_time && ` – ${format(new Date(game.end_date_time), "HH:mm")}`}
                        {game.end_date_time && (() => {
                          const hrs = (new Date(game.end_date_time).getTime() - new Date(game.date_time).getTime()) / 3600000;
                          return hrs > 0 ? ` (${hrs % 1 === 0 ? hrs : hrs.toFixed(1)}h)` : "";
                        })()}
                      </p>
                    </div>
                  </div>
                  {isCourtSharing ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Interest</p>
                        <p className="text-sm font-medium">
                          {interestCount} interested
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Players</p>
                        <p className="text-sm font-medium">
                          {totalPlayers}/{game.max_players}
                          {spotsLeft > 0 && (
                            <span className="text-success text-xs ml-1">· {spotsLeft} left</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {!isCourtSharing && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Join Mode</p>
                        <p className="text-sm font-medium">
                          {isOpenJoin ? "Open" : "Request"}
                        </p>
                      </div>
                    </div>
                  )}
                  {((game as any).price_mode === 'split_evenly' || game.price_per_player > 0) && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Euro className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">Price</p>
                        <p className="text-sm font-medium">
                          {(game as any).payment_mode === 'court_sharing'
                            ? `${Number(game.price_per_player)} Kč`
                            : (game as any).price_mode === 'split_evenly'
                              ? game.price_per_player > 0
                                ? `≈ ${Number(game.price_per_player)} Kč per player (split evenly)`
                                : "Split evenly among players"
                              : `${Number(game.price_per_player)} Kč per player`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Host Info */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={game.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {game.profiles?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Hosted by</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold break-words">{game.profiles?.name}</p>
                    </div>
                  </div>
                  {game.profiles?.skill_level && (
                    <SkillBadge level={game.profiles.skill_level as number} size="sm" />
                  )}
                </div>
              </div>

              {/* Description / Notes */}
              {game.description && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Notes from Host
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {game.description}
                  </p>
                </div>
              )}

              {/* Court Sharing: Host "Mark as Taken" / "Undo" */}
              {isCourtSharing && isHost && (
                <div className="bg-card border border-border rounded-xl p-4">
                  {isCourtTaken ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-destructive" />
                        <span className="text-sm font-semibold">Court is marked as Taken</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleUndoTaken} disabled={joinLoading}>
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={handleMarkAsTaken}
                      disabled={joinLoading}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {joinLoading ? "Marking..." : "Mark Court as Taken"}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}


          {/* Proof Tab */}
          {activeTab === "proof" && isCourtSharing && (
            <motion.div key="proof" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BookingProofTab
                gameId={game.id}
                bookingScreenshotUrl={(game as any).booking_screenshot_url ?? null}
                isHost={isHost}
                userId={user?.id}
                onScreenshotUpdated={(newPath) => {
                  setGame((prev) => prev ? { ...prev, booking_screenshot_url: newPath } as any : prev);
                }}
              />
            </motion.div>
          )}

          {/* Participants Tab */}
          {activeTab === "participants" && (
            <motion.div key="participants" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ParticipantsTab
                isHost={isHost}
                canManage={canManage}
                hostIsPlaying={game.host_is_playing}
                hostProfile={game.profiles ? {
                  name: game.profiles.name,
                  avatar_url: game.profiles.avatar_url,
                  skill_level: game.profiles.skill_level as number | undefined,
                } : null}
                requests={requests as any}
                players={players as any}
                maxPlayers={game.max_players}
                currentUserId={user?.id}
                userRequest={myRequest as any}
                prefilledPlayers={prefilledPlayers}
                onAcceptRequest={handleAcceptRequest}
                onRejectRequest={handleRejectRequest}
                onToggleRole={handleToggleRole}
                loadingAction={actionLoading}
              />
            </motion.div>
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <MatchesTab
                gameId={game.id}
                canManage={canManage}
                players={players}
                hostIsPlaying={game.host_is_playing}
                hostId={game.host_id}
                hostProfile={game.profiles ? {
                  name: game.profiles.name,
                  avatar_url: game.profiles.avatar_url,
                } : null}
              />
            </motion.div>
          )}

          {/* Chat Tab - DM for court sharing, group chat for regular */}
          {activeTab === "chat" && isCourtSharing && canAccessDM && user && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0">
              <CourtDMChat
                gameId={game.id}
                currentUserId={user.id}
                hostId={game.host_id}
                isHost={isHost}
                isCourtTaken={isCourtTaken}
                gameLocation={game.location}
                gameDateTime={game.date_time}
                myInterestStatus={myInterest?.status ?? null}
                onConfirmBooking={handleConfirmBooking}
              />
            </motion.div>
          )}
          {activeTab === "chat" && !isCourtSharing && canAccessChat && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0">
              <div className="bg-card border border-border rounded-xl flex flex-col flex-1 overflow-hidden">
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div key={msg.id} className={cn("flex gap-2.5", msg.user_id === user?.id && "flex-row-reverse")}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {msg.profiles?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[75%]", msg.user_id === user?.id && "text-right")}>
                          <p className="text-[11px] text-muted-foreground mb-0.5">
                            <span className="font-medium">{msg.profiles?.name}</span>
                            <span className="ml-1.5">{format(new Date(msg.created_at), "HH:mm")}</span>
                          </p>
                          <div className={cn(
                            "inline-block px-3 py-2 rounded-2xl text-sm",
                            msg.user_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          )}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mb-2" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Start the conversation!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2 p-3 border-t border-border">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="text-sm h-10"
                  />
                  <Button onClick={handleSendMessage} size="icon" className="h-10 w-10 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Sticky Leave CTA - not for court sharing */}
      {user && !isHost && !isCourtSharing && isPlayer && activeTab !== "chat" && (
        <div className="fixed left-0 right-0 px-4 pb-2 pt-2 bg-background/95 backdrop-blur-md md:hidden z-50" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
          <Button
            variant="destructive"
            size="lg"
            className="w-full h-11 text-sm font-semibold"
            disabled={joinLoading}
            onClick={() => setShowLeaveConfirm(true)}
          >
            {joinLoading ? "Leaving..." : "Leave Game"}
          </Button>
        </div>
      )}

      {/* Sticky "I'm Interested" CTA for court sharing */}
      {user && !isHost && isCourtSharing && !isInterested && !isCourtTaken && activeTab !== "chat" && (
        <div className="fixed left-0 right-0 px-4 pb-2 pt-2 bg-background/95 backdrop-blur-md md:hidden z-50" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
          <Button
            variant="default"
            size="lg"
            className="w-full h-11 text-sm font-semibold"
            disabled={joinLoading}
            onClick={handleExpressInterest}
          >
            <Heart className="w-4 h-4" />
            {joinLoading ? "Sending..." : "I'm Interested"}
          </Button>
        </div>
      )}

      {/* Sticky Join CTA - not for court sharing */}
      {user && !isHost && !isCourtSharing && !isPlayer && !myRequest && spotsLeft > 0 && activeTab !== "chat" && (
        <div className="fixed left-0 right-0 px-4 pb-2 pt-2 bg-background/95 backdrop-blur-md md:hidden z-50" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
          <Button
            variant="default"
            size="lg"
            className="w-full h-11 text-sm font-semibold"
            disabled={joinLoading}
            onClick={() => isOpenJoin ? setShowJoinConfirm(true) : setShowJoinModal(true)}
          >
            {joinLoading
              ? "Joining..."
              : game?.payment_mode === "spot_selling"
                ? "Take This Spot"
                : isOpenJoin ? "Join Now" : "Request to Join"}
          </Button>
        </div>
      )}

      {/* Desktop Leave Button - not for court sharing */}
      {user && !isHost && !isCourtSharing && isPlayer && activeTab !== "chat" && (
        <div className="hidden md:block fixed bottom-8 right-8">
          <Button
            variant="destructive"
            size="default"
            className="shadow-xl"
            disabled={joinLoading}
            onClick={() => setShowLeaveConfirm(true)}
          >
            {joinLoading ? "Leaving..." : "Leave Game"}
          </Button>
        </div>
      )}

      {/* Desktop "I'm Interested" for court sharing */}
      {user && !isHost && isCourtSharing && !isInterested && !isCourtTaken && activeTab !== "chat" && (
        <div className="hidden md:block fixed bottom-8 right-8">
          <Button
            variant="default"
            size="default"
            className="shadow-xl"
            disabled={joinLoading}
            onClick={handleExpressInterest}
          >
            <Heart className="w-4 h-4" />
            {joinLoading ? "Sending..." : "I'm Interested"}
          </Button>
        </div>
      )}

      {/* Desktop Join Button - not for court sharing */}
      {user && !isHost && !isCourtSharing && !isPlayer && !myRequest && spotsLeft > 0 && activeTab !== "chat" && (
        <div className="hidden md:block fixed bottom-8 right-8">
          <Button
            variant="default"
            size="default"
            className="shadow-xl"
            disabled={joinLoading}
            onClick={() => isOpenJoin ? setShowJoinConfirm(true) : setShowJoinModal(true)}
          >
            {joinLoading
              ? "Joining..."
              : game?.payment_mode === "spot_selling"
                ? "Take This Spot"
                : isOpenJoin ? "Join Now" : "Request to Join"}
          </Button>
        </div>
      )}

      {/* Join Request Modal */}
      {game && user && (
        <JoinRequestModal
          open={showJoinModal}
          onOpenChange={setShowJoinModal}
          gameId={game.id}
          userId={user.id}
          hostId={game.host_id}
          gameTitle={game.title}
          gameLocation={game.location}
          gameDateTime={game.date_time}
          onSuccess={fetchMyRequest}
        />
      )}

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this game?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be removed from the player list. You can rejoin later if spots are still available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLeaveGame}
            >
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Join Confirmation */}
      <AlertDialog open={showJoinConfirm} onOpenChange={setShowJoinConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {game?.payment_mode === "court_sharing" ? "Secure this court?" : "Join this game?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {game?.payment_mode === "court_sharing"
                ? `You'll secure the court for "${game?.title}".`
                : `You'll be added as a confirmed player for "${game?.title}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowJoinConfirm(false); handleDirectJoin(); }}>
              {game?.payment_mode === "court_sharing" ? "Secure Court" : "Join Game"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
