import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScoreScrollPicker } from "@/components/games/ScoreScrollPicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Shuffle, Trash2, Users, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface MatchPlayer {
  id: string;
  match_id: string;
  user_id: string;
  team: number;
  profiles?: Profile | null;
}

interface Match {
  id: string;
  game_id: string;
  round_number: number;
  team1_score: number;
  team2_score: number;
  status: string;
  created_at: string;
  set_scores: Array<{t1: number; t2: number}> | null;
  match_players: MatchPlayer[];
}

interface MatchesTabProps {
  gameId: string;
  canManage: boolean;
  players: Player[];
  hostIsPlaying: boolean;
  hostId: string;
  hostProfile: Profile | null;
  guestNames?: string[];
}

// Generate a deterministic fake UUID for a guest by index
const guestUUID = (index: number) =>
  `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;

export function MatchesTab({
  gameId,
  canManage,
  players,
  hostIsPlaying,
  hostId,
  hostProfile,
  guestNames = [],
}: MatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [team1Picks, setTeam1Picks] = useState<string[]>([]);
  const [team2Picks, setTeam2Picks] = useState<string[]>([]);

  // Build guest player entries with deterministic UUIDs
  const guestPlayers: Player[] = guestNames.map((name, i) => ({
    id: `guest-${i}`,
    user_id: guestUUID(i),
    role: "guest",
    profiles: { name: `${name} (Guest)`, avatar_url: null },
  }));

  // Build a lookup map for guest UUIDs → names (for rendering saved matches)
  const guestMap = new Map<string, string>();
  guestNames.forEach((name, i) => guestMap.set(guestUUID(i), `${name} (Guest)`));

  // All available players (including host if playing + guests)
  const allPlayers = [
    ...(hostIsPlaying && hostProfile
      ? [{ id: "host", user_id: hostId, role: "host", profiles: hostProfile }]
      : []),
    ...players,
    ...guestPlayers,
  ];

  const totalPlayerCount = allPlayers.length;

  const fetchMatches = useCallback(async () => {
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("game_id", gameId)
      .order("round_number", { ascending: true });

    if (matchesData && matchesData.length > 0) {
      const matchIds = matchesData.map((m) => m.id);
      const { data: mpData } = await supabase
        .from("match_players")
        .select("*")
        .in("match_id", matchIds);

      // Fetch profiles for match players (skip guest UUIDs)
      const playerUserIds = [...new Set((mpData || []).map((mp) => mp.user_id))];
      const realUserIds = playerUserIds.filter((id) => !guestMap.has(id));
      const profileMap: Record<string, Profile> = {};

      // Pre-populate guest profiles from the map
      guestMap.forEach((name, uuid) => {
        profileMap[uuid] = { name, avatar_url: null };
      });

      if (realUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", realUserIds);
        profiles?.forEach((p) => {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        });
      }

      const enriched = matchesData.map((m) => ({
        ...m,
        team1_score: m.team1_score ?? 0,
        team2_score: m.team2_score ?? 0,
        set_scores: (Array.isArray(m.set_scores) ? m.set_scores : []) as Array<{t1: number; t2: number}>,
        match_players: (mpData || [])
          .filter((mp) => mp.match_id === m.id)
          .map((mp) => ({ ...mp, profiles: profileMap[mp.user_id] || null })),
      }));
      setMatches(enriched);
    } else {
      setMatches([]);
    }
    setLoading(false);
  }, [gameId, guestNames]);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`matches-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `game_id=eq.${gameId}` }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players" }, () => fetchMatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, fetchMatches]);

  const nextRoundNumber = matches.length > 0 ? Math.max(...matches.map((m) => m.round_number)) + 1 : 1;

  const handleGenerateRandom = async () => {
    if (allPlayers.length < 4) {
      toast.error("Need at least 4 players to generate matches");
      return;
    }

    setGenerating(true);
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    const matchCount = Math.floor(shuffled.length / 4);
    if (matchCount === 0) {
      toast.error("Need at least 4 players");
      setGenerating(false);
      return;
    }

    try {
      for (let i = 0; i < matchCount; i++) {
        const group = shuffled.slice(i * 4, i * 4 + 4);
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert({ game_id: gameId, round_number: nextRoundNumber + i })
          .select()
          .single();
        if (matchError) throw matchError;

        const matchPlayers = group.map((p, idx) => ({
          match_id: matchData.id,
          user_id: p.user_id,
          team: idx < 2 ? 1 : 2,
        }));
        const { error: mpError } = await supabase.from("match_players").insert(matchPlayers);
        if (mpError) throw mpError;
      }
      toast.success(`Generated ${matchCount} match${matchCount > 1 ? "es" : ""} with random teams!`);
      fetchMatches();
    } catch {
      toast.error("Failed to generate matches");
    }
    setGenerating(false);
  };

  const handleCreateChosenMatch = async () => {
    if (team1Picks.length !== 2 || team2Picks.length !== 2) {
      toast.error("Select exactly 2 players per team");
      return;
    }

    setGenerating(true);

    try {
      // If editing, delete old match_players and update
      if (editingMatchId) {
        await supabase.from("match_players").delete().eq("match_id", editingMatchId);
        const matchPlayers = [
          ...team1Picks.map((uid) => ({ match_id: editingMatchId, user_id: uid, team: 1 })),
          ...team2Picks.map((uid) => ({ match_id: editingMatchId, user_id: uid, team: 2 })),
        ];
        const { error: mpError } = await supabase.from("match_players").insert(matchPlayers);
        if (mpError) throw mpError;

        toast.success("Teams updated!");
      } else {
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert({ game_id: gameId, round_number: nextRoundNumber })
          .select()
          .single();
        if (matchError) throw matchError;

        const matchPlayers = [
          ...team1Picks.map((uid) => ({ match_id: matchData.id, user_id: uid, team: 1 })),
          ...team2Picks.map((uid) => ({ match_id: matchData.id, user_id: uid, team: 2 })),
        ];
        const { error: mpError } = await supabase.from("match_players").insert(matchPlayers);
        if (mpError) throw mpError;

        toast.success("Match created with chosen teams!");
      }

      setShowTeamPicker(false);
      setEditingMatchId(null);
      setTeam1Picks([]);
      setTeam2Picks([]);
      fetchMatches();
    } catch {
      toast.error("Failed to save match");
    }
    setGenerating(false);
  };

  const openEditTeams = (match: Match) => {
    const t1 = match.match_players.filter((mp) => mp.team === 1).map((mp) => mp.user_id);
    const t2 = match.match_players.filter((mp) => mp.team === 2).map((mp) => mp.user_id);
    setTeam1Picks(t1);
    setTeam2Picks(t2);
    setEditingMatchId(match.id);
    setShowTeamPicker(true);
  };

  const togglePlayerPick = (userId: string, team: 1 | 2) => {
    if (team === 1) {
      if (team1Picks.includes(userId)) {
        setTeam1Picks((p) => p.filter((id) => id !== userId));
      } else if (team1Picks.length < 2) {
        setTeam2Picks((p) => p.filter((id) => id !== userId));
        setTeam1Picks((p) => [...p, userId]);
      }
    } else {
      if (team2Picks.includes(userId)) {
        setTeam2Picks((p) => p.filter((id) => id !== userId));
      } else if (team2Picks.length < 2) {
        setTeam1Picks((p) => p.filter((id) => id !== userId));
        setTeam2Picks((p) => [...p, userId]);
      }
    }
  };

  const handleSubmitScore = async (setScores: Array<{t1: number; t2: number}>, setsWonT1: number, setsWonT2: number) => {
    if (!scoringMatchId) return;

    const { error } = await supabase
      .from("matches")
      .update({
        team1_score: setsWonT1,
        team2_score: setsWonT2,
        set_scores: setScores,
        status: "completed",
      })
      .eq("id", scoringMatchId);

    if (error) {
      toast.error("Failed to submit score");
    } else {
      toast.success("Score saved!");
      setScoringMatchId(null);
      fetchMatches();
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) toast.error("Failed to delete match");
    else {
      toast.success("Match deleted");
      fetchMatches();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* No matches state */}
      {matches.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-display font-bold text-lg mb-1">No Matches Yet</h3>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? allPlayers.length < 4
                  ? `Need at least 4 confirmed players (currently ${allPlayers.length}).`
                  : "Create matches to start tracking scores."
                : "Matches will appear here once the host creates them."}
            </p>
          </div>
          {canManage && allPlayers.length >= 4 && (
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="hero"
                size="sm"
                onClick={handleGenerateRandom}
                disabled={generating}
                className="gap-1.5 w-full"
              >
                <Shuffle className="w-4 h-4" />
                {generating ? "Generating..." : "Random Teams"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTeam1Picks([]);
                  setTeam2Picks([]);
                  setEditingMatchId(null);
                  setShowTeamPicker(true);
                }}
                className="gap-1.5 w-full"
              >
                <Users className="w-4 h-4" />
                Choose Teams
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Match cards */}
      {matches.map((match) => {
        const team1 = match.match_players.filter((mp) => mp.team === 1);
        const team2 = match.match_players.filter((mp) => mp.team === 2);
        const isCompleted = match.status === "completed";

        return (
          <div
            key={match.id}
            className={cn(
              "bg-card border rounded-xl overflow-hidden",
              isCompleted ? "border-border" : "border-primary/20"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs rounded-full">
                  Round {match.round_number}
                </Badge>
                {isCompleted ? (
                  <Badge className="bg-success/10 text-success border-0 text-xs rounded-full">
                    Completed
                  </Badge>
                ) : (
                  <Badge className="bg-warning/10 text-warning border-0 text-xs rounded-full">
                    In Progress
                  </Badge>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditTeams(match)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50"
                    title="Edit teams"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMatch(match.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                    title="Delete match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Side-by-side layout: Team 1 | Score | Team 2 */}
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center">
                {/* Team 1 — right-aligned names, avatars on right */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {team1.map((mp) => (
                    <div key={mp.id} className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-medium truncate">{mp.profiles?.name?.split(" ")[0] || "Player"}</span>
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={mp.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {mp.profiles?.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>

                {/* Center score */}
                <div className="flex flex-col items-center px-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-3xl font-bold tabular-nums",
                      isCompleted && match.team1_score > match.team2_score && "text-success"
                    )}>
                      {match.team1_score}
                    </span>
                    <span className="text-muted-foreground text-xl">–</span>
                    <span className={cn(
                      "text-3xl font-bold tabular-nums",
                      isCompleted && match.team2_score > match.team1_score && "text-success"
                    )}>
                      {match.team2_score}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider -mt-0.5">Sets</p>
                </div>

                {/* Team 2 — left-aligned names, avatars on left */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {team2.map((mp) => (
                    <div key={mp.id} className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={mp.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {mp.profiles?.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{mp.profiles?.name?.split(" ")[0] || "Player"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Set score pills */}
              {match.set_scores && match.set_scores.length > 0 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {match.set_scores.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold tabular-nums">
                      <span className={cn(s.t1 > s.t2 ? "text-success" : "text-muted-foreground")}>{s.t1}</span>
                      <span className="text-muted-foreground/40">-</span>
                      <span className={cn(s.t2 > s.t1 ? "text-success" : "text-muted-foreground")}>{s.t2}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Score button */}
            {canManage && (
              <div className="px-4 pb-3">
                <Button
                  size="sm"
                  variant={isCompleted ? "outline" : "hero"}
                  className="w-full h-9 text-xs"
                  onClick={() => setScoringMatchId(match.id)}
                >
                  {isCompleted ? "Edit Score" : "Enter Score"}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Next Round button — shown when matches exist */}
      {canManage && matches.length > 0 && allPlayers.length >= 4 && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="hero"
            size="sm"
            onClick={handleGenerateRandom}
            disabled={generating}
            className="gap-1.5 h-10"
          >
            <Shuffle className="w-4 h-4" />
            {generating ? "Generating..." : "Randomize"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTeam1Picks([]);
              setTeam2Picks([]);
              setEditingMatchId(null);
              setShowTeamPicker(true);
            }}
            className="gap-1.5 h-10"
          >
            <Users className="w-4 h-4" />
            Choose Teams
          </Button>
        </div>
      )}

      {/* Choose / Edit Teams Dialog */}
      <Dialog open={showTeamPicker} onOpenChange={(open) => {
        if (!open) { setEditingMatchId(null); }
        setShowTeamPicker(open);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMatchId ? "Edit Teams" : "Choose Teams"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Team 1 ({team1Picks.length}/2)
              </p>
              <div className="flex flex-wrap gap-2">
                {allPlayers.map((p) => {
                  const picked = team1Picks.includes(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => togglePlayerPick(p.user_id, 1)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                        picked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={p.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {p.profiles?.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {p.profiles?.name || "Player"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Team 2 ({team2Picks.length}/2)
              </p>
              <div className="flex flex-wrap gap-2">
                {allPlayers.map((p) => {
                  const picked = team2Picks.includes(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => togglePlayerPick(p.user_id, 2)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                        picked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={p.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {p.profiles?.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {p.profiles?.name || "Player"}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={team1Picks.length !== 2 || team2Picks.length !== 2 || generating}
              onClick={handleCreateChosenMatch}
            >
              {generating ? "Saving..." : editingMatchId ? "Save Teams" : "Create Match"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Score Scroll Picker */}
      {scoringMatchId && (() => {
        const m = matches.find((x) => x.id === scoringMatchId);
        if (!m) return null;
        return (
          <ScoreScrollPicker
            open={true}
            onOpenChange={(open) => { if (!open) setScoringMatchId(null); }}
            setScores={Array.isArray(m.set_scores) ? (m.set_scores as Array<{t1: number; t2: number}>) : []}
            onConfirm={handleSubmitScore}
          />
        );
      })()}
    </div>
  );
}
