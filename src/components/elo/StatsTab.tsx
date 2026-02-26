import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatsTab() {
  const { user } = useAuth();

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

  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3">Rating Trend</h3>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={40} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No matches yet. Submit a score to start tracking!
          </p>
        )}
      </div>

      {/* Match History */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Match History</h3>
        {reversedHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No matches recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {reversedHistory.map((h: any) => {
              const change = h.new_rating - h.old_rating;
              const positive = change >= 0;
              return (
                <div key={h.id} className="flex items-center justify-between bg-card rounded-lg border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm">
                      {h.old_rating} → {h.new_rating}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 font-bold text-sm ${positive ? "text-green-500" : "text-red-500"}`}>
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
