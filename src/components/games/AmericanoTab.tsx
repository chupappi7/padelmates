import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, ChevronDown, ChevronRight, Lock, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface Player {
  id: string;
  user_id: string;
  role: string;
  profiles: Profile | null;
}

interface AmericanoConfig {
  id: string;
  game_id: string;
  courts: number;
  points_per_match: number;
  locked: boolean;
}

interface AmericanoMatch {
  id: string;
  game_id: string;
  round_number: number;
  court_number: number;
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
  team1_score: number | null;
  team2_score: number | null;
  status: string;
}

interface Standing {
  id: string;
  game_id: string;
  user_id: string;
  wins: number;
  ties: number;
  losses: number;
  points_for: number;
  points_against: number;
  matches_played: number;
}

interface AmericanoTabProps {
  gameId: string;
  canManage: boolean;
  players: Player[];
  hostIsPlaying: boolean;
  hostId: string;
  hostProfile: Profile | null;
  currentUserId?: string;
  guestNames?: string[];
}

// Generate a deterministic fake UUID for a guest by index
const guestUUID = (index: number) =>
  `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;

// Round-robin schedule: fix player 0, rotate rest
function generateRoundRobin(playerIds: string[]): { round: number; matches: [string, string, string, string][] }[] {
  const n = playerIds.length;
  const rounds: { round: number; matches: [string, string, string, string][] }[] = [];
  const ids = [...playerIds];

  // If odd, this shouldn't happen (validated elsewhere), but handle gracefully
  if (n % 4 !== 0 || n < 4) return rounds;

  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const currentOrder = [fixed, ...rotating];
    const matchesInRound: [string, string, string, string][] = [];

    // Pair positions: (0,1) vs (2,3), (4,5) vs (6,7), etc.
    for (let m = 0; m < n / 4; m++) {
      const idx = m * 4;
      matchesInRound.push([
        currentOrder[idx],
        currentOrder[idx + 1],
        currentOrder[idx + 2],
        currentOrder[idx + 3],
      ]);
    }

    rounds.push({ round: r + 1, matches: matchesInRound });

    // Rotate: move last to position 0 of rotating array
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

export function AmericanoTab({
  gameId,
  canManage,
  players,
  hostIsPlaying,
  hostId,
  hostProfile,
  currentUserId,
  guestNames = [],
}: AmericanoTabProps) {
  const [config, setConfig] = useState<AmericanoConfig | null>(null);
  const [matches, setMatches] = useState<AmericanoMatch[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [scoringMatch, setScoringMatch] = useState<AmericanoMatch | null>(null);
  const [scoreT1, setScoreT1] = useState(0);
  const [scoreT2, setScoreT2] = useState(0);

  // Setup state
  const [setupCourts, setSetupCourts] = useState(1);
  const [setupPoints, setSetupPoints] = useState(24);

  // Build guest player entries with deterministic UUIDs
  const guestPlayers: Player[] = guestNames.map((name, i) => ({
    id: `guest-${i}`,
    user_id: guestUUID(i),
    role: "guest",
    profiles: { name: `${name} (Guest)`, avatar_url: null },
  }));

  const guestMap = new Map<string, string>();
  guestNames.forEach((name, i) => guestMap.set(guestUUID(i), `${name} (Guest)`));

  const allPlayers = [
    ...(hostIsPlaying && hostProfile
      ? [{ id: "host", user_id: hostId, role: "host", profiles: hostProfile }]
      : []),
    ...players,
    ...guestPlayers,
  ];

  const totalPlayers = allPlayers.length;
  const requiredCourts = Math.floor(totalPlayers / 4);
  const totalRounds = totalPlayers > 0 ? totalPlayers - 1 : 0;

  const fetchAll = useCallback(async () => {
    const [configRes, matchesRes, standingsRes] = await Promise.all([
      supabase.from("americano_config").select("*").eq("game_id", gameId).maybeSingle(),
      supabase.from("americano_matches").select("*").eq("game_id", gameId).order("round_number").order("court_number"),
      supabase.from("americano_standings").select("*").eq("game_id", gameId),
    ]);

    if (configRes.data) setConfig(configRes.data as AmericanoConfig);
    const m = (matchesRes.data || []) as AmericanoMatch[];
    setMatches(m);
    setStandings((standingsRes.data || []) as Standing[]);

    // Fetch profiles for all player UUIDs in matches
    const uids = new Set<string>();
    m.forEach((match) => {
      [match.team1_player1, match.team1_player2, match.team2_player1, match.team2_player2].forEach((u) => uids.add(u));
    });
    allPlayers.forEach((p) => uids.add(p.user_id));

    if (uids.size > 0) {
      const realUids = Array.from(uids).filter((id) => !guestMap.has(id));
      const map: Record<string, Profile> = {};
      // Pre-populate guest profiles
      guestMap.forEach((name, uuid) => { map[uuid] = { name, avatar_url: null }; });
      if (realUids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", realUids);
        profs?.forEach((p) => { map[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });
      }
      // Add host profile
      if (hostProfile) map[hostId] = hostProfile;
      setProfiles(map);
    }

    // Auto-expand active round
    if (m.length > 0) {
      const completedRounds = new Set<number>();
      const roundNumbers = [...new Set(m.map((x) => x.round_number))];
      roundNumbers.forEach((rn) => {
        const roundMatches = m.filter((x) => x.round_number === rn);
        if (roundMatches.every((x) => x.status === "completed")) completedRounds.add(rn);
      });
      const activeRound = roundNumbers.find((rn) => !completedRounds.has(rn)) || roundNumbers[roundNumbers.length - 1];
      setExpandedRounds(new Set([activeRound]));
    }

    setLoading(false);
  }, [gameId, guestNames]);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`americano-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "americano_matches", filter: `game_id=eq.${gameId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "americano_standings", filter: `game_id=eq.${gameId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId, fetchAll]);

  useEffect(() => {
    if (requiredCourts > 0) setSetupCourts(requiredCourts);
  }, [requiredCourts]);

  const handleGenerateSchedule = async () => {
    if (totalPlayers < 4) { toast.error("Need at least 4 players"); return; }
    if (totalPlayers % 4 !== 0) { toast.error(`Need players divisible by 4 (currently ${totalPlayers})`); return; }
    if (setupCourts !== requiredCourts) { toast.error(`Courts must be ${requiredCourts} (players / 4)`); return; }

    setGenerating(true);
    try {
      // Save config
      const { error: cfgError } = await supabase.from("americano_config").upsert({
        game_id: gameId,
        courts: setupCourts,
        points_per_match: setupPoints,
        locked: false,
      }, { onConflict: "game_id" });
      if (cfgError) throw cfgError;

      // Delete existing matches & standings
      await supabase.from("americano_matches").delete().eq("game_id", gameId);
      await supabase.from("americano_standings").delete().eq("game_id", gameId);

      const playerIds = allPlayers.map((p) => p.user_id);
      const schedule = generateRoundRobin(playerIds);

      // Insert all matches
      const matchInserts = schedule.flatMap((round) =>
        round.matches.map((m, courtIdx) => ({
          game_id: gameId,
          round_number: round.round,
          court_number: courtIdx + 1,
          team1_player1: m[0],
          team1_player2: m[1],
          team2_player1: m[2],
          team2_player2: m[3],
        }))
      );
      const { error: mError } = await supabase.from("americano_matches").insert(matchInserts);
      if (mError) throw mError;

      // Insert standings for all players
      const standingInserts = playerIds.map((uid) => ({ game_id: gameId, user_id: uid }));
      const { error: sError } = await supabase.from("americano_standings").insert(standingInserts);
      if (sError) throw sError;

      toast.success(`Schedule generated! ${schedule.length} rounds, ${matchInserts.length} matches`);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate schedule");
    }
    setGenerating(false);
  };

  const handleSubmitScore = async () => {
    if (!scoringMatch || !config) return;
    const total = scoreT1 + scoreT2;
    if (total !== config.points_per_match) {
      toast.error(`Scores must sum to ${config.points_per_match} (currently ${total})`);
      return;
    }

    try {
      // Update match score
      const { error } = await supabase.from("americano_matches").update({
        team1_score: scoreT1,
        team2_score: scoreT2,
        status: "completed",
      }).eq("id", scoringMatch.id);
      if (error) throw error;

      // Lock config if first score
      if (!config.locked) {
        await supabase.from("americano_config").update({ locked: true }).eq("id", config.id);
      }

      // Recalculate all standings from scratch
      await recalculateStandings();

      toast.success("Score saved!");
      setScoringMatch(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to save score");
    }
  };

  const recalculateStandings = async () => {
    // Fetch all completed matches
    const { data: allMatches } = await supabase
      .from("americano_matches")
      .select("*")
      .eq("game_id", gameId)
      .eq("status", "completed");

    if (!allMatches) return;

    const stats: Record<string, { w: number; t: number; l: number; pf: number; pa: number; mp: number }> = {};
    const playerIds = allPlayers.map((p) => p.user_id);
    playerIds.forEach((uid) => { stats[uid] = { w: 0, t: 0, l: 0, pf: 0, pa: 0, mp: 0 }; });

    (allMatches as AmericanoMatch[]).forEach((m) => {
      const t1s = m.team1_score ?? 0;
      const t2s = m.team2_score ?? 0;
      const team1 = [m.team1_player1, m.team1_player2];
      const team2 = [m.team2_player1, m.team2_player2];

      team1.forEach((uid) => {
        if (!stats[uid]) stats[uid] = { w: 0, t: 0, l: 0, pf: 0, pa: 0, mp: 0 };
        stats[uid].pf += t1s;
        stats[uid].pa += t2s;
        stats[uid].mp += 1;
        if (t1s > t2s) stats[uid].w += 1;
        else if (t1s === t2s) stats[uid].t += 1;
        else stats[uid].l += 1;
      });

      team2.forEach((uid) => {
        if (!stats[uid]) stats[uid] = { w: 0, t: 0, l: 0, pf: 0, pa: 0, mp: 0 };
        stats[uid].pf += t2s;
        stats[uid].pa += t1s;
        stats[uid].mp += 1;
        if (t2s > t1s) stats[uid].w += 1;
        else if (t2s === t1s) stats[uid].t += 1;
        else stats[uid].l += 1;
      });
    });

    // Update each standing
    for (const uid of Object.keys(stats)) {
      const s = stats[uid];
      await supabase.from("americano_standings").update({
        wins: s.w,
        ties: s.t,
        losses: s.l,
        points_for: s.pf,
        points_against: s.pa,
        matches_played: s.mp,
      }).eq("game_id", gameId).eq("user_id", uid);
    }
  };

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  const getName = (uid: string) => profiles[uid]?.name?.split(" ")[0] || "Player";
  const getAvatar = (uid: string) => profiles[uid]?.avatar_url || undefined;
  const getInitial = (uid: string) => profiles[uid]?.name?.charAt(0).toUpperCase() || "?";

  // Compute rounds completed
  const roundNumbers = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b);
  const completedRoundsCount = roundNumbers.filter((rn) => matches.filter((m) => m.round_number === rn).every((m) => m.status === "completed")).length;

  // Sort standings: P+ desc, +- desc, W desc
  const sortedStandings = [...standings].sort((a, b) => {
    const diffA = a.points_for - a.points_against;
    const diffB = b.points_for - b.points_against;
    if (b.points_for !== a.points_for) return b.points_for - a.points_for;
    if (diffB !== diffA) return diffB - diffA;
    return b.wins - a.wins;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasSchedule = matches.length > 0;
  const isLocked = config?.locked ?? false;
  const allCompleted = hasSchedule && matches.every((m) => m.status === "completed");

  return (
    <div className="space-y-4">
      {/* Setup Phase — no schedule yet */}
      {!hasSchedule && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div className="text-center space-y-1">
            <Trophy className="w-10 h-10 text-primary mx-auto" />
            <h3 className="font-display font-bold text-lg">Americano Setup</h3>
            <p className="text-sm text-muted-foreground">
              {totalPlayers < 4
                ? `Need at least 4 confirmed players (currently ${totalPlayers}).`
                : totalPlayers % 4 !== 0
                ? `Need players divisible by 4 (currently ${totalPlayers}).`
                : canManage
                ? "Configure and generate the schedule."
                : "Waiting for the host to generate the schedule."}
            </p>
          </div>

          {canManage && totalPlayers >= 4 && totalPlayers % 4 === 0 && (
            <div className="space-y-4">
              {/* Courts */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Courts</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm px-3 py-1.5 tabular-nums">
                    {requiredCourts}
                  </Badge>
                  <span className="text-xs text-muted-foreground">= {totalPlayers} players ÷ 4</span>
                </div>
              </div>

              {/* Points per match */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Points per match</label>
                <div className="flex gap-1.5">
                  {[16, 24, 32].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setSetupPoints(pts)}
                      className={cn(
                        "flex-1 h-10 rounded-lg text-sm font-semibold transition-all",
                        setupPoints === pts
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-0.5">
                <p><strong>{totalPlayers}</strong> players · <strong>{totalRounds}</strong> rounds · <strong>{requiredCourts}</strong> court{requiredCourts > 1 ? "s" : ""}</p>
                <p>Each player plays every other player exactly once</p>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleGenerateSchedule}
                disabled={generating}
              >
                <Trophy className="w-4 h-4" />
                {generating ? "Generating..." : "Generate Schedule"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {hasSchedule && standings.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-border">
          <div className="bg-[hsl(220_25%_12%)] px-4 py-3 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Leaderboard
            </h3>
            <span className="text-[11px] text-white/60 tabular-nums">
              {completedRoundsCount}/{totalRounds} rounds
            </span>
          </div>

          <div className="bg-[hsl(220_25%_10%)] overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/40 uppercase tracking-wider">
                  <th className="text-left pl-4 pr-1 py-2 font-medium">#</th>
                  <th className="text-left px-1 py-2 font-medium">Name</th>
                  <th className="text-center px-1 py-2 font-medium w-8">W</th>
                  <th className="text-center px-1 py-2 font-medium w-8">T</th>
                  <th className="text-center px-1 py-2 font-medium w-8">L</th>
                  <th className="text-center px-1 py-2 font-medium w-10 text-primary">P+</th>
                  <th className="text-center px-1 py-2 font-medium w-10">P-</th>
                  <th className="text-center px-1 pr-4 py-2 font-medium w-10">+-</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((s, idx) => {
                  const isMe = s.user_id === currentUserId;
                  const diff = s.points_for - s.points_against;
                  const medal = allCompleted && idx === 0 ? "🥇" : allCompleted && idx === 1 ? "🥈" : allCompleted && idx === 2 ? "🥉" : null;

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-t border-white/5 transition-colors",
                        isMe && "bg-primary/10 border-l-2 border-l-primary",
                        allCompleted && idx === 0 && "bg-yellow-500/10",
                        allCompleted && idx === 1 && "bg-gray-300/10",
                        allCompleted && idx === 2 && "bg-amber-700/10"
                      )}
                    >
                      <td className="pl-4 pr-1 py-2 text-white/60 tabular-nums">
                        {medal || idx + 1}
                      </td>
                      <td className="px-1 py-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={getAvatar(s.user_id)} />
                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                              {getInitial(s.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn("text-white truncate max-w-[80px]", isMe && "font-semibold text-primary")}>
                            {getName(s.user_id)}
                            {isMe && <span className="text-primary/60 text-[9px] ml-0.5">(You)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="text-center px-1 py-2 text-white tabular-nums font-medium">{s.wins}</td>
                      <td className="text-center px-1 py-2 text-white/60 tabular-nums">{s.ties}</td>
                      <td className="text-center px-1 py-2 text-white/60 tabular-nums">{s.losses}</td>
                      <td className="text-center px-1 py-2 text-primary tabular-nums font-bold">{s.points_for}</td>
                      <td className="text-center px-1 py-2 text-white/40 tabular-nums">{s.points_against}</td>
                      <td className={cn(
                        "text-center px-1 pr-4 py-2 tabular-nums font-medium",
                        diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-white/40"
                      )}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule */}
      {hasSchedule && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-bold text-sm">Schedule</h3>
            {isLocked && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Lock className="w-3 h-3" /> Locked
              </Badge>
            )}
          </div>

          {roundNumbers.map((roundNum) => {
            const roundMatches = matches.filter((m) => m.round_number === roundNum);
            const roundCompleted = roundMatches.every((m) => m.status === "completed");
            const isExpanded = expandedRounds.has(roundNum);

            // Check if previous round is completed (to determine if this round is active)
            const prevRoundNum = roundNumbers[roundNumbers.indexOf(roundNum) - 1];
            const prevCompleted = prevRoundNum === undefined || matches.filter((m) => m.round_number === prevRoundNum).every((m) => m.status === "completed");
            const isActive = !roundCompleted && prevCompleted;

            return (
              <div key={roundNum} className={cn(
                "bg-card border rounded-xl overflow-hidden transition-colors",
                isActive ? "border-primary/30" : "border-border"
              )}>
                <button
                  onClick={() => toggleRound(roundNum)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={roundCompleted ? "default" : isActive ? "outline" : "secondary"} className={cn(
                      "text-[10px] rounded-full",
                      roundCompleted && "bg-success text-success-foreground",
                      isActive && "border-primary text-primary"
                    )}>
                      R{roundNum}
                    </Badge>
                    <span className="text-xs font-medium">
                      {roundCompleted ? "Completed" : isActive ? "Active" : "Upcoming"}
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-2">
                        {roundMatches.map((match) => {
                          const isMatchCompleted = match.status === "completed";
                          const t1s = match.team1_score ?? 0;
                          const t2s = match.team2_score ?? 0;
                          const isPlayerInMatch = currentUserId && [match.team1_player1, match.team1_player2, match.team2_player1, match.team2_player2].includes(currentUserId);

                          return (
                            <div
                              key={match.id}
                              className={cn(
                                "rounded-lg border p-3",
                                isPlayerInMatch ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/30"
                              )}
                            >
                              {/* Court label */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Court {match.court_number}</span>
                                {isMatchCompleted && (
                                  <Badge className="bg-success/10 text-success border-0 text-[9px] rounded-full h-4 px-1.5">Done</Badge>
                                )}
                              </div>

                              {/* Teams */}
                              <div className="flex items-center">
                                {/* Team 1 */}
                                <div className="flex-1 space-y-1 min-w-0">
                                  {[match.team1_player1, match.team1_player2].map((uid) => (
                                    <div key={uid} className="flex items-center justify-end gap-1.5">
                                      <span className={cn("text-[11px] font-medium truncate", uid === currentUserId && "text-primary font-semibold")}>{getName(uid)}</span>
                                      <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={getAvatar(uid)} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitial(uid)}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  ))}
                                </div>

                                {/* Score */}
                                <div className="flex items-center gap-1.5 px-3 shrink-0">
                                  <span className={cn(
                                    "text-2xl font-bold tabular-nums",
                                    isMatchCompleted && t1s > t2s && "text-success"
                                  )}>
                                    {isMatchCompleted ? t1s : "-"}
                                  </span>
                                  <span className="text-muted-foreground">–</span>
                                  <span className={cn(
                                    "text-2xl font-bold tabular-nums",
                                    isMatchCompleted && t2s > t1s && "text-success"
                                  )}>
                                    {isMatchCompleted ? t2s : "-"}
                                  </span>
                                </div>

                                {/* Team 2 */}
                                <div className="flex-1 space-y-1 min-w-0">
                                  {[match.team2_player1, match.team2_player2].map((uid) => (
                                    <div key={uid} className="flex items-center gap-1.5">
                                      <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarImage src={getAvatar(uid)} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitial(uid)}</AvatarFallback>
                                      </Avatar>
                                      <span className={cn("text-[11px] font-medium truncate", uid === currentUserId && "text-primary font-semibold")}>{getName(uid)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Score button */}
                              {canManage && isActive && (
                                <Button
                                  size="sm"
                                  variant={isMatchCompleted ? "outline" : "hero"}
                                  className="w-full h-8 text-[11px] mt-2"
                                  onClick={() => {
                                    setScoringMatch(match);
                                    setScoreT1(match.team1_score ?? 0);
                                    setScoreT2(match.team2_score ?? 0);
                                  }}
                                >
                                  {isMatchCompleted ? "Edit Score" : "Enter Score"}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Regenerate button (only if not locked) */}
      {canManage && hasSchedule && !isLocked && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleGenerateSchedule}
          disabled={generating}
        >
          {generating ? "Regenerating..." : "Regenerate Schedule"}
        </Button>
      )}

      {/* Score Dialog */}
      <Dialog open={!!scoringMatch} onOpenChange={(open) => { if (!open) setScoringMatch(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Enter Score</DialogTitle>
          </DialogHeader>
          {scoringMatch && config && (
            <div className="space-y-4">
              {/* Team labels */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{getName(scoringMatch.team1_player1)} & {getName(scoringMatch.team1_player2)}</span>
                <span>vs</span>
                <span className="font-medium">{getName(scoringMatch.team2_player1)} & {getName(scoringMatch.team2_player2)}</span>
              </div>

              {/* Score inputs */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center space-y-1">
                  <label className="text-[10px] text-muted-foreground">Team 1</label>
                  <input
                    type="number"
                    min={0}
                    max={config.points_per_match}
                    value={scoreT1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setScoreT1(v);
                      setScoreT2(config.points_per_match - v);
                    }}
                    className="w-20 h-14 text-center text-3xl font-bold bg-muted border border-border rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-xl text-muted-foreground font-bold pt-4">–</span>
                <div className="text-center space-y-1">
                  <label className="text-[10px] text-muted-foreground">Team 2</label>
                  <input
                    type="number"
                    min={0}
                    max={config.points_per_match}
                    value={scoreT2}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setScoreT2(v);
                      setScoreT1(config.points_per_match - v);
                    }}
                    className="w-20 h-14 text-center text-3xl font-bold bg-muted border border-border rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Total validation */}
              <p className={cn(
                "text-center text-xs tabular-nums",
                scoreT1 + scoreT2 === config.points_per_match ? "text-success" : "text-destructive"
              )}>
                Total: {scoreT1 + scoreT2} / {config.points_per_match}
              </p>

              <Button
                variant="hero"
                className="w-full"
                disabled={scoreT1 + scoreT2 !== config.points_per_match}
                onClick={handleSubmitScore}
              >
                Save Score
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* End Event */}
      {canManage && allCompleted && hasSchedule && (
        <Button
          variant="hero"
          size="sm"
          className="w-full h-10 gap-1.5"
          onClick={async () => {
            try {
              // Update games_played for all real players
              for (const s of standings) {
                const { data } = await supabase.from("profiles").select("games_played").eq("user_id", s.user_id).single();
                await supabase.from("profiles").update({ games_played: (data?.games_played ?? 0) + 1 }).eq("user_id", s.user_id);
              }

              // Notify all players
              const top3 = sortedStandings.slice(0, 3);
              const medals = ["🥇", "🥈", "🥉"];
              const standingsText = top3.map((s, i) => `${medals[i]} ${getName(s.user_id)}: ${s.points_for}pts`).join(" · ");

              for (const p of allPlayers) {
                if (p.user_id === hostId) continue;
                await supabase.from("notifications").insert({
                  user_id: p.user_id,
                  type: "announcement",
                  title: "Americano Results",
                  message: standingsText,
                  link: `/games/${gameId}`,
                });
              }

              toast.success("Tournament ended! Stats updated & players notified 🏆");
            } catch {
              toast.error("Failed to end tournament");
            }
          }}
        >
          <Crown className="w-4 h-4" />
          End Tournament & Notify Players
        </Button>
      )}
    </div>
  );
}
