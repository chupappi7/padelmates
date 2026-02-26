import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Swords } from "lucide-react";
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
    <div className="space-y-3">
      {/* Rating Trend Card */}
      <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Rating Trend</h3>
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
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Empty State */
          <div className="px-5 pb-5 pt-1">
            {/* Ghost chart grid */}
            <div className="relative h-[120px] mb-3">
              <svg width="100%" height="100%" className="text-border">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={`${(i / 3) * 100}%`} x2="100%" y2={`${(i / 3) * 100}%`} stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" opacity="0.4" />
                ))}
                <path
                  d="M 0 100 Q 40 80, 80 85 T 160 70 T 240 60 T 320 50 T 400 55"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div className="text-center space-y-2.5">
              <p className="text-sm text-foreground font-medium">Your rating will chart here after your first match</p>
              <Button
                variant="default"
                size="sm"
                className="rounded-lg text-xs"
                onClick={onNavigateToSubmit}
              >
                Submit a Score
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Match History */}
      <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-medium text-foreground">Match History</h3>
        </div>

        {reversedHistory.length === 0 ? (
          <div className="px-5 pb-5 pt-1 text-center space-y-2.5">
            <Swords className="w-5 h-5 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">No matches yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Play a match and submit your score to start building your history
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => navigate("/")}
            >
              Find a Match
            </Button>
          </div>
        ) : (
          <div className="px-3 pb-3 space-y-1">
            {reversedHistory.map((h: any) => {
              const change = h.new_rating - h.old_rating;
              const positive = change >= 0;
              return (
                <div key={h.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(h.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm font-medium">
                      {h.old_rating} → {h.new_rating}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-sm ${positive ? "text-green-600" : "text-red-500"}`}>
                    {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
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
