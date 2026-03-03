import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Users, Swords, Star, Lock, Target, Zap } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface Achievement {
  id: string;
  icon: React.ComponentType<any>;
  name: string;
  description: string;
  unlocked: boolean;
}

export function ProfileAchievementsTab({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    const { data: mpData } = await supabase
      .from("match_players")
      .select("match_id, team, matches!inner(id, team1_score, team2_score, status)")
      .eq("user_id", userId);

    let totalMatches = 0;
    let wins = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    if (mpData) {
      const completed = (mpData as any[]).filter(mp => mp.matches.status === "completed");
      totalMatches = completed.length;
      for (const mp of completed) {
        const m = mp.matches;
        const won = (mp.team === 1 && (m.team1_score ?? 0) > (m.team2_score ?? 0)) ||
                    (mp.team === 2 && (m.team2_score ?? 0) > (m.team1_score ?? 0));
        if (won) { wins++; tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; }
        else tempStreak = 0;
      }
    }

    const { count: hosted } = await supabase.from("games").select("id", { count: "exact", head: true }).eq("host_id", userId);
    const { count: friends } = await supabase.from("friendships").select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    const allAchievements: Achievement[] = [
      { id: "first_match", icon: Swords, name: "First Blood", description: "Play your first match", unlocked: totalMatches >= 1 },
      { id: "ten_matches", icon: Target, name: "Veteran", description: "Play 10 matches", unlocked: totalMatches >= 10 },
      { id: "five_wins", icon: Trophy, name: "Champion", description: "Win 5 matches", unlocked: wins >= 5 },
      { id: "three_streak", icon: Flame, name: "On Fire", description: "Win 3 matches in a row", unlocked: bestStreak >= 3 },
      { id: "host_first", icon: Star, name: "Game Host", description: "Host your first game", unlocked: (hosted ?? 0) >= 1 },
      { id: "host_five", icon: Zap, name: "Event Organizer", description: "Host 5 games", unlocked: (hosted ?? 0) >= 5 },
      { id: "social", icon: Users, name: "Social Butterfly", description: "Add 3 friends", unlocked: (friends ?? 0) >= 3 },
      { id: "fifty_matches", icon: Trophy, name: "Legend", description: "Play 50 matches", unlocked: totalMatches >= 50 },
    ];

    setAchievements(allAchievements);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#E2E8F0] rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {achievements.map(a => {
        const Icon = a.unlocked ? a.icon : Lock;
        return (
          <div
            key={a.id}
            className={`rounded-2xl p-4 flex flex-col items-center text-center transition-all ${
              a.unlocked
                ? "bg-white shadow-sm border border-[#14b8a6]/30 shadow-[0_0_15px_rgba(20,184,166,0.08)]"
                : "bg-[#F8FAFC] border border-[#E2E8F0] opacity-60"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
              a.unlocked ? "bg-[#14b8a6]/10" : "bg-[#F1F5F9]"
            }`}>
              <Icon className={`w-5 h-5 ${a.unlocked ? "text-[#14b8a6]" : "text-[#CBD5E1]"}`} />
            </div>
            <p className={`text-xs font-semibold ${a.unlocked ? "text-[#0F172A]" : "text-[#CBD5E1]"}`} style={{ fontFamily: SPACE }}>
              {a.name}
            </p>
            <p className={`text-[10px] mt-0.5 ${a.unlocked ? "text-[#94A3B8]" : "text-[#CBD5E1]"}`}>
              {a.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
