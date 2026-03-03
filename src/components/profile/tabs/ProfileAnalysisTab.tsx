import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MapPin, Dumbbell, CalendarDays } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface AnalysisData {
  mostPlayedFormat: string | null;
  favouriteLocation: string | null;
  bestDay: string | null;
  skillDistribution: { level: string; count: number }[];
}

export function ProfileAnalysisTab({ userId }: { userId: string }) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, [userId]);

  const fetchAnalysis = async () => {
    // Get all games user participated in
    const { data: gpData } = await supabase
      .from("game_players")
      .select("game_id")
      .eq("user_id", userId);

    const { data: hostedData } = await supabase
      .from("games")
      .select("id")
      .eq("host_id", userId);

    const allGameIds = new Set([
      ...(gpData?.map(g => g.game_id) || []),
      ...(hostedData?.map(g => g.id) || []),
    ]);

    if (allGameIds.size === 0) {
      setData({ mostPlayedFormat: null, favouriteLocation: null, bestDay: null, skillDistribution: [] });
      setLoading(false);
      return;
    }

    const { data: games } = await supabase
      .from("games")
      .select("format, location, date_time, skill_level")
      .in("id", [...allGameIds]);

    if (!games || games.length === 0) {
      setData({ mostPlayedFormat: null, favouriteLocation: null, bestDay: null, skillDistribution: [] });
      setLoading(false);
      return;
    }

    // Most played format
    const formatCounts = new Map<string, number>();
    games.forEach(g => formatCounts.set(g.format, (formatCounts.get(g.format) || 0) + 1));
    const mostPlayedFormat = [...formatCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") || null;

    // Favourite location
    const locCounts = new Map<string, number>();
    games.forEach(g => locCounts.set(g.location, (locCounts.get(g.location) || 0) + 1));
    const favouriteLocation = [...locCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Best day
    const dayCounts = new Map<string, number>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    games.forEach(g => {
      const day = dayNames[new Date(g.date_time).getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });
    const bestDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Skill distribution
    const skillMap = new Map<number, number>();
    games.forEach(g => skillMap.set(g.skill_level, (skillMap.get(g.skill_level) || 0) + 1));
    const levelLabels: Record<number, string> = { 1: "D", 2: "C", 3: "B", 4: "A" };
    const skillDistribution = [1, 2, 3, 4].map(l => ({
      level: levelLabels[l] || String(l),
      count: skillMap.get(l) || 0,
    }));

    setData({ mostPlayedFormat, favouriteLocation, bestDay, skillDistribution });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!data) return null;

  const insights = [
    { icon: BarChart3, label: "Most Played Format", value: data.mostPlayedFormat || "—", capitalize: true },
    { icon: MapPin, label: "Favourite Location", value: data.favouriteLocation || "—" },
    { icon: CalendarDays, label: "Best Day to Play", value: data.bestDay ? `${data.bestDay}day` : "—" },
  ];

  const maxSkill = Math.max(...data.skillDistribution.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {insights.map(s => (
        <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/15 flex items-center justify-center shrink-0">
            <s.icon className="w-4.5 h-4.5 text-[#14b8a6]" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-white font-semibold text-sm mt-0.5 ${s.capitalize ? "capitalize" : ""}`} style={{ fontFamily: SPACE }}>
              {s.value}
            </p>
          </div>
        </div>
      ))}

      {/* Skill distribution */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-[#14b8a6]" />
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Skill Level Distribution</p>
        </div>
        <div className="space-y-2">
          {data.skillDistribution.map(s => (
            <div key={s.level} className="flex items-center gap-2">
              <span className="text-white/60 text-xs font-semibold w-5" style={{ fontFamily: SPACE }}>{s.level}</span>
              <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-[#14b8a6]/40 rounded-lg transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.max((s.count / maxSkill) * 100, 8)}%` }}
                >
                  <span className="text-[10px] text-white/70 font-semibold" style={{ fontFamily: SPACE }}>{s.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
