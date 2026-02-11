import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date_time: string;
  skill_level: "beginner" | "intermediate" | "advanced";
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  visibility: string;
  host_id: string;
  host_is_playing: boolean;
  join_mode: string;
  scoreboard: unknown;
  profiles: { name: string; avatar_url: string | null; skill_level?: string } | null;
}

interface Player {
  id: string;
  user_id: string;
  profiles: { name: string; avatar_url: string | null; skill_level: "beginner" | "intermediate" | "advanced" } | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  note: string | null;
  payment_screenshot_url: string | null;
  payment_status: string;
  payment_due_at: string | null;
  profiles: { name: string; avatar_url: string | null; skill_level: "beginner" | "intermediate" | "advanced" } | null;
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

type TabKey = "details" | "participants" | "matches" | "chat";

const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "details", label: "Details", icon: Info },
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
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGame();
      fetchPlayers();
      fetchMessages();
      if (user) {
        fetchMyRequest();
      }
    }
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`game-players-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${id}` },
        () => { fetchPlayers(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

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
    if (data) {
      const playersWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase.from("profiles").select("name, avatar_url, skill_level").eq("user_id", p.user_id).single();
          return { ...p, profiles: profile };
        })
      );
      setPlayers(playersWithProfiles as Player[]);
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from("join_requests").select("*").eq("game_id", id).order("created_at", { ascending: false });
    if (data) {
      const requestsWithProfiles = await Promise.all(
        data.map(async (r) => {
          const { data: profile } = await supabase.from("profiles").select("name, avatar_url, skill_level").eq("user_id", r.user_id).single();
          return { ...r, profiles: profile };
        })
      );
      setRequests(requestsWithProfiles as JoinRequest[]);
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
    if (data) {
      const messagesWithProfiles = await Promise.all(
        data.map(async (m) => {
          const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", m.user_id).single();
          return { ...m, profiles: profile };
        })
      );
      setMessages(messagesWithProfiles as Message[]);
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

  const handleDirectJoin = async () => {
    if (!user || !id) return;
    setJoinLoading(true);
    const { error } = await supabase.from("game_players").insert({ game_id: id, user_id: user.id });
    if (error) { toast.error("Failed to join game"); }
    else { toast.success("You've joined the game!"); fetchPlayers(); }
    setJoinLoading(false);
  };

  const isHost = user?.id === game?.host_id;
  const isPlayer = players.some((p) => p.user_id === user?.id);
  const hostCount = game?.host_is_playing ? 1 : 0;
  const totalPlayers = players.length + hostCount;
  const spotsLeft = game ? game.max_players - totalPlayers : 0;
  const isOpenJoin = game?.join_mode === "open";
  const userJoinStatus = myRequest?.status || null;
  const canAccessChat = isHost || isPlayer;

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
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navbar />

      <div className="container py-4 md:py-8 max-w-4xl px-3 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Back + Title */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg md:text-2xl font-bold truncate">{game.title}</h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <SkillBadge level={game.skill_level} size="sm" />
                <Badge variant="outline" className="rounded-full text-[10px] h-5">
                  {formatLabels[game.format]}
                </Badge>
                {isHost && (
                  <Badge className="rounded-full bg-primary/10 text-primary border-0 text-[10px] h-5">Hosting</Badge>
                )}
                {isPlayer && !isHost && (
                  <Badge className="rounded-full bg-success/10 text-success border-0 text-[10px] h-5">Playing</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Join Status Banner */}
          {myRequest && !isPlayer && userJoinStatus === "pending" && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-warning/10 text-warning border-warning/20 mb-3">
              <Clock className="w-5 h-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Pending</p>
                <p className="text-xs opacity-80">Request sent – waiting for host</p>
              </div>
            </div>
          )}
          {myRequest && myRequest.status === "rejected" && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-destructive/10 text-destructive border-destructive/20 mb-3">
              <Clock className="w-5 h-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Rejected</p>
                <p className="text-xs opacity-80">Your request was not accepted</p>
              </div>
            </div>
          )}

          {/* Tab Navigation Buttons */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              // Hide chat for non-participants
              if (tab.key === "chat" && !canAccessChat) return null;

              const isActive = activeTab === tab.key;
              const showBadge = tab.key === "participants" && isHost && pendingCount > 0;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-xs">{tab.label}</span>
                  {showBadge && (
                    <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center">
                      {pendingCount}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Location</p>
                      <p className="text-sm font-medium truncate">{game.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Date & Time</p>
                      <p className="text-sm font-medium truncate">
                        {format(new Date(game.date_time), "EEE, MMM d · h:mm a")}
                      </p>
                    </div>
                  </div>
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
                      <p className="text-sm font-semibold truncate">{game.profiles?.name}</p>
                      <Badge variant="outline" className="rounded-full text-xs shrink-0">
                        {game.host_is_playing ? "🎾 Playing" : "📋 Organizing"}
                      </Badge>
                    </div>
                  </div>
                  {game.profiles?.skill_level && (
                    <SkillBadge level={game.profiles.skill_level as "beginner" | "intermediate" | "advanced"} size="sm" />
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
            </motion.div>
          )}

          {/* Participants Tab */}
          {activeTab === "participants" && (
            <motion.div key="participants" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ParticipantsTab
                isHost={isHost}
                hostIsPlaying={game.host_is_playing}
                hostProfile={game.profiles ? {
                  name: game.profiles.name,
                  avatar_url: game.profiles.avatar_url,
                  skill_level: game.profiles.skill_level as "beginner" | "intermediate" | "advanced" | undefined,
                } : null}
                requests={requests}
                players={players}
                maxPlayers={game.max_players}
                currentUserId={user?.id}
                userRequest={myRequest}
                onAcceptRequest={handleAcceptRequest}
                onRejectRequest={handleRejectRequest}
                loadingAction={actionLoading}
              />
            </motion.div>
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg mb-1">Matches & Scores</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isHost
                    ? "Generate matches or manually assign players once everyone has joined."
                    : "Matches and scores will appear here once the host sets them up."}
                </p>
                {isHost && (
                  <Button variant="outline" disabled>
                    Generate Matches (Coming Soon)
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && canAccessChat && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="h-[calc(100vh-340px)] min-h-[200px] overflow-y-auto mb-4 space-y-3">
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
                            <span className="ml-1.5">{format(new Date(msg.created_at), "h:mm a")}</span>
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
                </div>
                <div className="flex gap-2">
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

      {/* Sticky Join CTA */}
      {user && !isHost && !isPlayer && !myRequest && spotsLeft > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border md:hidden safe-bottom z-40">
          <Button
            variant="hero"
            className="w-full h-12 text-base"
            disabled={joinLoading}
            onClick={() => isOpenJoin ? handleDirectJoin() : setShowJoinModal(true)}
          >
            {joinLoading ? "Joining..." : isOpenJoin ? "Join Game" : "Request to Join"}
          </Button>
        </div>
      )}

      {/* Desktop Join Button */}
      {user && !isHost && !isPlayer && !myRequest && spotsLeft > 0 && (
        <div className="hidden md:block fixed bottom-8 right-8">
          <Button
            variant="hero"
            size="lg"
            className="shadow-xl"
            disabled={joinLoading}
            onClick={() => isOpenJoin ? handleDirectJoin() : setShowJoinModal(true)}
          >
            {joinLoading ? "Joining..." : isOpenJoin ? "Join Game" : "Request to Join"}
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
          onSuccess={fetchMyRequest}
        />
      )}
    </div>
  );
}
