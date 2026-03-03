import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, TrendingUp, Trophy, Target, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

interface Props {
  userId: string;
}

interface MatchResult {
  matchId: string;
  won: boolean;
  playedAt: string;
}

const SPACE_GROTESK = "'Space Grotesk', system-ui, sans-serif";

export function ProfilePerformanceCard({ userId }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hostedCount, setHostedCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    setLoading(true);

    // 1. Get all match_players rows for this user with completed matches
    const { data: mpData } = await supabase
      .from("match_players")
      .select("match_id, team, matches!inner(id, team1_score, team2_score, status, created_at)")
      .eq("user_id", userId);

    const matchResults: MatchResult[] = [];
    if (mpData) {
      for (const mp of mpData as any[]) {
        const m = mp.matches;
        if (m.status !== "completed") continue;
        const won =
          (mp.team === 1 && (m.team1_score ?? 0) > (m.team2_score ?? 0)) ||
          (mp.team === 2 && (m.team2_score ?? 0) > (m.team1_score ?? 0));
        matchResults.push({ matchId: m.id, won, playedAt: m.created_at });
      }
    }
    // Sort by date desc
    matchResults.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
    setResults(matchResults);

    // 2. Games hosted
    const { count: hosted } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("host_id", userId);
    setHostedCount(hosted ?? 0);

    // 3. Games joined
    const { count: joined } = await supabase
      .from("game_players")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    setJoinedCount(joined ?? 0);

    setLoading(false);
  };

  const totalMatches = results.length;
  const wins = results.filter((r) => r.won).length;
  const losses = totalMatches - wins;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  // Streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  for (const r of results) {
    if (r.won) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }
  // Current streak (from most recent)
  for (const r of results) {
    if (r.won) currentStreak++;
    else break;
  }

  // Last 5 form
  const recentForm = results.slice(0, 5);

  // Monthly chart (last 3 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short" });
    const count = results.filter((r) => r.playedAt.startsWith(monthKey)).length;
    return { label, count };
  });
  const thisMonthCount = monthlyData[2]?.count ?? 0;
  const maxMonthly = Math.max(...monthlyData.map((d) => d.count), 1);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-5 animate-pulse space-y-3">
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-10 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3
          className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: SPACE_GROTESK }}
        >
          Performance
        </h3>
      </div>

      {/* Primary stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Played", value: totalMatches, icon: null },
            { label: "Wins", value: wins, color: "text-emerald-600" },
            { label: "Losses", value: losses, color: "text-red-500" },
            { label: "Win %", value: `${winRate}`, suffix: "%" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-muted/40 rounded-xl px-2.5 py-2.5 text-center"
            >
              <div
                className={`text-lg font-bold tabular-nums ${stat.color || "text-foreground"}`}
                style={{ fontFamily: SPACE_GROTESK }}
              >
                {stat.value}
                {stat.suffix && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.suffix}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Streak", value: currentStreak, icon: Flame },
            { label: "Best", value: bestStreak, icon: Trophy },
            { label: "Hosted", value: hostedCount, icon: Target },
            { label: "Joined", value: joinedCount, icon: null },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span
                className="text-sm font-semibold tabular-nums text-foreground"
                style={{ fontFamily: SPACE_GROTESK }}
              >
                {stat.value}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent form strip */}
      {recentForm.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Form
            </span>
            <div className="flex gap-1.5">
              {recentForm.map((r, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    r.won ? "bg-emerald-500" : "bg-red-400"
                  }`}
                >
                  {r.won ? "W" : "L"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly activity */}
      <div className="px-5 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              This month
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className="text-xl font-bold text-foreground tabular-nums"
                style={{ fontFamily: SPACE_GROTESK }}
              >
                {thisMonthCount}
              </span>
              <span className="text-xs text-muted-foreground">matches</span>
            </div>
          </div>
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 2
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.25)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Match history link */}
      <button
        onClick={() => navigate("/match-history")}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-border hover:bg-muted/30 transition-colors"
      >
        <span className="text-xs font-medium text-foreground">
          View Full Match History
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
