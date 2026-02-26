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
  if (elo >= 2000) return { name: "Legend", color: "from-yellow-400 to-amber-500", textColor: "text-yellow-300", next: null, nextThreshold: 2000 };
  if (elo >= 1700) return { name: "Diamond", color: "from-cyan-300 to-blue-400", textColor: "text-cyan-300", next: "Legend", nextThreshold: 2000 };
  if (elo >= 1500) return { name: "Gold", color: "from-yellow-400 to-yellow-600", textColor: "text-yellow-400", next: "Diamond", nextThreshold: 1700 };
  if (elo >= 1300) return { name: "Silver", color: "from-gray-300 to-gray-400", textColor: "text-gray-300", next: "Gold", nextThreshold: 1500 };
  if (elo >= 1100) return { name: "Bronze", color: "from-orange-400 to-orange-600", textColor: "text-orange-300", next: "Silver", nextThreshold: 1300 };
  return { name: "Beginner", color: "from-emerald-400 to-teal-500", textColor: "text-emerald-300", next: "Bronze", nextThreshold: 1100 };
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

  // Current streak
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

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(185_80%_20%)] via-[hsl(195_70%_22%)] to-[hsl(220_60%_15%)]">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-white/3" />

        <div className="relative max-w-lg mx-auto px-4 pt-6 pb-8">
          {/* Player Name */}
          <p className="text-center text-white/80 font-medium text-sm tracking-wide">
            {profile?.name || "Player"}
          </p>

          {/* ELO Number */}
          <div className="text-center mt-1">
            <span className="text-[72px] leading-none font-black text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {elo}
            </span>
          </div>

          {/* Tier Badge */}
          <div className="flex justify-center mt-3">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r shadow-md",
              tier.color
            )}>
              <Trophy className="w-3.5 h-3.5" />
              {tier.name}
            </div>
          </div>

          {/* Progress Bar */}
          {tier.next && (
            <div className="mt-4 max-w-[280px] mx-auto">
              <div className="flex justify-between text-[10px] text-white/50 font-medium mb-1.5">
                <span>{elo}</span>
                <span>{tier.nextThreshold} to {tier.next}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", tier.color)}
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}

          {/* Stat Pills */}
          <div className="flex justify-center gap-2 mt-5">
            {[
              { icon: Swords, label: "Matches", value: matchesPlayed },
              { icon: Target, label: "Win Rate", value: `${winRate}%` },
              { icon: Flame, label: "Streak", value: streak },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <stat.icon className="w-3.5 h-3.5 text-white/60" />
                <div className="text-center">
                  <p className="text-white font-bold text-sm leading-none">{stat.value}</p>
                  <p className="text-white/50 text-[9px] uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 -mt-3 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-white rounded-2xl shadow-md p-1.5">
            <TabsList className="w-full grid grid-cols-3 bg-transparent h-auto gap-1">
              {["stats", "submit", "forecast"].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={cn(
                    "rounded-xl py-2.5 text-sm font-semibold transition-all capitalize",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50"
                  )}
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-4">
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
