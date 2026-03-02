import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, X as XIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 20;

function MatchCard({ match, isSelf, formatMatchType, navigate, allPlayers }: { match: MatchRow; isSelf: boolean; formatMatchType: (t: string) => string; navigate: (path: string) => void; allPlayers: Map<string, string> }) {
  const winColor = "text-foreground";
  const loseColor = "text-muted-foreground";

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Header: type badge */}
      <div className="flex items-center justify-end mb-2">
        {isSelf && (
          <Badge variant="secondary" className="text-[10px]">
            {formatMatchType(match.matchType)}
          </Badge>
        )}
      </div>

      {/* User's team */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${match.won ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
          {match.won ? <Trophy className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
        </div>
        <div className={`flex-1 min-w-0 ${match.won ? winColor : loseColor}`}>
          <p className="text-sm font-bold truncate cursor-pointer hover:underline" onClick={() => match.userId && navigate(`/user/${match.userId}`)}>{match.userName}</p>
          {match.partnerName && <p className="text-xs font-semibold truncate cursor-pointer hover:underline" onClick={() => match.partnerId && navigate(`/user/${match.partnerId}`)}>{match.partnerName}</p>}
        </div>
        {isSelf && (
          <span className={`text-lg font-bold tabular-nums ${match.won ? winColor : loseColor}`}>{match.myScore}</span>
        )}
      </div>

      {/* VS divider */}
      <div className="flex items-center gap-2 my-2 ml-9">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">vs</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Opponents */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${!match.won ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
          {!match.won ? <Trophy className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
        </div>
        <div className={`flex-1 min-w-0 ${!match.won ? winColor : loseColor}`}>
          {match.opponentNames.map((name, i) => (
            <p key={i} className={`${i === 0 ? "text-sm font-bold" : "text-xs font-semibold"} truncate cursor-pointer hover:underline`} onClick={() => match.opponentIds[i] && navigate(`/user/${match.opponentIds[i]}`)}>{name}</p>
          ))}
        </div>
        {isSelf && (
          <span className={`text-lg font-bold tabular-nums ${!match.won ? winColor : loseColor}`}>{match.oppScore}</span>
        )}
      </div>
    </div>
  );
}

function DayGroupedMatches({ matches, isSelf, formatMatchType, lastElementRef, navigate }: {
  matches: MatchRow[];
  isSelf: boolean;
  formatMatchType: (t: string) => string;
  lastElementRef: (node: HTMLDivElement | null) => void;
  navigate: (path: string) => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Group by date
  const grouped = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    const day = format(new Date(m.date), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(m);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Auto-expand the most recent day
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
                {isSelf && ` · ${wins}W ${losses}L`}
              </span>
            </button>

            {isExpanded && (
              <div className="space-y-2 mt-1">
                {dayMatches.map((match) => (
                  <div
                    key={`${match.matchId}-${match.setIndex}`}
                    ref={match === lastMatch ? lastElementRef : undefined}
                  >
                    <MatchCard match={match} isSelf={isSelf} formatMatchType={formatMatchType} navigate={navigate} allPlayers={new Map()} />
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

interface MatchRow {
  matchId: string;
  setIndex: number;
  date: string;
  userId: string;
  userName: string;
  partnerId: string | null;
  partnerName: string | null;
  opponentIds: string[];
  opponentNames: string[];
  won: boolean;
  myScore: number;
  oppScore: number;
  matchType: string;
}

export default function MatchHistoryPage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUserId = paramUserId || user?.id;
  const isSelf = !paramUserId || (user && paramUserId === user.id);

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

    // Get ALL player profiles (including target user + partners)
    const allPlayerIds = [...new Set((allPlayers || []).map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", allPlayerIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

    const rows: MatchRow[] = [];
    matchesData.forEach((m) => {
      const myPlayer = playerRows.find((p) => p.match_id === m.id);
      const myTeam = myPlayer?.team ?? 1;

      // Partner = same team, different user
      const partner = (allPlayers || []).find(
        (p) => p.match_id === m.id && p.team === myTeam && p.user_id !== targetUserId
      );
      const partnerName = partner ? profileMap.get(partner.user_id) || "Unknown" : null;

      // Opponents = other team
      const opponentPlayers = (allPlayers || [])
        .filter((p) => p.match_id === m.id && p.team !== myTeam);
      const opponents = opponentPlayers.map((p) => profileMap.get(p.user_id) || "Unknown");
      const opponentIds = opponentPlayers.map((p) => p.user_id);

      const userName = profileMap.get(targetUserId!) || playerName || "You";
      const matchType = gameMap.get(m.game_id) || "casual_match";

      // Set scores oriented to user's team — one card per set
      const rawSets = Array.isArray(m.set_scores) ? m.set_scores : [];
      if (rawSets.length > 0) {
        rawSets.forEach((s: any, i: number) => {
          const myScore = myTeam === 1 ? (s.t1 ?? s.team1 ?? s.score1 ?? 0) : (s.t2 ?? s.team2 ?? s.score2 ?? 0);
          const oppScore = myTeam === 1 ? (s.t2 ?? s.team2 ?? s.score2 ?? 0) : (s.t1 ?? s.team1 ?? s.score1 ?? 0);
          rows.push({
            matchId: m.id,
            setIndex: i,
            date: m.created_at,
            userId: targetUserId!,
            userName,
            partnerId: partner?.user_id || null,
            partnerName,
            opponentIds: opponentIds.length > 0 ? opponentIds : [],
            opponentNames: opponents.length > 0 ? opponents : ["Unknown"],
            won: myScore > oppScore,
            myScore,
            oppScore,
            matchType,
          });
        });
      } else {
        // No set data — show match-level score
        const myScore = myTeam === 1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
        const oppScore = myTeam === 1 ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
        rows.push({
          matchId: m.id,
          setIndex: 0,
          date: m.created_at,
          userId: targetUserId!,
          userName,
          partnerId: partner?.user_id || null,
          partnerName,
          opponentIds: opponentIds.length > 0 ? opponentIds : [],
          opponentNames: opponents.length > 0 ? opponents : ["Unknown"],
          won: myScore > oppScore,
          myScore,
          oppScore,
          matchType,
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

  const formatMatchType = (type: string) => {
    if (type === "casual_match") return "Casual";
    if (type === "americano") return "Americano";
    if (type === "team_americano") return "Team Americano";
    return type;
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F5F5" }}>
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

          <DayGroupedMatches matches={matches} isSelf={isSelf} formatMatchType={formatMatchType} lastElementRef={lastElementRef} navigate={navigate} />

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
