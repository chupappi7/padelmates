import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { GameCard } from "@/components/games/GameCard";
import { motion } from "framer-motion";
import { Calendar, Trophy, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";

interface Game {
  id: string;
  title: string;
  location: string;
  date_time: string;
  end_date_time: string | null;
  skill_level: number;
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  price_per_player: number;
  host_id: string;
  host_is_playing: boolean;
  payment_mode: string;
  price_mode: string;
  court_taken_by: string | null;
  club_id?: string | null;
  profiles: { name: string; avatar_url: string | null } | null;
  club?: { name: string; logo_url: string | null } | null;
  game_players: { id: string }[];
}

export default function MyMatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [listings, setListings] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchAll();
  }, [user]);

  const enrichWithProfiles = async (data: any[]): Promise<Game[]> => {
    if (!data.length) return [];
    const hostIds = [...new Set(data.map((g) => g.host_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", hostIds);
    const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
    profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });

    // Fetch clubs
    const clubIds = [...new Set(data.filter((g) => g.club_id).map((g) => g.club_id!))];
    const clubMap: Record<string, { name: string; logo_url: string | null }> = {};
    if (clubIds.length > 0) {
      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .in("id", clubIds);
      clubs?.forEach((c) => { clubMap[c.id] = { name: c.name, logo_url: c.logo_url }; });
    }

    return data.map((game) => ({
      ...game,
      profiles: profileMap[game.host_id] || null,
      club: game.club_id ? clubMap[game.club_id] || null : null,
    })) as Game[];
  };

  const fetchAll = async () => {
    if (!user) return;

    // --- Fetch Listings (court_sharing hosted by user) ---
    const listingsPromise = supabase
      .from("games")
      .select("*, game_players(id)")
      .eq("host_id", user.id)
      .eq("payment_mode", "court_sharing")
      .order("date_time", { ascending: true });

    // --- Fetch Matches (everything else user is involved in) ---
    const [playerEntries, acceptedRequests, hostedGames, courtSecuredGames, listingsResult] = await Promise.all([
      supabase.from("game_players").select("game_id").eq("user_id", user.id),
      supabase.from("join_requests").select("game_id").eq("user_id", user.id).eq("status", "accepted"),
      supabase.from("games").select("id").eq("host_id", user.id).neq("payment_mode", "court_sharing"),
      supabase.from("games").select("id").eq("payment_mode", "court_sharing").eq("court_taken_by", user.id),
      listingsPromise,
    ]);

    // Listings
    if (listingsResult.data) {
      setListings(await enrichWithProfiles(listingsResult.data));
    }

    // Matches — collect game IDs, exclude court_sharing hosted games
    const listingIds = new Set((listingsResult.data || []).map((g) => g.id));
    const gameIds = new Set<string>();
    playerEntries.data?.forEach((p) => { if (!listingIds.has(p.game_id)) gameIds.add(p.game_id); });
    acceptedRequests.data?.forEach((r) => { if (!listingIds.has(r.game_id)) gameIds.add(r.game_id); });
    hostedGames.data?.forEach((g) => gameIds.add(g.id));
    courtSecuredGames.data?.forEach((g) => gameIds.add(g.id));

    if (gameIds.size === 0) {
      setGames([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("games")
      .select("*, game_players(id)")
      .in("id", Array.from(gameIds))
      .order("date_time", { ascending: true });

    if (!error && data) setGames(await enrichWithProfiles(data));
    setLoading(false);
  };

  const now = new Date();
  const upcoming = games.filter((g) => new Date(g.date_time) >= now);
  const past = games.filter((g) => new Date(g.date_time) < now).reverse();
  const activeListings = listings.filter((g) => new Date(g.date_time) >= now);
  const expiredListings = listings.filter((g) => new Date(g.date_time) < now).reverse();

  const getUserStatus = (game: Game): "joined" | "hosting" | "court_secured" => {
    if (game.host_id === user?.id) return "hosting";
    if (game.payment_mode === "court_sharing" && game.court_taken_by === user?.id) return "court_secured";
    return "joined";
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d, yyyy");
  };

  const groupByDate = (list: Game[]) => {
    const groups: { label: string; games: Game[] }[] = [];
    let currentLabel = "";
    for (const game of list) {
      const label = getDateLabel(game.date_time);
      if (label !== currentLabel) { currentLabel = label; groups.push({ label, games: [game] }); }
      else groups[groups.length - 1].games.push(game);
    }
    return groups;
  };

  const renderGameGrid = (list: Game[], statusOverride?: "hosting") =>
    groupByDate(list).map((group) => (
      <div key={group.label}>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{group.label}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {group.games.map((game, index) => (
            <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.15) }}>
              <GameCard
                id={game.id}
                title={game.title}
                location={game.location}
                dateTime={game.date_time}
                endDateTime={game.end_date_time}
                skillLevel={game.skill_level}
                format={game.format}
                maxPlayers={game.max_players}
                currentPlayers={(game.game_players?.length || 0) + (game.host_is_playing ? 1 : 0)}
                prefilledCount={Array.isArray((game as any).prefilled_players) ? (game as any).prefilled_players.filter((p: any) => (typeof p === "string" ? p.trim() : p?.name?.trim())).length : 0}
                pricePerPlayer={Number(game.price_per_player)}
                hostName={game.profiles?.name || "Unknown"}
                hostAvatar={game.profiles?.avatar_url || undefined}
                clubName={game.club?.name}
                clubLogo={game.club?.logo_url || undefined}
                clubId={game.club_id || undefined}
                paymentMode={game.payment_mode}
                priceMode={game.price_mode}
                courtTakenBy={game.court_taken_by}
                userStatus={statusOverride ?? getUserStatus(game)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="container py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">My Matches</h1>
          <p className="text-sm text-muted-foreground">Your matches and court listings</p>
        </motion.div>

        <Tabs defaultValue="upcoming" className="mt-4">
          <TabsList className="w-full grid grid-cols-3 h-12">
            <TabsTrigger value="upcoming" className="text-sm">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past" className="text-sm">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="listings" className="text-sm">Listings ({listings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="bg-card rounded-2xl h-40 animate-pulse" />)}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="space-y-4">{renderGameGrid(upcoming)}</div>
            ) : (
              <EmptyState icon={Calendar} message="No upcoming matches" sub="Join or host a game to see it here" />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {past.length > 0 ? (
              <div className="space-y-4">{renderGameGrid(past)}</div>
            ) : (
              <EmptyState icon={Trophy} message="No past matches" sub="Your match history will appear here" />
            )}
          </TabsContent>

          <TabsContent value="listings" className="mt-4">
            {listings.length === 0 ? (
              <EmptyState icon={Tag} message="No court listings" sub="Post a court to sell or give it away" />
            ) : (
              <div className="space-y-6">
                {activeListings.length > 0 && (
                  <div className="space-y-4">
                    {expiredListings.length > 0 && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Active</p>
                    )}
                    {renderGameGrid(activeListings, "hosting")}
                  </div>
                )}
                {expiredListings.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Expired</p>
                    {renderGameGrid(expiredListings, "hosting")}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: typeof Calendar; message: string; sub: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg font-bold mb-1">{message}</h3>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
