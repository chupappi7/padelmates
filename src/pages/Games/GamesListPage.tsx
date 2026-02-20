import { useState, useEffect, useMemo, Fragment } from "react";
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
import { SkillRangePicker } from "@/components/games/SkillRangePicker";
import { motion } from "framer-motion";
import { Plus, Search, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserLocation, calculateDistance } from "@/hooks/useUserLocation";
import { isSameDay, format, isToday, isTomorrow } from "date-fns";

interface Game {
  id: string;
  title: string;
  location: string;
  location_lat?: number | null;
  location_lng?: number | null;
  date_time: string;
  end_date_time: string | null;
  skill_level: number;
  format: "casual_match" | "americano" | "team_americano";
  max_players: number;
  price_per_player: number;
  payment_mode: string;
  price_mode?: string;
  host_id: string;
  host_is_playing: boolean;
  court_taken_by?: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  game_players: { id: string }[];
  distance?: number;
  interest_count?: number;
}

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillMin, setSkillMin] = useState<number | null>(null);
  const [skillMax, setSkillMax] = useState<number | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [joinedGameIds, setJoinedGameIds] = useState<Set<string>>(new Set());
  const [requestedGameIds, setRequestedGameIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { location: userLocation } = useUserLocation();

  useEffect(() => {
    fetchGames();
    if (user) fetchUserGames();
  }, [user]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select(`
        *,
        game_players(id)
      `)
      .eq("visibility", "public")
      .gte("date_time", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("date_time", { ascending: true });

    if (!error && data) {
      const gamesWithProfiles = await Promise.all(
        data.map(async (game) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", game.host_id)
            .single();

          let interest_count = 0;
          if (game.payment_mode === "court_sharing") {
            const { count } = await supabase
              .from("join_requests")
              .select("id", { count: "exact", head: true })
              .eq("game_id", game.id)
              .eq("status", "pending");
            interest_count = count || 0;
          }

          return { ...game, profiles: profile, interest_count };
        })
      );
      setGames(gamesWithProfiles as Game[]);
    }
    setLoading(false);
  };

  const fetchUserGames = async () => {
    if (!user) return;
    const { data: playerEntries } = await supabase
      .from("game_players")
      .select("game_id")
      .eq("user_id", user.id);
    const ids = new Set<string>();
    playerEntries?.forEach((p) => ids.add(p.game_id));
    setJoinedGameIds(ids);

    const { data: requestEntries } = await supabase
      .from("join_requests")
      .select("game_id")
      .eq("user_id", user.id)
      .eq("status", "pending");
    const reqIds = new Set<string>();
    requestEntries?.forEach((r) => reqIds.add(r.game_id));
    setRequestedGameIds(reqIds);
  };

  const getUserStatus = (game: Game): "joined" | "hosting" | "requested" | "court_secured" | undefined => {
    if (!user) return undefined;
    if (game.host_id === user.id) return "hosting";
    if (game.payment_mode === "court_sharing" && game.court_taken_by === user.id) return "court_secured";
    if (joinedGameIds.has(game.id)) return "joined";
    if (requestedGameIds.has(game.id)) return "requested";
    return undefined;
  };

  const filteredGames = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    let result = games.filter((game) => {
      const gameDate = new Date(game.date_time);
      if (gameDate < cutoff) return false;
      const matchesDay = selectedDate === null || isSameDay(gameDate, selectedDate);
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSkill =
        skillMin === null ||
        (game.skill_level >= skillMin && game.skill_level <= (skillMax ?? skillMin));
      const matchesFormat = formatFilter === "all" || game.format === formatFilter;
      return matchesDay && matchesSearch && matchesSkill && matchesFormat;
    });

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

    result.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

    return result;
  }, [games, selectedDate, searchQuery, skillMin, skillMax, formatFilter, userLocation]);

  const isAllMode = selectedDate === null;

  const setSkillRange = (min: number | null, max: number | null) => {
    setSkillMin(min);
    setSkillMax(max);
  };

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
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "All upcoming"}
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
                skillMin={skillMin}
                skillMax={skillMax}
                setSkillRange={setSkillRange}
                formatFilter={formatFilter}
                setFormatFilter={setFormatFilter}
              />
            ) : (
              <>
                {/* Desktop skill range picker inline */}
                <div className="flex items-center gap-1.5 border border-input rounded-md px-3 h-11 bg-background">
                  <SkillRangePicker
                    min={skillMin}
                    max={skillMax}
                    onChange={setSkillRange}
                  />
                </div>
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
          <div className="space-y-3 sm:space-y-4">
            {(() => {
              let lastGroupKey = "";
              return filteredGames.map((game, index) => {
                const gameDate = new Date(game.date_time);
                const elements: React.ReactNode[] = [];

                if (isAllMode) {
                  const groupKey = format(gameDate, "yyyy-MM-dd HH:mm");
                  if (groupKey !== lastGroupKey) {
                    lastGroupKey = groupKey;
                    let dayLabel: string;
                    if (isToday(gameDate)) dayLabel = "Today";
                    else if (isTomorrow(gameDate)) dayLabel = "Tomorrow";
                    else dayLabel = format(gameDate, "MMM d, yyyy");
                    const timeLabel = format(gameDate, "HH:mm");
                    elements.push(
                      <div key={`datetime-${groupKey}`} className="flex items-center gap-3 pt-4 first:pt-0">
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">{dayLabel}</span>
                        <span className="text-sm font-medium text-primary whitespace-nowrap">{timeLabel}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    );
                  }
                } else {
                  const timeKey = format(gameDate, "HH:mm");
                  if (timeKey !== lastGroupKey) {
                    lastGroupKey = timeKey;
                    elements.push(
                      <div key={`time-${timeKey}`} className="flex items-center gap-3 pt-2 first:pt-0">
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">{timeKey}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    );
                  }
                }

                elements.push(
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
                      endDateTime={game.end_date_time}
                      skillLevel={game.skill_level}
                      format={game.format}
                      maxPlayers={game.max_players}
                      currentPlayers={(game.game_players?.length || 0) + (game.host_is_playing ? 1 : 0)}
                      prefilledCount={Array.isArray((game as any).prefilled_players) ? (game as any).prefilled_players.filter((p: any) => (typeof p === "string" ? p.trim() : p?.name?.trim())).length : 0}
                      pricePerPlayer={Number(game.price_per_player)}
                      hostName={game.profiles?.name || "Unknown"}
                      hostAvatar={game.profiles?.avatar_url || undefined}
                      distance={game.distance}
                      paymentMode={game.payment_mode}
                      priceMode={game.price_mode}
                      userStatus={getUserStatus(game)}
                      courtTakenBy={game.court_taken_by}
                      interestCount={game.interest_count}
                    />
                  </motion.div>
                );

                return elements;
              });
            })()}
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
            <h3 className="font-display text-lg sm:text-xl font-bold mb-2">
              {isAllMode ? "No upcoming matches" : "No matches on this day"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {searchQuery || skillMin !== null || formatFilter !== "all"
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
