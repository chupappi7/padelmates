import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsTab } from "@/components/elo/StatsTab";
import { SubmitScoreTab } from "@/components/elo/SubmitScoreTab";
import { ForecastTab } from "@/components/elo/ForecastTab";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Target, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

function getTier(elo: number) {
  if (elo >= 2000) return { name: "Legend", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", barColor: "bg-yellow-400", next: null, nextThreshold: 2000 };
  if (elo >= 1700) return { name: "Diamond", color: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10", barColor: "bg-cyan-300", next: "Legend", nextThreshold: 2000 };
  if (elo >= 1500) return { name: "Gold", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", barColor: "bg-yellow-400", next: "Diamond", nextThreshold: 1700 };
  if (elo >= 1300) return { name: "Silver", color: "text-gray-300 border-gray-300/30 bg-gray-300/10", barColor: "bg-gray-300", next: "Gold", nextThreshold: 1500 };
  if (elo >= 1100) return { name: "Bronze", color: "text-orange-300 border-orange-300/30 bg-orange-300/10", barColor: "bg-orange-300", next: "Silver", nextThreshold: 1300 };
  return { name: "Beginner", color: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10", barColor: "bg-emerald-300", next: "Bronze", nextThreshold: 1100 };
}

export default function EloPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("stats");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, elo_rating, games_played")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["elo-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("elo_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const elo = profile?.elo_rating ?? 1200;
  const tier = getTier(elo);
  const matchesPlayed = history.length;
  const wins = history.filter((h: any) => h.new_rating > h.old_rating).length;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  let streak = 0;
  for (const h of history) {
    const isWin = (h as any).new_rating > (h as any).old_rating;
    if (isWin) streak++;
    else break;
  }

  const progressToNext = tier.next
    ? Math.min(100, Math.max(0, ((elo - (tier.nextThreshold - 200)) / 200) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_96%)] pb-24">
      <Navbar />

      {/* Hero Section — clean, understated */}
      <div className="bg-gradient-to-br from-[hsl(185_60%_18%)] via-[hsl(195_50%_20%)] to-[hsl(220_45%_14%)]">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-10">
          {/* Player Name */}
          <p className="text-center text-white/70 text-sm tracking-wide">
            {profile?.name || "Player"}
          </p>

          {/* ELO Number */}
          <div className="text-center mt-1.5">
            <span
              className="text-[56px] leading-none font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {elo}
            </span>
          </div>

          {/* Tier Badge — subtle pill */}
          <div className="flex justify-center mt-3">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border",
              tier.color
            )}>
              <Trophy className="w-3 h-3" />
              {tier.name}
            </div>
          </div>

          {/* Progress Bar — thin */}
          {tier.next && (
            <div className="mt-4 max-w-[260px] mx-auto">
              <div className="flex justify-between text-[10px] text-white/40 font-medium mb-1">
                <span>{elo}</span>
                <span>{tier.nextThreshold} to {tier.next}</span>
              </div>
              <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", tier.barColor)}
                  style={{ width: `${progressToNext}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          )}

          {/* Stat Row — minimal dividers */}
          <div className="flex justify-center items-center gap-0 mt-6">
            {[
              { label: "Matches", value: matchesPlayed },
              { label: "Win Rate", value: `${winRate}%` },
              { label: "Streak", value: streak },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="w-px h-6 bg-white/15 mx-5" />}
                <div className="text-center">
                  <p className="text-white font-semibold text-sm leading-none">{stat.value}</p>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs — underline style */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 bg-transparent h-auto border-b border-border rounded-none p-0">
            {["stats", "submit", "forecast"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "rounded-none py-3 text-sm capitalize border-b-2 transition-all",
                  "data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-none data-[state=active]:bg-transparent",
                  "data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:font-normal"
                )}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-5">
            <TabsContent value="stats" className="mt-0">
              <StatsTab onNavigateToSubmit={() => setActiveTab("submit")} />
            </TabsContent>
            <TabsContent value="submit" className="mt-0">
              <SubmitScoreTab />
            </TabsContent>
            <TabsContent value="forecast" className="mt-0">
              <ForecastTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
