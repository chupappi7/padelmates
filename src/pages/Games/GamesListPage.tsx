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
import { MobileFilterSheet } from "@/components/games/MobileFilterSheet";
import { motion } from "framer-motion";
import { Plus, Search, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <Navbar />

      <div className="container py-5 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Find Games</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Discover padel games near you
              </p>
            </div>
            {user && !isMobile && (
              <Button variant="hero" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host a Game
              </Button>
            )}
          </div>

          {/* Filters - Mobile optimized */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            
            {/* Mobile: Filter sheet, Desktop: Inline selects */}
            {isMobile ? (
              <MobileFilterSheet
                skillFilter={skillFilter}
                setSkillFilter={setSkillFilter}
                formatFilter={formatFilter}
                setFormatFilter={setFormatFilter}
              />
            ) : (
              <>
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger className="w-40 h-11">
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
                  <SelectTrigger className="w-44 h-11">
                    <SelectValue placeholder="Game format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="casual_match">Casual Match</SelectItem>
                    <SelectItem value="americano">Americano</SelectItem>
                    <SelectItem value="team_americano">Team Americano</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-56 sm:h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.2) }}
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
            className="text-center py-12 sm:py-16"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold mb-2">No games found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {searchQuery || skillFilter !== "all" || formatFilter !== "all"
                ? "Try adjusting your filters"
                : "Be the first to host a game!"}
            </p>
            {user && !isMobile && (
              <Button variant="hero" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host a Game
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Mobile sticky CTA */}
      {user && isMobile && (
        <div className="sticky-cta">
          <Button 
            variant="hero" 
            className="w-full h-12"
            onClick={() => navigate("/games/create")}
          >
            <Plus className="w-5 h-5" />
            Host a Game
          </Button>
        </div>
      )}
    </div>
  );
}
