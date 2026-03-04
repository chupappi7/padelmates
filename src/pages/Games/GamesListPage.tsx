import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
import { SkillRangePicker } from "@/components/games/SkillRangePicker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Calendar, Plus, Users, Gamepad2, Signal, Building2 } from "lucide-react";
import { HostTypeModal } from "@/components/games/HostTypeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserLocation, calculateDistance } from "@/hooks/useUserLocation";
import { isSameDay, format, isToday, isTomorrow, differenceInMinutes } from "date-fns";

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
  club_id?: string | null;
  court_taken_by?: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  club?: { name: string; logo_url: string | null } | null;
  game_players: { id: string }[];
  distance?: number;
  interest_count?: number;
}

export default function GamesListPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [skillMin, setSkillMin] = useState<number | null>(null);
  const [skillMax, setSkillMax] = useState<number | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [joinedGameIds, setJoinedGameIds] = useState<Set<string>>(new Set());
  const [requestedGameIds, setRequestedGameIds] = useState<Set<string>>(new Set());
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [userClubs, setUserClubs] = useState<{ id: string; name: string; logo_url: string | null }[]>([]);
  const [friendsJoining, setFriendsJoining] = useState(false);
  const [friendJoinedGameIds, setFriendJoinedGameIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { location: userLocation } = useUserLocation();
  const [showHostModal, setShowHostModal] = useState(false);

  useEffect(() => {
    fetchGames();
    if (user) {
      fetchUserGames();
      fetchUserClubs();
      fetchFriendJoinedGames();
    }
  }, [user]);

  const fetchUserClubs = async () => {
    if (!user) return;
    const { data: follows } = await supabase
      .from("club_followers")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (!follows || follows.length === 0) { setUserClubs([]); return; }
    const clubIds = follows.map((f) => f.club_id);
    const { data: clubs } = await supabase
      .from("clubs")
      .select("id, name, logo_url")
      .in("id", clubIds);
    setUserClubs(clubs?.map((c) => ({ id: c.id, name: c.name, logo_url: c.logo_url })) || []);
  };

  const fetchFriendJoinedGames = async () => {
    if (!user) return;
    // Get accepted friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");
    if (!friendships || friendships.length === 0) { setFriendJoinedGameIds(new Set()); return; }
    const friendIds = friendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    // Get games friends have joined
    const { data: friendPlayers } = await supabase
      .from("game_players")
      .select("game_id")
      .in("user_id", friendIds);
    const ids = new Set<string>();
    friendPlayers?.forEach(p => ids.add(p.game_id));
    setFriendJoinedGameIds(ids);
  };

  const fetchGames = async () => {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Fetch public games
    const { data: publicData, error: publicError } = await supabase
      .from("games")
      .select(`*, game_players(id)`)
      .eq("visibility", "public")
      .gte("date_time", cutoffTime)
      .order("date_time", { ascending: true });

    let allGames = publicData || [];

    // If user is logged in, also fetch club_only games for clubs they follow
    if (user) {
      const { data: followedClubs } = await supabase
        .from("club_followers")
        .select("club_id")
        .eq("user_id", user.id);

      const { data: ownedClubs } = await supabase
        .from("clubs")
        .select("id")
        .eq("owner_id", user.id);

      const clubIds = new Set<string>();
      followedClubs?.forEach((f) => clubIds.add(f.club_id));
      ownedClubs?.forEach((c) => clubIds.add(c.id));

      if (clubIds.size > 0) {
        const { data: clubGames } = await supabase
          .from("games")
          .select(`*, game_players(id)`)
          .eq("visibility", "club_only")
          .in("club_id", Array.from(clubIds))
          .gte("date_time", cutoffTime)
          .order("date_time", { ascending: true });

        if (clubGames) {
          // Merge, avoiding duplicates
          const existingIds = new Set(allGames.map((g) => g.id));
          clubGames.forEach((g) => {
            if (!existingIds.has(g.id)) allGames.push(g);
          });
        }
      }
    }

    if (!publicError && allGames.length > 0) {
      // Batch-fetch all host profiles
      const hostIds = [...new Set(allGames.map((g) => g.host_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", hostIds);
      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });

      // Batch-fetch all clubs
      const clubIds = [...new Set(allGames.filter((g) => g.club_id).map((g) => g.club_id!))];
      const clubMap: Record<string, { name: string; logo_url: string | null }> = {};
      if (clubIds.length > 0) {
        const { data: clubs } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .in("id", clubIds);
        clubs?.forEach((c) => { clubMap[c.id] = { name: c.name, logo_url: c.logo_url }; });
      }

      // Batch-fetch interest counts for court_sharing games
      const courtSharingIds = allGames
        .filter((g) => g.payment_mode === "court_sharing")
        .map((g) => g.id);
      const interestMap: Record<string, number> = {};
      if (courtSharingIds.length > 0) {
        const { data: interests } = await supabase
          .from("join_requests")
          .select("game_id")
          .in("game_id", courtSharingIds)
          .eq("status", "pending");
        interests?.forEach((r) => {
          interestMap[r.game_id] = (interestMap[r.game_id] || 0) + 1;
        });
      }

      const gamesWithProfiles = allGames.map((game) => ({
        ...game,
        profiles: profileMap[game.host_id] || null,
        club: game.club_id ? clubMap[game.club_id] || null : null,
        interest_count: interestMap[game.id] || 0,
      }));
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
    const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
    let result = games.filter((game) => {
      const gameDate = new Date(game.date_time);
      if (gameDate < cutoff) return false;
      const matchesDay = selectedDate === null || isSameDay(gameDate, selectedDate);
      const matchesSkill =
        skillMin === null ||
        (game.skill_level >= skillMin && game.skill_level <= (skillMax ?? skillMin));
      const matchesFormat =
        formatFilter === "all" ||
        (formatFilter === "court" && game.payment_mode === "court_sharing") ||
        (formatFilter === "backup" && game.payment_mode === "spot_selling") ||
        (formatFilter === "casual_match" && game.format === "casual_match" && game.payment_mode !== "court_sharing" && game.payment_mode !== "spot_selling") ||
        (formatFilter === "americano" && (game.format === "americano" || game.format === "team_americano"));
      const matchesClub =
        clubFilter === "all" || game.club_id === clubFilter;
      const matchesFriends =
        !friendsJoining || friendJoinedGameIds.has(game.id);
      return matchesDay && matchesSkill && matchesFormat && matchesClub && matchesFriends;
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
  }, [games, selectedDate, skillMin, skillMax, formatFilter, clubFilter, friendsJoining, friendJoinedGameIds, userLocation]);

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
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mb-0.5">Matches</h1>
              <p className="text-sm text-muted-foreground">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "All upcoming"}
              </p>
            </div>
            {user && !isMobile && (
              <Button
                variant="hero"
                size="sm"
                onClick={() => setShowHostModal(true)}
              >
                <Plus className="w-4 h-4" />
                Host
              </Button>
            )}
          </div>

          {/* Day Picker */}
          <DayPicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="h-9 rounded-full text-xs px-3 [&>svg.lucide-chevrons-up-down]:hidden">
                  <div className="flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                    <SelectValue placeholder="Type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="casual_match">Match</SelectItem>
                  <SelectItem value="americano">Americano</SelectItem>
                  <SelectItem value="court">Court</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={skillMin !== null ? String(skillMin) : "all"}
                onValueChange={(val) => {
                  if (val === "all") setSkillRange(null, null);
                  else { const n = Number(val); setSkillRange(n, n); }
                }}
              >
                <SelectTrigger className="h-9 rounded-full text-xs px-3 [&>svg.lucide-chevrons-up-down]:hidden">
                  <div className="flex items-center gap-1.5">
                    <Signal className="w-3.5 h-3.5 shrink-0" />
                    <SelectValue placeholder="Level" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="4">A</SelectItem>
                  <SelectItem value="3">B</SelectItem>
                  <SelectItem value="2">C</SelectItem>
                  <SelectItem value="1">D</SelectItem>
                </SelectContent>
              </Select>
              {user && (
                userClubs.length > 0 ? (
                  <Select value={clubFilter} onValueChange={setClubFilter}>
                    <SelectTrigger className="h-9 rounded-full text-xs px-3 [&>svg.lucide-chevrons-up-down]:hidden">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <SelectValue placeholder="Club" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All Clubs</SelectItem>
                      {userClubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Button
                    variant="outline"
                    className="h-9 rounded-full text-xs px-3 opacity-50 cursor-not-allowed justify-start"
                    disabled
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                    Club
                  </Button>
                )
              )}
              {user && (
                <Button
                  variant={friendsJoining ? "default" : "outline"}
                  className={cn("h-9 rounded-full text-xs px-3 justify-start", friendsJoining && "bg-primary text-primary-foreground")}
                  onClick={() => setFriendsJoining(!friendsJoining)}
                >
                  <Users className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                  With Friends
                </Button>
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
                    let countdown: string | null = null;
                    if (isToday(gameDate) || isTomorrow(gameDate)) {
                      const minsUntil = differenceInMinutes(gameDate, new Date());
                      if (minsUntil > 0) {
                        const hours = Math.floor(minsUntil / 60);
                        const mins = minsUntil % 60;
                        countdown = hours > 0 && mins > 0 ? `in ${hours}h ${mins}m` : hours > 0 ? `in ${hours}h` : `in ${mins}m`;
                      }
                    }
                    elements.push(
                      <div key={`datetime-${groupKey}`} className="flex items-center gap-3 pt-4 pb-2 first:pt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">{dayLabel}</span>
                          <span className="text-sm font-medium text-primary whitespace-nowrap">{timeLabel}</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                        {countdown && (
                          <span className="text-[11px] font-medium text-primary shrink-0">{countdown}</span>
                        )}
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
                      clubName={game.club?.name}
                      clubLogo={game.club?.logo_url || undefined}
                      clubId={game.club_id || undefined}
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
              {friendsJoining
                ? "No matches with friends right now"
                : isAllMode ? "No upcoming matches" : "No matches on this day"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {friendsJoining
                ? "Check back later or browse all matches."
                : skillMin !== null || formatFilter !== "all" || clubFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Be the first to host a game!"}
            </p>
          </motion.div>
        )}
      </div>
      <HostTypeModal open={showHostModal} onOpenChange={setShowHostModal} />
    </div>
  );
}
