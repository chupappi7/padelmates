import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
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
  Upload,
  Check,
  X,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  visibility: string;
  host_id: string;
  scoreboard: unknown;
  profiles: { name: string; avatar_url: string | null } | null;
}

interface Player {
  id: string;
  user_id: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  note: string | null;
  payment_screenshot_url: string | null;
  profiles: { name: string; avatar_url: string | null } | null;
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
  const [joinNote, setJoinNote] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGame();
      fetchPlayers();
      fetchMessages();
      if (user) {
        fetchMyRequest();
        fetchRequests();
      }
    }
  }, [id, user]);

  const fetchGame = async () => {
    const { data } = await supabase.from("games").select("*").eq("id", id).single();
    if (data) {
      const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", data.host_id).single();
      setGame({ ...data, profiles: profile } as Game);
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from("game_players").select("*").eq("game_id", id);
    if (data) {
      const playersWithProfiles = await Promise.all(
        data.map(async (p) => {
          const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", p.user_id).single();
          return { ...p, profiles: profile };
        })
      );
      setPlayers(playersWithProfiles as Player[]);
    }
  };

  const fetchRequests = async () => {
    if (!game || game.host_id !== user?.id) return;
    const { data } = await supabase.from("join_requests").select("*").eq("game_id", id).order("created_at", { ascending: false });
    if (data) {
      const requestsWithProfiles = await Promise.all(
        data.map(async (r) => {
          const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", r.user_id).single();
          return { ...r, profiles: profile };
        })
      );
      setRequests(requestsWithProfiles as JoinRequest[]);
    }
  };

  const fetchMyRequest = async () => {
    const { data } = await supabase.from("join_requests").select("*").eq("game_id", id).eq("user_id", user?.id).maybeSingle();
    if (data) {
      const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", data.user_id).single();
      setMyRequest({ ...data, profiles: profile } as JoinRequest);
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

  const handleJoinRequest = async (screenshotUrl?: string) => {
    if (!user || !id) return;
    
    const { error } = await supabase.from("join_requests").insert({
      game_id: id,
      user_id: user.id,
      note: joinNote,
      payment_screenshot_url: screenshotUrl,
    });

    if (error) {
      toast.error("Failed to send join request");
      return;
    }

    toast.success("Join request sent!");
    setShowJoinModal(false);
    fetchMyRequest();
  };

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload screenshot");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("payment-screenshots")
      .getPublicUrl(fileName);

    await handleJoinRequest(publicUrl);
    setUploading(false);
  };

  const handleRequestAction = async (requestId: string, userId: string, action: "accepted" | "rejected") => {
    if (!id) return;

    const { error } = await supabase
      .from("join_requests")
      .update({ status: action })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update request");
      return;
    }

    if (action === "accepted") {
      await supabase.from("game_players").insert({
        game_id: id,
        user_id: userId,
      });
    }

    toast.success(action === "accepted" ? "Player accepted!" : "Request rejected");
    fetchRequests();
    fetchPlayers();
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
  const spotsLeft = game ? game.max_players - players.length : 0;

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
    <div className="min-h-screen bg-background">
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

          {/* Header */}
          <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-wrap gap-1.5 mb-2 md:mb-4">
              <SkillBadge level={game.skill_level} />
              <Badge variant="outline" className="rounded-full text-xs">
                {formatLabels[game.format]}
              </Badge>
              {isHost && (
                <Badge className="rounded-full bg-primary/10 text-primary border-0 text-xs">
                  You're hosting
                </Badge>
              )}
              {isPlayer && !isHost && (
                <Badge className="rounded-full bg-success/10 text-success border-0 text-xs">
                  You're playing
                </Badge>
              )}
            </div>

            <h1 className="font-display text-xl md:text-3xl font-bold mb-2 md:mb-4">
              {game.title}
            </h1>

            {game.description && (
              <p className="text-sm text-muted-foreground mb-3 md:mb-6">{game.description}</p>
            )}

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
                    {players.length}/{game.max_players}
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

            <div className="flex items-center gap-2 md:gap-3 pt-3 md:pt-4 border-t border-border">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src={game.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {game.profiles?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <p className="text-sm md:text-base font-semibold">{game.profiles?.name}</p>
              </div>
            </div>
          </div>

          {/* Join Request Status */}
          {myRequest && !isPlayer && !isHost && (
            <div className="bg-card border border-border rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                {myRequest.status === "pending" && (
                  <>
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                    <span className="text-sm md:text-base font-medium">Your request is pending review</span>
                  </>
                )}
                {myRequest.status === "rejected" && (
                  <>
                    <X className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                    <span className="text-sm md:text-base font-medium">Your request was declined</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Join Button */}
          {user && !isHost && !isPlayer && !myRequest && spotsLeft > 0 && (
            <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
              {!showJoinModal ? (
                <Button variant="hero" className="w-full" onClick={() => setShowJoinModal(true)}>
                  Request to Join
                </Button>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  <h3 className="font-display font-bold text-base md:text-lg">Request to Join</h3>
                  
                  {game.payment_instructions && (
                    <div className="p-3 md:p-4 bg-muted rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm font-medium mb-1">Payment Instructions</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{game.payment_instructions}</p>
                    </div>
                  )}

                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-sm">Add a note (optional)</Label>
                    <Textarea
                      placeholder="Introduce yourself..."
                      value={joinNote}
                      onChange={(e) => setJoinNote(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  {game.price_per_player > 0 && (
                    <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-sm">Upload payment screenshot</Label>
                      <div className="border-2 border-dashed border-border rounded-lg md:rounded-xl p-4 md:p-6 text-center">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadScreenshot}
                          className="hidden"
                          id="screenshot"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="screenshot"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground mb-1.5" />
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {uploading ? "Uploading..." : "Click to upload"}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 md:gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowJoinModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="hero"
                      className="flex-1"
                      onClick={() => handleJoinRequest()}
                      disabled={uploading}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              )}
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

            <TabsContent value="players" className="pt-4 md:pt-6">
              {players.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-2 md:gap-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-card border border-border rounded-lg md:rounded-xl"
                    >
                      <Avatar>
                        <AvatarImage src={player.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {player.profiles?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{player.profiles?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No players have joined yet
                </p>
              )}
            </TabsContent>

            <TabsContent value="chat" className="pt-6">
              <div className="bg-card border border-border rounded-2xl p-4">
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
                    <p className="text-muted-foreground text-center py-8">
                      No messages yet
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>Send</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="pt-6">
              {requests.filter((r) => r.status === "pending").length > 0 ? (
                <div className="space-y-3">
                  {requests
                    .filter((r) => r.status === "pending")
                    .map((request) => (
                      <div
                        key={request.id}
                        className="bg-card border border-border rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {request.profiles?.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.profiles?.name}</p>
                              {request.note && (
                                <p className="text-sm text-muted-foreground">{request.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRequestAction(request.id, request.user_id, "rejected")
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() =>
                                handleRequestAction(request.id, request.user_id, "accepted")
                              }
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {request.payment_screenshot_url && (
                          <div className="mt-3">
                            <a
                              href={request.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View payment screenshot
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No pending requests
                </p>
              )}
            </TabsContent>

            <TabsContent value="scoreboard" className="pt-6">
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Scoreboard</h3>
                <p className="text-muted-foreground">
                  Scores will be added after the game
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
