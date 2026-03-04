import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, startOfDay, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Trophy, Flame, TrendingDown, MapPin, Users, Swords, Clock, Percent } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

type Period = "week" | "month" | "3months" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "3months", label: "3 Months" },
  { key: "all", label: "All Time" },
];

interface MatchRow {
  matchId: string;
  team: number;
  team1Score: number;
  team2Score: number;
  createdAt: string;
  gameId: string;
}

interface PlayerInfo {
  matchId: string;
  userId: string;
  team: number;
}

interface GameInfo {
  id: string;
  location: string;
  dateTime: string;
  endDateTime: string | null;
}

export function ProfileAnalysisTab({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [gameMap, setGameMap] = useState<Map<string, GameInfo>>(new Map());
  const [profileMap, setProfileMap] = useState<Map<string, { name: string; avatar_url: string | null }>>(new Map());

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    setLoading(true);

    // 1. Get user's match_players with match data
    const { data: mpData } = await supabase
      .from("match_players")
      .select("match_id, team, matches!inner(id, team1_score, team2_score, status, created_at, game_id)")
      .eq("user_id", userId);

    if (!mpData || mpData.length === 0) {
      setLoading(false);
      return;
    }

    const matches: MatchRow[] = [];
    const matchIds: string[] = [];
    const gameIds = new Set<string>();

    for (const mp of mpData as any[]) {
      const m = mp.matches;
      if (m.status !== "completed") continue;
      matches.push({
        matchId: m.id,
        team: mp.team,
        team1Score: m.team1_score ?? 0,
        team2Score: m.team2_score ?? 0,
        createdAt: m.created_at,
        gameId: m.game_id,
      });
      matchIds.push(m.id);
      gameIds.add(m.game_id);
    }

    matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllMatches(matches);

    // 2. Get all players for these matches (for partner/opponent analysis)
    if (matchIds.length > 0) {
      const { data: playersData } = await supabase
        .from("match_players")
        .select("match_id, user_id, team")
        .in("match_id", matchIds.slice(0, 200));

      if (playersData) {
        setAllPlayers(playersData.map(p => ({ matchId: p.match_id, userId: p.user_id, team: p.team })));

        // Collect unique user IDs for profile lookup
        const userIds = [...new Set(playersData.map(p => p.user_id).filter(id => id !== userId))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, name, avatar_url")
            .in("user_id", userIds.slice(0, 100));
          if (profiles) {
            setProfileMap(new Map(profiles.map(p => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])));
          }
        }
      }
    }

    // 3. Get game locations and durations
    if (gameIds.size > 0) {
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, location, date_time, end_date_time")
        .in("id", [...gameIds]);
      if (gamesData) {
        setGameMap(new Map(gamesData.map(g => [g.id, { id: g.id, location: g.location, dateTime: g.date_time, endDateTime: g.end_date_time }])));
      }
    }

    setLoading(false);
  };

  // Filter matches by period
  const filtered = useMemo(() => {
    if (period === "all") return allMatches;
    const now = new Date();
    let cutoff: Date;
    if (period === "week") cutoff = startOfDay(subDays(now, 7));
    else if (period === "month") cutoff = startOfDay(subMonths(now, 1));
    else cutoff = startOfDay(subMonths(now, 3));
    return allMatches.filter(m => new Date(m.createdAt) >= cutoff);
  }, [allMatches, period]);

  // Derived stats
  const stats = useMemo(() => {
    const wins = filtered.filter(m => {
      const myScore = m.team === 1 ? m.team1Score : m.team2Score;
      const oppScore = m.team === 1 ? m.team2Score : m.team1Score;
      return myScore > oppScore;
    }).length;
    const losses = filtered.length - wins;
    const winRate = filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;
    return { total: filtered.length, wins, losses, winRate };
  }, [filtered]);

  // Streaks (always computed from filtered, sorted newest first)
  const streaks = useMemo(() => {
    let currentW = 0, currentL = 0, bestW = 0, tempW = 0;
    const sorted = [...filtered]; // already sorted desc
    for (const m of sorted) {
      const won = m.team === 1 ? m.team1Score > m.team2Score : m.team2Score > m.team1Score;
      if (won) { tempW++; if (tempW > bestW) bestW = tempW; }
      else tempW = 0;
    }
    // Current streak from most recent
    for (const m of sorted) {
      const won = m.team === 1 ? m.team1Score > m.team2Score : m.team2Score > m.team1Score;
      if (currentW === 0 && currentL === 0) {
        if (won) currentW = 1; else currentL = 1;
      } else if (currentW > 0 && won) currentW++;
      else if (currentL > 0 && !won) currentL++;
      else break;
    }
    return { currentW, currentL, bestW };
  }, [filtered]);

  // Win rate trend
  const trendData = useMemo(() => {
    if (filtered.length < 3) return [];
    const sorted = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let bucketFormat: string;
    let bucketKey: (d: Date) => string;

    if (period === "week") {
      bucketFormat = "EEE";
      bucketKey = (d) => format(d, "yyyy-MM-dd");
    } else if (period === "month" || period === "3months") {
      bucketKey = (d) => {
        const start = startOfDay(subDays(d, d.getDay()));
        return format(start, "yyyy-MM-dd");
      };
      bucketFormat = "MMM d";
    } else {
      bucketKey = (d) => format(d, "yyyy-MM");
      bucketFormat = "MMM yy";
    }

    const buckets = new Map<string, { wins: number; total: number; date: Date }>();
    for (const m of sorted) {
      const d = new Date(m.createdAt);
      const key = bucketKey(d);
      const bucket = buckets.get(key) || { wins: 0, total: 0, date: d };
      bucket.total++;
      const won = m.team === 1 ? m.team1Score > m.team2Score : m.team2Score > m.team1Score;
      if (won) bucket.wins++;
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([, v]) => ({
        label: period === "week" ? format(v.date, "EEE") : period === "all" ? format(v.date, "MMM yy") : format(v.date, "MMM d"),
        winRate: Math.round((v.wins / v.total) * 100),
      }));
  }, [filtered, period]);

  // Most played partner
  const topPartner = useMemo(() => {
    const matchIds = new Set(filtered.map(m => m.matchId));
    const myTeams = new Map(filtered.map(m => [m.matchId, m.team]));
    const counts = new Map<string, number>();

    for (const p of allPlayers) {
      if (!matchIds.has(p.matchId) || p.userId === userId) continue;
      if (myTeams.get(p.matchId) === p.team) {
        counts.set(p.userId, (counts.get(p.userId) || 0) + 1);
      }
    }

    if (counts.size === 0) return null;
    const [id, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const profile = profileMap.get(id);
    return profile ? { name: profile.name, avatarUrl: profile.avatar_url, count } : null;
  }, [filtered, allPlayers, profileMap, userId]);

  // Toughest opponent
  const toughestOpponent = useMemo(() => {
    const matchIds = new Set(filtered.map(m => m.matchId));
    const myTeams = new Map(filtered.map(m => [m.matchId, m.team]));
    const myResults = new Map(filtered.map(m => {
      const won = m.team === 1 ? m.team1Score > m.team2Score : m.team2Score > m.team1Score;
      return [m.matchId, won];
    }));

    const records = new Map<string, { wins: number; losses: number }>();
    for (const p of allPlayers) {
      if (!matchIds.has(p.matchId) || p.userId === userId) continue;
      if (myTeams.get(p.matchId) !== p.team) {
        const rec = records.get(p.userId) || { wins: 0, losses: 0 };
        if (myResults.get(p.matchId)) rec.losses++; // opponent lost when I won
        else rec.wins++; // opponent won when I lost
        records.set(p.userId, rec);
      }
    }

    // Find opponent with highest win rate against me (min 2 encounters)
    let best: { id: string; wins: number; losses: number; rate: number } | null = null;
    for (const [id, rec] of records) {
      const total = rec.wins + rec.losses;
      if (total < 2) continue;
      const rate = rec.wins / total;
      if (!best || rate > best.rate || (rate === best.rate && (rec.wins + rec.losses) > (best.wins + best.losses))) {
        best = { id, wins: rec.wins, losses: rec.losses, rate };
      }
    }

    if (!best) return null;
    const profile = profileMap.get(best.id);
    return profile ? { name: profile.name, myWins: best.losses, myLosses: best.wins } : null;
  }, [filtered, allPlayers, profileMap, userId]);

  // Favourite location
  const favLocation = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of filtered) {
      const game = gameMap.get(m.gameId);
      if (game) counts.set(game.location, (counts.get(game.location) || 0) + 1);
    }
    if (counts.size === 0) return null;
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [filtered, gameMap]);

  // Hours played (sum of game durations for filtered matches, dedup by gameId)
  const hoursPlayed = useMemo(() => {
    const seenGames = new Set<string>();
    let totalMs = 0;
    for (const m of filtered) {
      if (seenGames.has(m.gameId)) continue;
      seenGames.add(m.gameId);
      const game = gameMap.get(m.gameId);
      if (game && game.endDateTime) {
        const dur = new Date(game.endDateTime).getTime() - new Date(game.dateTime).getTime();
        if (dur > 0) totalMs += dur;
      }
    }
    const hours = totalMs / (1000 * 60 * 60);
    return hours < 10 ? hours.toFixed(1) : Math.round(hours).toString();
  }, [filtered, gameMap]);

  // W/L per location
  const locationStats = useMemo(() => {
    const data = new Map<string, { wins: number; total: number }>();
    for (const m of filtered) {
      const game = gameMap.get(m.gameId);
      if (!game) continue;
      const rec = data.get(game.location) || { wins: 0, total: 0 };
      rec.total++;
      const won = m.team === 1 ? m.team1Score > m.team2Score : m.team2Score > m.team1Score;
      if (won) rec.wins++;
      data.set(game.location, rec);
    }
    return [...data.entries()]
      .map(([loc, r]) => ({ location: loc, winRate: Math.round((r.wins / r.total) * 100), total: r.total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, gameMap]);

  const periodLabel = PERIODS.find(p => p.key === period)?.label || period;
  const hasEnoughData = stats.total >= 3;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-[#E2E8F0] rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              period === p.key
                ? "bg-[#14b8a6] text-white"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
            style={{ fontFamily: SPACE }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!hasEnoughData && (
        <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-6 text-center">
          <p className="text-[#94A3B8] text-sm">
            Not enough data for <span className="font-semibold text-[#64748B]">{periodLabel}</span>. Play more matches to see your stats here.
          </p>
        </div>
      )}

      {/* Overview stats — always shown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Win %", value: `${stats.winRate}%`, icon: Percent, color: "text-[#14b8a6]" },
          { label: "Played", value: stats.total, icon: Trophy, color: "text-amber-500" },
          { label: "Hours", value: hoursPlayed, icon: Clock, color: "text-blue-500" },
        ].map(s => (
          <div key={s.label} className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3 text-center">
            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
            <p className="text-[#0F172A] font-bold text-lg tabular-nums leading-none" style={{ fontFamily: SPACE }}>
              {s.value}
            </p>
            <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* W/L breakdown — only if enough data */}
      {hasEnoughData && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Wins", value: stats.wins, color: "text-emerald-500" },
            { label: "Losses", value: stats.losses, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3 text-center">
              <p className={`font-bold text-lg tabular-nums leading-none ${s.color}`} style={{ fontFamily: SPACE }}>
                {s.value}
              </p>
              <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Win Rate Trend */}
      {hasEnoughData && trendData.length >= 2 && (
        <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
          <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-3">Win Rate Trend</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94A3B8" }} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 11, border: "1px solid #E2E8F0" }}
                  formatter={(v: number) => [`${v}%`, "Win Rate"]}
                />
                <Line type="monotone" dataKey="winRate" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Streaks — always shown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Flame, label: "W Streak", value: streaks.currentW, color: "text-emerald-500" },
          { icon: Trophy, label: "Best W", value: streaks.bestW, color: "text-amber-500" },
          { icon: TrendingDown, label: "L Streak", value: streaks.currentL, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3 text-center">
            <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
            <p className="text-[#0F172A] font-bold text-lg tabular-nums leading-none" style={{ fontFamily: SPACE }}>
              {s.value}
            </p>
            <p className="text-[#94A3B8] text-[10px] font-medium uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Below sections only if enough data */}
      {hasEnoughData && (
        <>
          {/* Most Played Partner */}
          {topPartner && (
            <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#14b8a6]" />
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Most Played Partner</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-sm overflow-hidden shrink-0">
                  {topPartner.avatarUrl ? (
                    <img src={topPartner.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    topPartner.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-[#0F172A] text-sm font-semibold">{topPartner.name}</p>
                  <p className="text-[#94A3B8] text-xs">{topPartner.count} matches together</p>
                </div>
              </div>
            </div>
          )}

          {/* Toughest Opponent */}
          {toughestOpponent && (
            <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="w-4 h-4 text-red-400" />
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Toughest Opponent</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[#0F172A] text-sm font-semibold">{toughestOpponent.name}</p>
                <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: SPACE }}>
                  <span className="text-emerald-500">{toughestOpponent.myWins}W</span>
                  <span className="text-[#CBD5E1] mx-0.5">–</span>
                  <span className="text-red-400">{toughestOpponent.myLosses}L</span>
                </span>
              </div>
            </div>
          )}

          {/* Favourite Location */}
          {favLocation && (
            <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5 text-[#14b8a6]" />
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">Favourite Location</p>
                <p className="text-[#0F172A] font-semibold text-sm mt-0.5" style={{ fontFamily: SPACE }}>{favLocation}</p>
              </div>
            </div>
          )}

          {/* W/L per location */}
          {locationStats.length > 1 && (
            <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
              <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider mb-3">Win Rate by Location</p>
              <div className="space-y-2">
                {locationStats.map(l => (
                  <div key={l.location} className="flex items-center gap-2">
                    <span className="text-[#64748B] text-xs truncate w-24 shrink-0">{l.location}</span>
                    <div className="flex-1 h-5 bg-[#F1F5F9] rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-[#14b8a6]/20 rounded-lg transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(l.winRate, 8)}%` }}
                      >
                        <span className="text-[10px] text-[#14b8a6] font-semibold" style={{ fontFamily: SPACE }}>
                          {l.winRate}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#CBD5E1] w-4 text-right">{l.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
