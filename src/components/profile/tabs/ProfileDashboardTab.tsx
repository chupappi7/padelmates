import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Flame, Trophy, CalendarDays, ChevronRight } from "lucide-react";
import { ProfileClubsGlass } from "./ProfileClubsGlass";

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

    const { count: hosted } = await supabase.from("games").select("id", { count: "exact", head: true }).eq("host_id", userId);
    setHostedCount(hosted ?? 0);
    const { count: joined } = await supabase.from("game_players").select("id", { count: "exact", head: true }).eq("user_id", userId);
    setJoinedCount(joined ?? 0);

    const { data: profileData } = await supabase.from("profiles").select("created_at").eq("user_id", userId).single();
    if (profileData) {
      setMemberSince(new Date(profileData.created_at).toLocaleDateString("en", { month: "short", year: "numeric" }));
    }

    if (mpData && mpData.length > 0) {
      const matchIds = (mpData as any[]).filter(mp => mp.matches.status === "completed").map(mp => mp.match_id);
      if (matchIds.length > 0) {
        const { data: allPlayers } = await supabase
          .from("match_players")
          .select("match_id, user_id, team")
          .in("match_id", matchIds.slice(0, 100));

        if (allPlayers) {
          const myTeams = new Map<string, number>();
          for (const mp of mpData as any[]) myTeams.set(mp.match_id, mp.team);

          const partnerCounts = new Map<string, number>();
          for (const p of allPlayers) {
            if (p.user_id === userId) continue;
            if (myTeams.get(p.match_id) === p.team) {
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

  let currentStreak = 0;
  for (const r of results) { if (r.won) currentStreak++; else break; }

  const now = new Date();

  // Monthly chart
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short" });
    const count = results.filter(r => r.playedAt.startsWith(key)).length;
    return { label, count };
  });

  // Last 5 form — always 5 circles
  const last5 = results.slice(0, 5);

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

      {/* Stats row — slightly smaller */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Trophy, label: "Played", value: totalMatches },
          { icon: Flame, label: "Streak", value: currentStreak },
          { icon: CalendarDays, label: "Since", value: memberSince || "—" },
        ].map(s => (
          <div key={s.label} className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-2.5 text-center">
            <s.icon className="w-3.5 h-3.5 text-[#14b8a6] mx-auto mb-0.5" />
            <p className="text-[#0F172A] font-bold text-base tabular-nums leading-none" style={{ fontFamily: SPACE }}>
              {s.value}
            </p>
            <p className="text-[#94A3B8] text-[9px] font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Last 5 — always 5 circles */}
      <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3">
        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Last 5</p>
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => {
            const match = last5[i];
            if (!match) {
              return (
                <div
                  key={i}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-[#F1F5F9] text-[#CBD5E1] border border-[#E2E8F0]"
                  style={{ fontFamily: SPACE }}
                >
                  —
                </div>
              );
            }
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  match.won
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-red-50 text-red-500 border border-red-200"
                }`}
                style={{ fontFamily: SPACE }}
              >
                {match.won ? "W" : "L"}
              </div>
            );
          })}
        </div>
      </div>

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
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 11, fontFamily: SPACE, fontWeight: 700, fill: "#64748B" }}
                  formatter={(v: number) => (v > 0 ? v : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Partner */}
      {topPartner && (
        <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3">
          <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Top Partner</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-sm overflow-hidden">
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

      {/* Clubs — compact horizontal scroll, only in Dashboard */}
      <ProfileClubsGlass userId={userId} />
    </div>
  );
}
