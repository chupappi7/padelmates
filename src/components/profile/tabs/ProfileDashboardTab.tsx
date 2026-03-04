import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { Flame, Trophy, CalendarDays, ChevronRight } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface MatchResult {
  matchId: string;
  won: boolean;
  playedAt: string;
}

interface Props {
  userId: string;
  isSelf?: boolean;
  profile: {
    name: string;
    pdr_rating: number | null;
    pdr_phase: string;
    created_at?: string;
  };
}

export function ProfileDashboardTab({ userId, profile, isSelf = true }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hostedCount, setHostedCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [topPartner, setTopPartner] = useState<{ name: string; avatarUrl: string | null; count: number } | null>(null);
  const [memberSince, setMemberSince] = useState<string>("");

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    setLoading(true);

    // Match results
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
    matchResults.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
    setResults(matchResults);

    // Hosted & joined counts
    const { count: hosted } = await supabase.from("games").select("id", { count: "exact", head: true }).eq("host_id", userId);
    setHostedCount(hosted ?? 0);
    const { count: joined } = await supabase.from("game_players").select("id", { count: "exact", head: true }).eq("user_id", userId);
    setJoinedCount(joined ?? 0);

    // Member since
    const { data: profileData } = await supabase.from("profiles").select("created_at").eq("user_id", userId).single();
    if (profileData) {
      setMemberSince(new Date(profileData.created_at).toLocaleDateString("en", { month: "short", year: "numeric" }));
    }

    // Top partner
    if (mpData && mpData.length > 0) {
      const matchIds = (mpData as any[]).filter(mp => mp.matches.status === "completed").map(mp => mp.match_id);
      if (matchIds.length > 0) {
        const { data: allPlayers } = await supabase
          .from("match_players")
          .select("match_id, user_id, team")
          .in("match_id", matchIds.slice(0, 100));

        if (allPlayers) {
          const myTeams = new Map<string, number>();
          for (const mp of mpData as any[]) {
            myTeams.set(mp.match_id, mp.team);
          }

          const partnerCounts = new Map<string, number>();
          for (const p of allPlayers) {
            if (p.user_id === userId) continue;
            const myTeam = myTeams.get(p.match_id);
            if (myTeam === p.team) {
              partnerCounts.set(p.user_id, (partnerCounts.get(p.user_id) || 0) + 1);
            }
          }

          if (partnerCounts.size > 0) {
            const topId = [...partnerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
            const { data: partnerProfile } = await supabase
              .from("profiles")
              .select("name, avatar_url")
              .eq("user_id", topId[0])
              .single();
            if (partnerProfile) {
              setTopPartner({ name: partnerProfile.name, avatarUrl: partnerProfile.avatar_url, count: topId[1] });
            }
          }
        }
      }
    }

    setLoading(false);
  };

  const totalMatches = results.length;
  const wins = results.filter(r => r.won).length;

  // Streaks
  let currentStreak = 0;
  for (const r of results) { if (r.won) currentStreak++; else break; }
  let bestStreak = 0, tempStreak = 0;
  for (const r of results) {
    if (r.won) { tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; }
    else tempStreak = 0;
  }

  // This month matches
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCount = results.filter(r => r.playedAt.startsWith(thisMonthKey)).length;

  // Monthly chart
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short" });
    const count = results.filter(r => r.playedAt.startsWith(key)).length;
    return { label, count };
  });

  // Recent form
  const recentForm = results.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[#E2E8F0] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Welcome card */}
      <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center shrink-0">
            <span className="text-lg">{isSelf ? "👋" : "📊"}</span>
          </div>
          <div>
            <p className="text-[#0F172A] font-semibold text-sm" style={{ fontFamily: SPACE }}>
              {isSelf ? `Hi ${profile.name.split(" ")[0]}!` : profile.name.split(" ")[0]}
            </p>
            <p className="text-[#64748B] text-xs mt-0.5">
              {isSelf ? "You've" : "Has"} played <span className="text-[#14b8a6] font-semibold">{thisMonthCount}</span> matches this month
            </p>
          </div>
        </div>
      </div>

      {/* PDR Card */}
      <button
        onClick={() => navigate("/elo")}
        className="w-full bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4 text-left transition-colors hover:bg-[#F8FAFC]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center text-[10px] font-bold text-[#14b8a6]" style={{ fontFamily: SPACE }}>
              PDR
            </div>
            <span className="text-[11px] text-[#94A3B8] font-medium uppercase tracking-wider">Padel Dynamic Rating</span>
          </div>
          <span className="text-[10px] bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full font-medium capitalize">
            {profile.pdr_phase}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[36px] font-extrabold text-[#0F172A] leading-none tabular-nums" style={{ fontFamily: SPACE }}>
            {profile.pdr_rating != null ? profile.pdr_rating.toFixed(2) : "NR"}
          </span>
          <ChevronRight className="w-4 h-4 text-[#CBD5E1] mb-1" />
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#14b8a6] to-[#5eead4] rounded-full transition-all"
            style={{ width: `${Math.min(((profile.pdr_rating ?? 0) / 7) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#CBD5E1]">1.0</span>
          <span className="text-[9px] text-[#CBD5E1]">7.0</span>
        </div>
      </button>

      {/* My Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Trophy, label: "Played", value: totalMatches },
          { icon: Flame, label: "Streak", value: currentStreak },
          { icon: CalendarDays, label: "Since", value: memberSince || "—" },
        ].map(s => (
          <div key={s.label} className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3 text-center">
            <s.icon className="w-4 h-4 text-[#14b8a6] mx-auto mb-1" />
            <p className="text-[#0F172A] font-bold text-lg tabular-nums leading-none" style={{ fontFamily: SPACE }}>
              {s.value}
            </p>
            <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent form strip */}
      {recentForm.length > 0 && (
        <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Recent Form</p>
          <div className="flex gap-2">
            {recentForm.map((r, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  r.won
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-red-50 text-red-500 border border-red-200"
                }`}
                style={{ fontFamily: SPACE }}
              >
                {r.won ? "W" : "L"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity chart */}
      <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-3">Activity</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barCategoryGap="25%">
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === monthlyData.length - 1 ? "#14b8a6" : "#E2E8F0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Partner */}
      {topPartner && (
        <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Top Partner</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-sm overflow-hidden">
              {topPartner.avatarUrl ? (
                <img src={topPartner.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                topPartner.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <p className="text-[#0F172A] text-sm font-semibold">{topPartner.name}</p>
              <p className="text-[#94A3B8] text-xs">{topPartner.count} matches together</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
