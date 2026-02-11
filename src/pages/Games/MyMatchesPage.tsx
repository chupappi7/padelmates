import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { GameCard } from "@/components/games/GameCard";
import { motion } from "framer-motion";
import { Calendar, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Game {
  id: string;
  title: string;
  location: string;
  date_time: string;
  skill_level: "beginner" | "intermediate" | "advanced";
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  price_per_player: number;
  host_id: string;
  host_is_playing: boolean;
  profiles: { name: string; avatar_url: string | null } | null;
  game_players: { id: string }[];
}

export default function MyMatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchMyGames();
  }, [user]);

  const fetchMyGames = async () => {
    if (!user) return;

    // Get games where user is a player
    const { data: playerEntries } = await supabase
      .from("game_players")
      .select("game_id")
      .eq("user_id", user.id);

    // Get games where user has an accepted request
    const { data: acceptedRequests } = await supabase
      .from("join_requests")
      .select("game_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    // Get games where user is the host
    const { data: hostedGames } = await supabase
      .from("games")
      .select("id")
      .eq("host_id", user.id);

    const gameIds = new Set<string>();
    playerEntries?.forEach((p) => gameIds.add(p.game_id));
    acceptedRequests?.forEach((r) => gameIds.add(r.game_id));
    hostedGames?.forEach((g) => gameIds.add(g.id));

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

    if (!error && data) {
      const gamesWithProfiles = await Promise.all(
        data.map(async (game) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", game.host_id)
            .single();
          return { ...game, profiles: profile };
        })
      );
      setGames(gamesWithProfiles as Game[]);
    }
    setLoading(false);
  };

  const now = new Date();
  const upcoming = games.filter((g) => new Date(g.date_time) >= now);
  const past = games.filter((g) => new Date(g.date_time) < now);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <div className="container py-4 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">My Matches</h1>
          <p className="text-sm text-muted-foreground">Games you've joined or hosted</p>
        </motion.div>

        <Tabs defaultValue="upcoming" className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-2xl h-40 animate-pulse" />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.15) }}
                  >
                    <GameCard
                      id={game.id}
                      title={game.title}
                      location={game.location}
                      dateTime={game.date_time}
                      skillLevel={game.skill_level}
                      format={game.format}
                      maxPlayers={game.max_players}
                      currentPlayers={(game.game_players?.length || 0) + (game.host_is_playing ? 1 : 0)}
                      pricePerPlayer={Number(game.price_per_player)}
                      hostName={game.profiles?.name || "Unknown"}
                      hostAvatar={game.profiles?.avatar_url || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Calendar} message="No upcoming matches" sub="Join or host a game to see it here" />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {past.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {past.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.15) }}
                  >
                    <GameCard
                      id={game.id}
                      title={game.title}
                      location={game.location}
                      dateTime={game.date_time}
                      skillLevel={game.skill_level}
                      format={game.format}
                      maxPlayers={game.max_players}
                      currentPlayers={(game.game_players?.length || 0) + (game.host_is_playing ? 1 : 0)}
                      pricePerPlayer={Number(game.price_per_player)}
                      hostName={game.profiles?.name || "Unknown"}
                      hostAvatar={game.profiles?.avatar_url || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Trophy} message="No past matches" sub="Your match history will appear here" />
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
