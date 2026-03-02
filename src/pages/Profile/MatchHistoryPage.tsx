import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, X as XIcon } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface MatchRow {
  matchId: string;
  setIndex: number;
  date: string;
  userName: string;
  partnerName: string | null;
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
      const opponents = (allPlayers || [])
        .filter((p) => p.match_id === m.id && p.team !== myTeam)
        .map((p) => profileMap.get(p.user_id) || "Unknown");

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
            userName,
            partnerName,
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
          userName,
          partnerName,
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

          <div className="space-y-2">
            {matches.map((match, index) => {
              const winColor = "text-foreground";
              const loseColor = "text-muted-foreground";

              return (
                <div
                  key={`${match.matchId}-${match.setIndex}`}
                  className="bg-white rounded-xl p-4 shadow-sm"
                  ref={index === matches.length - 1 ? lastElementRef : undefined}
                >
                  {/* Header: date + type */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(match.date), "MMM d, yyyy")}
                    </span>
                    {isSelf && (
                      <Badge variant="secondary" className="text-[10px]">
                        {formatMatchType(match.matchType)}
                      </Badge>
                    )}
                  </div>

                  {/* User's team */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        match.won
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {match.won ? (
                        <Trophy className="w-3 h-3" />
                      ) : (
                        <XIcon className="w-3 h-3" />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${match.won ? winColor : loseColor}`}>
                      <p className="text-sm font-medium truncate">{match.userName}</p>
                      {match.partnerName && (
                        <p className="text-xs truncate">{match.partnerName}</p>
                      )}
                    </div>
                    {isSelf && (
                      <span className={`text-lg font-bold tabular-nums ${match.won ? winColor : loseColor}`}>
                        {match.myScore}
                      </span>
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
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        !match.won
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {!match.won ? (
                        <Trophy className="w-3 h-3" />
                      ) : (
                        <XIcon className="w-3 h-3" />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${!match.won ? winColor : loseColor}`}>
                      {match.opponentNames.map((name, i) => (
                        <p key={i} className={`${i === 0 ? "text-sm font-medium" : "text-xs"} truncate`}>
                          {name}
                        </p>
                      ))}
                    </div>
                    {isSelf && (
                      <span className={`text-lg font-bold tabular-nums ${!match.won ? winColor : loseColor}`}>
                        {match.oppScore}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
