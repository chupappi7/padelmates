import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDRHero } from "@/components/pdr/PDRHero";
import { PDRStatsTab } from "@/components/pdr/PDRStatsTab";
import { PDRSubmitTab } from "@/components/pdr/PDRSubmitTab";
import { PDRForecastTab } from "@/components/pdr/PDRForecastTab";
import { PDRLeaderboard } from "@/components/pdr/PDRLeaderboard";
import { getTier } from "@/lib/pdr";
import { cn } from "@/lib/utils";

export default function EloPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("stats");

  const { data: profile } = useQuery({
    queryKey: ["pdr-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, pdr_rating, pdr_rd, pdr_sigma, pdr_phase, pdr_matches_count, pdr_reliability, pdr_last_match_at")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["pdr-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("rating_history")
        .select("*")
        .eq("player_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["pdr-submissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_submissions")
        .select("*")
        .or(`team_a_player1.eq.${user!.id},team_a_player2.eq.${user!.id},team_b_player1.eq.${user!.id},team_b_player2.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  const wins = history.filter((h: any) => h.rating_change > 0).length;
  const losses = history.filter((h: any) => h.rating_change < 0).length;
  const winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  // Last 5 matches trend
  const last5 = history.slice(0, 5);
  const trendDelta = last5.reduce((sum: number, h: any) => sum + h.rating_change, 0);

  const tier = profile?.pdr_rating ? getTier(profile.pdr_rating) : null;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_96%)] pb-24">
      <Navbar />

      <PDRHero
        profile={profile}
        wins={wins}
        losses={losses}
        winRate={winRate}
        trendDelta={trendDelta}
        tier={tier}
      />

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="flex-1 grid grid-cols-3 bg-[hsl(210_20%_92%)] rounded-full p-1 h-auto">
              {["stats", "submit", "forecast"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "rounded-full py-2 text-sm font-medium capitalize transition-all",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                    "data-[state=inactive]:text-muted-foreground"
                  )}
                  style={activeTab === tab && tier ? { color: tier.color } : undefined}
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="stats" className="mt-0">
            <PDRStatsTab
              history={history}
              submissions={submissions}
              profile={profile}
              onNavigateToSubmit={() => setActiveTab("submit")}
            />
          </TabsContent>
          <TabsContent value="submit" className="mt-0">
            <PDRSubmitTab />
          </TabsContent>
          <TabsContent value="forecast" className="mt-0">
            <PDRForecastTab />
          </TabsContent>
        </Tabs>

        {/* Leaderboard below tabs */}
        <div className="mt-6">
          <PDRLeaderboard currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
