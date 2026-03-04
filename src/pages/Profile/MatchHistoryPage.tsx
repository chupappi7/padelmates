import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, X as XIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface MatchRow {
  matchId: string;
  setIndex: number;
  date: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerAvatar: string | null;
  opponentIds: string[];
  opponentNames: string[];
  opponentAvatars: (string | null)[];
  won: boolean;
  myScore: number;
  oppScore: number;
  matchType: string;
}

function MatchCard({ match, navigate }: { match: MatchRow; navigate: (path: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
            match.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          )}>
            {match.won ? <Trophy className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
          </div>
          <span className={cn(
            "text-xs font-bold",
            match.won ? "text-success" : "text-destructive"
          )}>
            {match.won ? "Win" : "Loss"}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] rounded-full">
          {formatMatchType(match.matchType)}
        </Badge>
      </div>

      {/* Side-by-side layout: My Team | Score | Opponents */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center">
          {/* My team — right-aligned names, avatars on right */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => match.userId && navigate(`/user/${match.userId}`)}>
              <span className="text-xs font-medium truncate">{match.userName.split(" ")[0]}</span>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={match.userAvatar || undefined} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                  {match.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            {match.partnerName && (
              <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => match.partnerId && navigate(`/user/${match.partnerId}`)}>
                <span className="text-xs font-medium truncate">{match.partnerName.split(" ")[0]}</span>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={match.partnerAvatar || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {match.partnerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Center score */}
          <div className="flex flex-col items-center px-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-3xl font-bold tabular-nums",
                match.won && "text-success"
              )}>
                {match.myScore}
              </span>
              <span className="text-muted-foreground text-xl">–</span>
              <span className={cn(
                "text-3xl font-bold tabular-nums",
                !match.won && "text-success"
              )}>
                {match.oppScore}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider -mt-0.5">Games</p>
          </div>

          {/* Opponents — left-aligned names, avatars on left */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {match.opponentNames.map((name, i) => (
              <div key={i} className="flex items-center gap-1.5 cursor-pointer" onClick={() => match.opponentIds[i] && navigate(`/user/${match.opponentIds[i]}`)}>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={match.opponentAvatars[i] || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate">{name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMatchType(type: string) {
  if (type === "casual_match") return "Casual";
  if (type === "americano") return "Americano";
  if (type === "team_americano") return "Team Americano";
  return type;
}

function DayGroupedMatches({ matches, lastElementRef, navigate }: {
  matches: MatchRow[];
  lastElementRef: (node: HTMLDivElement | null) => void;
  navigate: (path: string) => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const grouped = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    const day = format(new Date(m.date), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(m);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    if (days.length > 0 && expandedDays.size === 0) {
      setExpandedDays(new Set([days[0]]));
    }
  }, [days.length]);

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const lastMatch = matches[matches.length - 1];

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayMatches = grouped[day];
        const isExpanded = expandedDays.has(day);
        const wins = dayMatches.filter((m) => m.won).length;
        const losses = dayMatches.length - wins;

        return (
          <div key={day}>
            <button
              onClick={() => toggleDay(day)}
              className="w-full flex items-center gap-2 py-2 px-1 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {format(new Date(day), "MMM d, yyyy")}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {dayMatches.length} set{dayMatches.length !== 1 ? "s" : ""}
                {` · ${wins}W ${losses}L`}
              </span>
            </button>

            {isExpanded && (
              <div className="space-y-2 mt-1">
                {dayMatches.map((match) => (
                  <div
                    key={`${match.matchId}-${match.setIndex}`}
                    ref={match === lastMatch ? lastElementRef : undefined}
                  >
                    <MatchCard match={match} navigate={navigate} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MatchHistoryPage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUserId = paramUserId || user?.id;

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const offsetRef = useRef(0);
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!targetUserId) return;
    fetchPlayerName();
    fetchMatches(true);
  }, [targetUserId]);

  const fetchPlayerName = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", targetUserId)
      .single();
    if (data) setPlayerName(data.name);
  };

  const fetchMatches = async (reset = false) => {
    if (!targetUserId) return;
    if (reset) {
      offsetRef.current = 0;
      setHasMore(true);
    }

    setLoading(true);

    const { data: playerRows } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", targetUserId);

    if (!playerRows || playerRows.length === 0) {
      setMatches([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    const matchIds = playerRows.map((mp) => mp.match_id);

    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, set_scores, status, created_at, game_id")
      .in("id", matchIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

    if (!matchesData || matchesData.length === 0) {
      if (reset) setMatches([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    if (matchesData.length < PAGE_SIZE) setHasMore(false);

    const gameIds = [...new Set(matchesData.map((m) => m.game_id))];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, format")
      .in("id", gameIds);
    const gameMap = new Map(gamesData?.map((g) => [g.id, g.format]) || []);

    const relevantMatchIds = matchesData.map((m) => m.id);
    const { data: allPlayers } = await supabase
      .from("match_players")
      .select("match_id, user_id, team")
      .in("match_id", relevantMatchIds);

    const allPlayerIds = [...new Set((allPlayers || []).map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", allPlayerIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, { name: p.name, avatar: p.avatar_url }]) || []);

    const rows: MatchRow[] = [];
    matchesData.forEach((m) => {
      const myPlayer = playerRows.find((p) => p.match_id === m.id);
      const myTeam = myPlayer?.team ?? 1;

      const partner = (allPlayers || []).find(
        (p) => p.match_id === m.id && p.team === myTeam && p.user_id !== targetUserId
      );
      const partnerProfile = partner ? profileMap.get(partner.user_id) : null;

      const opponentPlayers = (allPlayers || [])
        .filter((p) => p.match_id === m.id && p.team !== myTeam);
      const opponents = opponentPlayers.map((p) => profileMap.get(p.user_id)?.name || "Unknown");
      const opponentAvatars = opponentPlayers.map((p) => profileMap.get(p.user_id)?.avatar || null);
      const opponentIds = opponentPlayers.map((p) => p.user_id);

      const userProfile = profileMap.get(targetUserId!);
      const userName = userProfile?.name || playerName || "You";
      const userAvatar = userProfile?.avatar || null;
      const matchType = gameMap.get(m.game_id) || "casual_match";

      const rawSets = Array.isArray(m.set_scores) ? m.set_scores : [];
      if (rawSets.length > 0) {
        rawSets.forEach((s: any, i: number) => {
          const myScore = myTeam === 1 ? (s.t1 ?? s.team1 ?? s.score1 ?? 0) : (s.t2 ?? s.team2 ?? s.score2 ?? 0);
          const oppScore = myTeam === 1 ? (s.t2 ?? s.team2 ?? s.score2 ?? 0) : (s.t1 ?? s.team1 ?? s.score1 ?? 0);
          rows.push({
            matchId: m.id, setIndex: i, date: m.created_at,
            userId: targetUserId!, userName, userAvatar,
            partnerId: partner?.user_id || null,
            partnerName: partnerProfile?.name || null,
            partnerAvatar: partnerProfile?.avatar || null,
            opponentIds, opponentNames: opponents.length > 0 ? opponents : ["Unknown"],
            opponentAvatars: opponentAvatars.length > 0 ? opponentAvatars : [null],
            won: myScore > oppScore, myScore, oppScore, matchType,
          });
        });
      } else {
        const myScore = myTeam === 1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
        const oppScore = myTeam === 1 ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
        rows.push({
          matchId: m.id, setIndex: 0, date: m.created_at,
          userId: targetUserId!, userName, userAvatar,
          partnerId: partner?.user_id || null,
          partnerName: partnerProfile?.name || null,
          partnerAvatar: partnerProfile?.avatar || null,
          opponentIds, opponentNames: opponents.length > 0 ? opponents : ["Unknown"],
          opponentAvatars: opponentAvatars.length > 0 ? opponentAvatars : [null],
          won: myScore > oppScore, myScore, oppScore, matchType,
        });
      }
    });

    offsetRef.current += matchesData.length;

    if (reset) {
      setMatches(rows);
    } else {
      setMatches((prev) => [...prev, ...rows]);
    }
    setLoading(false);
  };

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            fetchMatches(false);
          }
        },
        { threshold: 0.5 }
      );

      if (node) {
        observer.observe(node);
        observerRef.current = node;
      }

      return () => {
        observer.disconnect();
        observerRef.current = null;
      };
    },
    [loading, hasMore]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {playerName ? `${playerName}'s Match History` : "Match History"}
          </h1>

          {matches.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No matches yet</p>
            </div>
          )}

          <DayGroupedMatches matches={matches} lastElementRef={lastElementRef} navigate={navigate} />

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
