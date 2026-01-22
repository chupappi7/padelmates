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
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { MobileFilterSheet } from "@/components/games/MobileFilterSheet";
import { GameTimeGroup } from "@/components/games/GameTimeGroup";
import { motion } from "framer-motion";
import { Plus, Search, Calendar, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserLocation, calculateDistance } from "@/hooks/useUserLocation";
import { format } from "date-fns";

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
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  game_players: { id: string }[];
  distance?: number;
}

type SortOption = "time" | "nearest";

function getTimeSlotKey(dateTime: string): string {
  return format(new Date(dateTime), "yyyy-MM-dd HH:mm");
}

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("time");
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

  // Calculate distances and sort games
  const sortedAndFilteredGames = useMemo(() => {
    let result = games.filter((game) => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill = skillFilter === "all" || game.skill_level === skillFilter;
      const matchesFormat = formatFilter === "all" || game.format === formatFilter;
      return matchesSearch && matchesSkill && matchesFormat;
    });

    // Add distance to games if user location is available
    if (userLocation) {
      result = result.map((game) => {
        // For demo, we'll use a random distance if no coords
        // In production, you'd geocode the location string
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

    // Sort based on selected option
    if (sortBy === "nearest" && userLocation) {
      result.sort((a, b) => {
        if (a.distance === undefined && b.distance === undefined) return 0;
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    } else {
      // Default: sort by time (already sorted from API, but ensure it)
      result.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
    }

    return result;
  }, [games, searchQuery, skillFilter, formatFilter, sortBy, userLocation]);

  // Group games by time slot for display
  const groupedGames = useMemo(() => {
    if (sortBy === "nearest") {
      // Don't group when sorting by distance
      return [{ key: "all", games: sortedAndFilteredGames }];
    }

    const groups: { key: string; dateTime: string; games: Game[] }[] = [];
    let currentKey = "";

    for (const game of sortedAndFilteredGames) {
      const slotKey = getTimeSlotKey(game.date_time);
      if (slotKey !== currentKey) {
        currentKey = slotKey;
        groups.push({ key: slotKey, dateTime: game.date_time, games: [game] });
      } else {
        groups[groups.length - 1].games.push(game);
      }
    }

    return groups;
  }, [sortedAndFilteredGames, sortBy]);

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

          {/* Sort selector */}
          <div className="flex items-center gap-2 mt-3">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">By Time</SelectItem>
                <SelectItem value="nearest">Nearest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-40 sm:h-44 animate-pulse" />
            ))}
          </div>
        ) : sortedAndFilteredGames.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {groupedGames.map((group) => (
              <>
                {group.dateTime && sortBy === "time" && (
                  <GameTimeGroup key={`header-${group.key}`} dateTime={group.dateTime} />
                )}
                {group.games.map((game, index) => (
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
                      currentPlayers={game.game_players?.length || 0}
                      pricePerPlayer={Number(game.price_per_player)}
                      hostName={game.profiles?.name || "Unknown"}
                      hostAvatar={game.profiles?.avatar_url || undefined}
                      distance={game.distance}
                    />
                  </motion.div>
                ))}
              </>
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
