import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, X as XIcon } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface MatchRow {
  matchId: string;
  date: string;
  opponentNames: string[];
  won: boolean;
  team1Score: number | null;
  team2Score: number | null;
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

    // 1. Get match_players rows for this user
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

    // 2. Get completed matches with pagination
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status, created_at, game_id")
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

    if (matchesData.length < PAGE_SIZE) {
      setHasMore(false);
    }

    // 3. Get game formats
    const gameIds = [...new Set(matchesData.map((m) => m.game_id))];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, format")
      .in("id", gameIds);
    const gameMap = new Map(gamesData?.map((g) => [g.id, g.format]) || []);

    // 4. Get all match_players for opponents
    const relevantMatchIds = matchesData.map((m) => m.id);
    const { data: allPlayers } = await supabase
      .from("match_players")
      .select("match_id, user_id, team")
      .in("match_id", relevantMatchIds);

    // 5. Get opponent profiles
    const opponentIds = [
      ...new Set(
        (allPlayers || [])
          .filter((p) => p.user_id !== targetUserId)
          .map((p) => p.user_id)
      ),
    ];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", opponentIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

    // 6. Build rows
    const rows: MatchRow[] = matchesData.map((m) => {
      const myPlayer = playerRows.find((p) => p.match_id === m.id);
      const myTeam = myPlayer?.team ?? 1;
      const won =
        myTeam === 1
          ? (m.team1_score ?? 0) > (m.team2_score ?? 0)
          : (m.team2_score ?? 0) > (m.team1_score ?? 0);

      const opponents = (allPlayers || [])
        .filter((p) => p.match_id === m.id && p.user_id !== targetUserId)
        .map((p) => profileMap.get(p.user_id) || "Unknown");

      return {
        matchId: m.id,
        date: m.created_at,
        opponentNames: opponents.length > 0 ? opponents : ["Unknown"],
        won,
        team1Score: m.team1_score,
        team2Score: m.team2_score,
        matchType: gameMap.get(m.game_id) || "casual_match",
      };
    });

    offsetRef.current += matchesData.length;

    if (reset) {
      setMatches(rows);
    } else {
      setMatches((prev) => [...prev, ...rows]);
    }
    setLoading(false);
  };

  // Intersection observer for infinite scroll
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

          <div className="space-y-2">
            {matches.map((match, index) => (
              <div
                key={match.matchId}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
                ref={index === matches.length - 1 ? lastElementRef : undefined}
              >
                {/* W/L Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    match.won
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {match.won ? (
                    <Trophy className="w-4 h-4" />
                  ) : (
                    <XIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Match info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    vs {match.opponentNames.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(match.date), "MMM d, yyyy")}
                  </p>
                </div>

                {/* Score (only self) */}
                {isSelf && match.team1Score != null && match.team2Score != null && (
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {match.team1Score} – {match.team2Score}
                  </span>
                )}

                {/* Match type tag */}
                {isSelf && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {formatMatchType(match.matchType)}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
