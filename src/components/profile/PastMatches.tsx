import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getSkillLabel } from "@/components/games/SkillBadge";

interface MatchEntry {
  id: string;
  date: string;
  score: string;
  result: "W" | "L";
  gameTitle: string;
  skillLevel: number;
}

interface PastMatchesProps {
  userId: string;
}

export function PastMatches({ userId }: PastMatchesProps) {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [userId]);

  const fetchMatches = async () => {
    const { data: playerRows } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", userId);

    if (!playerRows || playerRows.length === 0) {
      setLoading(false);
      return;
    }

    const matchIds = playerRows.map((p) => p.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status, created_at, game_id")
      .in("id", matchIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!matchesData || matchesData.length === 0) {
      setLoading(false);
      return;
    }

    const gameIds = [...new Set(matchesData.map((m) => m.game_id))];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, title, skill_level")
      .in("id", gameIds);

    const gameMap = new Map(gamesData?.map((g) => [g.id, g]) || []);

    const entries: MatchEntry[] = matchesData.map((m) => {
      const mp = playerRows.find((p) => p.match_id === m.id);
      const myTeam = mp?.team || 1;
      const myScore = myTeam === 1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      const oppScore = myTeam === 1 ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
      const game = gameMap.get(m.game_id);

      return {
        id: m.id,
        date: format(new Date(m.created_at), "MMM d, yyyy"),
        score: `${myScore}–${oppScore}`,
        result: myScore > oppScore ? "W" : "L",
        gameTitle: game?.title || "Match",
        skillLevel: game?.skill_level || 3,
      };
    });

    setMatches(entries);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Past Matches
        </h3>
      </div>

      {matches.length === 0 ? (
        <div className="px-5 pb-5 text-center">
          <p className="text-xs text-muted-foreground">No completed matches yet</p>
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-1 max-h-[320px] overflow-y-auto scrollbar-hide">
          {matches.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Match · {getSkillLabel(m.skillLevel)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                  {m.gameTitle}
                </p>
                <p
                  className="text-sm font-semibold text-foreground tabular-nums mt-0.5"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {m.score}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.date}</p>
              </div>
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  m.result === "W"
                    ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                    : "bg-destructive/15 text-destructive"
                }`}
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {m.result}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
