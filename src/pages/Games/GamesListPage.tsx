import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GameCard } from "@/components/games/GameCard";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  game_players: { id: string }[];
}

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        game_players(id)
      `)
      .eq("visibility", "public")
      .gte("date_time", new Date().toISOString())
      .order("date_time", { ascending: true });

    if (!error && data) {
      // Fetch profiles separately
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

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill = skillFilter === "all" || game.skill_level === skillFilter;
    const matchesFormat = formatFilter === "all" || game.format === formatFilter;
    return matchesSearch && matchesSkill && matchesFormat;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">Find Games</h1>
              <p className="text-muted-foreground">
                Discover padel games happening near you
              </p>
            </div>
            {user && (
              <Button variant="hero" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host a Game
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={skillFilter} onValueChange={setSkillFilter}>
              <SelectTrigger className="w-full sm:w-40 h-11">
                <SelectValue placeholder="Skill level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11">
                <SelectValue placeholder="Game format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="casual_match">Casual Match</SelectItem>
                <SelectItem value="americano">Americano</SelectItem>
                <SelectItem value="team_americano">Team Americano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GameCard
                  id={game.id}
                  title={game.title}
                  location={game.location}
                  dateTime={game.date_time}
                  skillLevel={game.skill_level}
                  format={game.format}
                  maxPlayers={game.max_players}
                  currentPlayers={game.game_players?.length || 0}
                  pricePerPlayer={Number(game.price_per_player)}
                  hostName={game.profiles?.name || "Unknown"}
                  hostAvatar={game.profiles?.avatar_url || undefined}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">No games found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || skillFilter !== "all" || formatFilter !== "all"
                ? "Try adjusting your filters"
                : "Be the first to host a game!"}
            </p>
            {user && (
              <Button variant="hero" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host a Game
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
