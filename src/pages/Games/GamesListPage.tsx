import { useState, useEffect, useMemo } from "react";
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
import { DayPicker } from "@/components/games/DayPicker";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { MobileFilterSheet } from "@/components/games/MobileFilterSheet";
import { motion } from "framer-motion";
import { Plus, Search, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserLocation, calculateDistance } from "@/hooks/useUserLocation";
import { isSameDay, format, startOfDay, endOfDay } from "date-fns";

interface Game {
  id: string;
  title: string;
  location: string;
  location_lat?: number | null;
  location_lng?: number | null;
  date_time: string;
  skill_level: "beginner" | "intermediate" | "advanced";
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  price_per_player: number;
  host_id: string;
  host_is_playing: boolean;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  game_players: { id: string }[];
  distance?: number;
}

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { location: userLocation } = useUserLocation();

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

  const filteredGames = useMemo(() => {
    let result = games.filter((game) => {
      const gameDate = new Date(game.date_time);
      const matchesDay = isSameDay(gameDate, selectedDate);
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = skillFilter === "all" || game.skill_level === skillFilter;
      const matchesFormat = formatFilter === "all" || game.format === formatFilter;
      return matchesDay && matchesSearch && matchesSkill && matchesFormat;
    });

    // Add distance if available
    if (userLocation) {
      result = result.map((game) => {
        const distance = game.location_lat && game.location_lng
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              game.location_lat,
              game.location_lng
            )
          : null;
        return { ...game, distance: distance ?? undefined };
      });
    }

    // Sort by time within the day
    result.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

    return result;
  }, [games, selectedDate, searchQuery, skillFilter, formatFilter, userLocation]);

  // Count games per selected day for empty state
  const gamesOnDay = games.filter((g) => isSameDay(new Date(g.date_time), selectedDate)).length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />

      <div className="container py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mb-0.5">Matches</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, MMMM d")}
              </p>
            </div>
            {user && !isMobile && (
              <Button variant="hero" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host a Game
              </Button>
            )}
          </div>

          {/* Day Picker */}
          <DayPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          {/* Search + Filters */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-40 sm:h-44 animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.15) }}
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
                  distance={game.distance}
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
            <h3 className="font-display text-lg sm:text-xl font-bold mb-2">No matches on this day</h3>
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

    </div>
  );
}
