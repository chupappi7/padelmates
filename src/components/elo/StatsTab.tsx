import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Trophy, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StatsTabProps {
  onNavigateToSubmit?: () => void;
}

export function StatsTab({ onNavigateToSubmit }: StatsTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: history = [] } = useQuery({
    queryKey: ["elo-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("elo_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  const chartData = [
    { date: "Start", rating: 1200 },
    ...history.map((h: any) => ({
      date: format(new Date(h.created_at), "MMM d"),
      rating: h.new_rating,
    })),
  ];

  const hasData = history.length > 0;
  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-4">
      {/* Rating Trend Card */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Rating Trend</h3>
          {hasData && (
            <span className="text-xs text-muted-foreground">{history.length} matches</span>
          )}
        </div>

        {hasData ? (
          <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={36} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Empty State */
          <div className="px-6 pb-6 pt-2">
            {/* Ghost chart grid */}
            <div className="relative h-[140px] mb-4">
              <svg width="100%" height="100%" className="text-border">
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={`${(i / 3) * 100}%`} x2="100%" y2={`${(i / 3) * 100}%`} stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" opacity="0.5" />
                ))}
                {/* Ghost sparkline */}
                <path
                  d="M 0 100 Q 40 80, 80 85 T 160 70 T 240 60 T 320 50 T 400 55"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.25"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Your rating will chart here</p>
                <p className="text-xs text-muted-foreground mt-0.5">after your first match</p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="rounded-xl"
                onClick={onNavigateToSubmit}
              >
                Submit a Score
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Match History */}
      <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Match History</h3>
        </div>

        {reversedHistory.length === 0 ? (
          /* Empty State */
          <div className="px-6 pb-6 pt-2 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary/10">
              <Swords className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No matches yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Play a match and submit your score to start building your history
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => navigate("/")}
            >
              Find a Match
            </Button>
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-1.5">
            {reversedHistory.map((h: any) => {
              const change = h.new_rating - h.old_rating;
              const positive = change >= 0;
              return (
                <div key={h.id} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(h.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm font-medium">
                      {h.old_rating} → {h.new_rating}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 font-bold text-sm ${positive ? "text-green-600" : "text-red-500"}`}>
                    {positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {positive ? "+" : ""}{change}
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
