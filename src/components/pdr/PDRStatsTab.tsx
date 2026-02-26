import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getTier, formatPDR } from "@/lib/pdr";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from "recharts";
import { Trophy, Activity } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface PDRStatsTabProps {
  history: any[];
  submissions: any[];
  profile: any;
  onNavigateToSubmit: () => void;
}

const TIER_LINES = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0];

export function PDRStatsTab({ history, submissions, profile, onNavigateToSubmit }: PDRStatsTabProps) {
  const phase = profile?.pdr_phase ?? "calibrating";
  const reliability = profile?.pdr_reliability ?? 0;

  // Fetch profile names for submissions
  const playerIds = useMemo(() => {
    const ids = new Set<string>();
    submissions.forEach((s: any) => {
      [s.team_a_player1, s.team_a_player2, s.team_b_player1, s.team_b_player2].forEach((id: string) => ids.add(id));
    });
    return Array.from(ids);
  }, [submissions]);

  const { data: playerProfiles = [] } = useQuery({
    queryKey: ["pdr-player-profiles", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, pdr_rating, pdr_phase")
        .in("user_id", playerIds);
      return data || [];
    },
    enabled: playerIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m: Record<string, any> = {};
    playerProfiles.forEach((p: any) => { m[p.user_id] = p; });
    return m;
  }, [playerProfiles]);

  const chartData = useMemo(() => {
    return [...history].reverse().map((h: any) => ({
      date: format(new Date(h.created_at), "MMM d"),
      rating: h.rating_after,
      change: h.rating_change,
    }));
  }, [history]);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const color = payload.change >= 0 ? "hsl(175, 84%, 32%)" : "hsl(28, 95%, 55%)";
    return <Dot cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
  };

  return (
    <div className="space-y-4">
      {/* PDR Chart */}
      <div className="bg-card rounded-2xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Rating Trend
        </h3>

        {history.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="relative w-full h-24 mb-4">
              <svg className="w-full h-full" viewBox="0 0 300 80">
                <line x1="0" y1="40" x2="300" y2="40" stroke="hsl(175, 84%, 32%)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />
                <path d="M0,50 Q75,30 150,40 T300,35" fill="none" stroke="hsl(175, 84%, 32%)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.2" />
              </svg>
            </div>
            <Trophy className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-foreground">
              {phase === "calibrating"
                ? "Submit 5 confirmed matches to unlock your PDR"
                : "Your rating chart will appear here"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-primary border-primary/30"
              onClick={onNavigateToSubmit}
            >
              Submit a Match
            </Button>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                {TIER_LINES.map((v) => (
                  <ReferenceLine key={v} y={v} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                ))}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
                        <p className="font-semibold">{d.rating?.toFixed(2)}</p>
                        <p style={{ color: d.change >= 0 ? "hsl(175, 84%, 32%)" : "hsl(28, 95%, 55%)" }}>
                          {d.change >= 0 ? "+" : ""}{d.change?.toFixed(2)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="hsl(175, 84%, 32%)"
                  strokeWidth={2}
                  dot={<CustomDot />}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Reliability Meter */}
      {phase !== "calibrating" && (
        <div className="bg-card rounded-2xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">PDR Reliability</h3>
            <span className="text-sm font-bold">{reliability}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${reliability}%`,
                background: `linear-gradient(90deg, hsl(0, 72%, 51%) 0%, hsl(38, 92%, 50%) 50%, hsl(175, 84%, 32%) 100%)`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Higher reliability means your PDR is more stable. Play more confirmed matches to increase it.
          </p>
        </div>
      )}

      {/* Match History */}
      <div className="bg-card rounded-2xl border p-4">
        <h3 className="text-sm font-semibold mb-3">Match History</h3>

        {submissions.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No matches yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Play a match and submit your score to start building your history
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-primary border-primary/30"
              onClick={onNavigateToSubmit}
            >
              Submit your first match
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 20).map((sub: any) => {
              const historyEntry = history.find((h: any) => h.match_id === sub.id);
              const score = `${sub.set1_a}-${sub.set1_b}, ${sub.set2_a}-${sub.set2_b}${sub.set3_a != null ? `, ${sub.set3_a}-${sub.set3_b}` : ""}`;
              const change = historyEntry?.rating_change ?? 0;
              const isPositive = change >= 0;

              return (
                <div key={sub.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex -space-x-1.5">
                    {[sub.team_b_player1, sub.team_b_player2].map((id: string) => {
                      const p = profileMap[id];
                      return (
                        <Avatar key={id} className="w-7 h-7 border-2 border-background">
                          <AvatarImage src={p?.avatar_url || ""} />
                          <AvatarFallback className="text-[9px]">{p?.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {[sub.team_b_player1, sub.team_b_player2].map((id: string) => profileMap[id]?.name || "?").join(" & ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{score}</p>
                  </div>
                  <div className="text-right">
                    {historyEntry && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: isPositive ? "hsl(175, 84%, 32%)" : "hsl(28, 95%, 55%)" }}
                      >
                        {isPositive ? "+" : ""}{change.toFixed(2)}
                      </span>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {sub.match_type}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        sub.status === "confirmed" ? "bg-green-100 text-green-700" :
                        sub.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
