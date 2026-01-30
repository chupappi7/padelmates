import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { JoinStatusBadge, getJoinStatus } from "@/components/games/JoinStatusBadge";
import { JoinRequestModal } from "@/components/games/JoinRequestModal";
import { PaymentUploadCard } from "@/components/games/PaymentUploadCard";
import { HostRequestCard } from "@/components/games/HostRequestCard";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Euro,
  MessageCircle,
  Trophy,
  Clock,
  CreditCard,
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
  price_per_player: number;
  payment_instructions: string | null;
  payment_mode: "pay_to_join" | "confirm_first";
  payment_deadline_hours: number;
  visibility: string;
  host_id: string;
  host_is_playing: boolean;
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

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);

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
    if (user && game && game.host_id === user.id) {
      fetchRequests();
    }
  }, [user, game]);

  const fetchGame = async () => {
    const { data } = await supabase.from("games").select("*").eq("id", id).single();
    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url, skill_level")
        .eq("user_id", data.host_id)
        .single();
      setGame({ 
        ...data, 
        profiles: profile,
        payment_mode: data.payment_mode || "pay_to_join",
        payment_deadline_hours: data.payment_deadline_hours || 48,
        host_is_playing: data.host_is_playing ?? true,
      } as Game);
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("game_players").select("*").eq("game_id", id);
    if (data) {
      const playersWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url, skill_level")
            .eq("user_id", p.user_id)
            .single();
          return { ...p, profiles: profile };
        })
      );
      setPlayers(playersWithProfiles as Player[]);
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("join_requests")
      .select("*")
      .eq("game_id", id)
      .order("created_at", { ascending: false });
    if (data) {
      const requestsWithProfiles = await Promise.all(
        data.map(async (r) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url, skill_level")
            .eq("user_id", r.user_id)
            .single();
          return { ...r, profiles: profile };
        })
      );
      setRequests(requestsWithProfiles as JoinRequest[]);
    }
  };

  const fetchMyRequest = async () => {
    const { data } = await supabase
      .from("join_requests")
      .select("*")
      .eq("game_id", id)
      .eq("user_id", user?.id)
      .maybeSingle();
    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url, skill_level")
        .eq("user_id", data.user_id)
        .single();
      setMyRequest({ ...data, profiles: profile } as JoinRequest);
    } else {
      setMyRequest(null);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("game_messages")
      .select("*")
      .eq("game_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      const messagesWithProfiles = await Promise.all(
        data.map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", m.user_id)
            .single();
          return { ...m, profiles: profile };
        })
      );
      setMessages(messagesWithProfiles as Message[]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return;

    const { error } = await supabase.from("game_messages").insert({
      game_id: id,
      user_id: user.id,
      message: newMessage,
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
    fetchMessages();
  };

  const isHost = user?.id === game?.host_id;
  const isPlayer = players.some((p) => p.user_id === user?.id);
  const hostCount = game?.host_is_playing ? 1 : 0;
  const totalPlayers = players.length + hostCount;
  const spotsLeft = game ? game.max_players - totalPlayers : 0;

  // Get user's join status
  const userJoinStatus = myRequest
    ? getJoinStatus(myRequest.status, myRequest.payment_status, game?.payment_mode || "pay_to_join")
    : null;

  // Should show payment upload (after being accepted, for both payment modes)
  const showPaymentUpload =
    myRequest &&
    myRequest.status === "accepted" &&
    myRequest.payment_status === "pending" &&
    game?.price_per_player > 0;

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

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Navbar />

      <div className="container py-4 md:py-8 max-w-4xl px-3 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/games")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 md:mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Games
          </button>

          {/* Header Card */}
          <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 mb-4">
            {/* Tags Row */}
            <div className="flex flex-wrap gap-1.5 mb-2 md:mb-4">
              <SkillBadge level={game.skill_level} />
              <Badge variant="outline" className="rounded-full text-xs">
                {formatLabels[game.format]}
              </Badge>
              <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1">
                {game.payment_mode === "pay_to_join" ? (
                  <>
                    <CreditCard className="w-3 h-3" />
                    Pay to Join
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    Pay Later
                  </>
                )}
              </Badge>
              {isHost && (
                <Badge className="rounded-full bg-primary/10 text-primary border-0 text-xs">
                  Hosting
                </Badge>
              )}
              {isPlayer && !isHost && (
                <Badge className="rounded-full bg-success/10 text-success border-0 text-xs">
                  Playing
                </Badge>
              )}
            </div>

            <h1 className="font-display text-xl md:text-3xl font-bold mb-2 md:mb-4">
              {game.title}
            </h1>

            {game.description && (
              <p className="text-sm text-muted-foreground mb-3 md:mb-6">{game.description}</p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2.5 md:gap-4 mb-3 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm md:text-base font-medium truncate">{game.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="text-sm md:text-base font-medium truncate">
                    {format(new Date(game.date_time), "EEE, MMM d · h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Players</p>
                  <p className="text-sm md:text-base font-medium">
                    {totalPlayers}/{game.max_players}
                    {spotsLeft > 0 && (
                      <span className="text-success text-xs md:text-sm ml-1">· {spotsLeft} left</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Euro className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-sm md:text-base font-medium">
                    {game.price_per_player > 0 ? `€${game.price_per_player}` : "Free"}
                  </p>
                </div>
              </div>
            </div>

            {/* Host Info */}
            <div className="flex items-center gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src={game.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {game.profiles?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm md:text-base font-semibold truncate">{game.profiles?.name}</p>
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

          {/* Join Status Card */}
          {myRequest && !isPlayer && userJoinStatus && (
            <div className="mb-4">
              <JoinStatusBadge
                status={userJoinStatus}
                paymentDeadline={myRequest.payment_due_at ? new Date(myRequest.payment_due_at) : undefined}
              />
            </div>
          )}

          {/* Payment Upload Card for Confirm First mode */}
          {showPaymentUpload && game && (
            <div className="mb-4">
              <PaymentUploadCard
                requestId={myRequest!.id}
                userId={user!.id}
                pricePerPlayer={game.price_per_player}
                paymentInstructions={game.payment_instructions}
                paymentDueAt={myRequest!.payment_due_at}
                onSuccess={fetchMyRequest}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="players" className="mt-4 md:mt-6">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto overflow-x-auto">
              <TabsTrigger
                value="players"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-3 py-2"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Players ({players.length})
              </TabsTrigger>
              {(isHost || isPlayer) && (
                <TabsTrigger
                  value="chat"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-3 py-2"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Chat
                </TabsTrigger>
              )}
              {isHost && (
                <TabsTrigger
                  value="requests"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-3 py-2"
                >
                  Requests ({requests.filter((r) => r.status === "pending").length})
                </TabsTrigger>
              )}
              <TabsTrigger
                value="scoreboard"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-3 py-2"
              >
                <Trophy className="w-3.5 h-3.5" />
              </TabsTrigger>
            </TabsList>

            {/* Players Tab */}
            <TabsContent value="players" className="pt-4 md:pt-6">
              <div className="space-y-2">
                {/* Host as player (if playing) */}
                {game.host_is_playing && game.profiles && (
                  <div className="flex items-center gap-2.5 p-2.5 md:p-3 bg-card border border-border rounded-lg">
                    <Avatar className="h-9 w-9 md:h-10 md:w-10">
                      <AvatarImage src={game.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {game.profiles.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{game.profiles.name}</p>
                        <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
                          Host
                        </Badge>
                      </div>
                      {game.profiles.skill_level && (
                        <SkillBadge level={game.profiles.skill_level as "beginner" | "intermediate" | "advanced"} size="sm" />
                      )}
                    </div>
                  </div>
                )}

                {/* Other players */}
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2.5 p-2.5 md:p-3 bg-card border border-border rounded-lg"
                  >
                    <Avatar className="h-9 w-9 md:h-10 md:w-10">
                      <AvatarImage src={player.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {player.profiles?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.profiles?.name}</p>
                      {player.profiles?.skill_level && (
                        <SkillBadge level={player.profiles.skill_level} size="sm" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {!game.host_is_playing && players.length === 0 && (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    No players have joined yet. Be the first!
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="pt-4 md:pt-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="h-64 overflow-y-auto mb-4 space-y-3">
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {msg.profiles?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            <span className="font-semibold">{msg.profiles?.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {format(new Date(msg.created_at), "h:mm a")}
                            </span>
                          </p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8 text-sm">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="text-sm"
                  />
                  <Button onClick={handleSendMessage} size="sm">
                    Send
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Requests Tab (Host Only) */}
            <TabsContent value="requests" className="pt-4 md:pt-6">
              {requests.length > 0 ? (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <HostRequestCard
                      key={request.id}
                      request={request}
                      gameId={game.id}
                      paymentMode={game.payment_mode}
                      onUpdate={() => {
                        fetchRequests();
                        fetchPlayers();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  No join requests yet
                </p>
              )}
            </TabsContent>

            {/* Scoreboard Tab */}
            <TabsContent value="scoreboard" className="pt-4 md:pt-6">
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg mb-1">Scoreboard</h3>
                <p className="text-sm text-muted-foreground">
                  Scores will be added after the game
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Sticky Join CTA */}
      {user && !isHost && !isPlayer && !myRequest && spotsLeft > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border md:hidden safe-bottom">
          <Button
            variant="hero"
            className="w-full h-12 text-base"
            onClick={() => setShowJoinModal(true)}
          >
            Request to Join · €{game.price_per_player > 0 ? game.price_per_player : "Free"}
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
            onClick={() => setShowJoinModal(true)}
          >
            Request to Join
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
          paymentMode={game.payment_mode}
          pricePerPlayer={game.price_per_player}
          paymentInstructions={game.payment_instructions}
          paymentDeadlineHours={game.payment_deadline_hours}
          onSuccess={fetchMyRequest}
        />
      )}
    </div>
  );
}
