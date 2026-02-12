import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Shuffle, Plus, Check, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  match_players: MatchPlayer[];
}

interface MatchesTabProps {
  gameId: string;
  canManage: boolean;
  players: Player[];
  hostIsPlaying: boolean;
  hostId: string;
  hostProfile: Profile | null;
}

export function MatchesTab({
  gameId,
  canManage,
  players,
  hostIsPlaying,
  hostId,
  hostProfile,
}: MatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, { t1: string; t2: string }>>({});

  // All available players (including host if playing)
  const allPlayers = [
    ...(hostIsPlaying && hostProfile
      ? [{ id: "host", user_id: hostId, role: "host", profiles: hostProfile }]
      : []),
    ...players,
  ];

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

      // Fetch profiles for match players
      const playerUserIds = [...new Set((mpData || []).map((mp) => mp.user_id))];
      const profileMap: Record<string, Profile> = {};
      if (playerUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", playerUserIds);
        profiles?.forEach((p) => {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        });
      }

      const enriched = matchesData.map((m) => ({
        ...m,
        team1_score: m.team1_score ?? 0,
        team2_score: m.team2_score ?? 0,
        match_players: (mpData || [])
          .filter((mp) => mp.match_id === m.id)
          .map((mp) => ({ ...mp, profiles: profileMap[mp.user_id] || null })),
      }));
      setMatches(enriched);
    } else {
      setMatches([]);
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`matches-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `game_id=eq.${gameId}` }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players" }, () => fetchMatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, fetchMatches]);

  const handleGenerateRandom = async () => {
    if (allPlayers.length < 4) {
      toast.error("Need at least 4 players to generate matches");
      return;
    }

    setGenerating(true);

    // Shuffle players
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);

    // For padel: create matches of 4 players (2v2)
    const matchCount = Math.floor(shuffled.length / 4);
    if (matchCount === 0) {
      toast.error("Need at least 4 players");
      setGenerating(false);
      return;
    }

    const nextRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round_number)) + 1 : 1;

    try {
      for (let i = 0; i < matchCount; i++) {
        const group = shuffled.slice(i * 4, i * 4 + 4);

        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert({ game_id: gameId, round_number: nextRound + i })
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
    } catch (err) {
      toast.error("Failed to generate matches");
    }
    setGenerating(false);
  };

  const handleSubmitScore = async (matchId: string) => {
    const scores = editingScores[matchId];
    if (!scores) return;

    const t1 = parseInt(scores.t1);
    const t2 = parseInt(scores.t2);
    if (isNaN(t1) || isNaN(t2)) {
      toast.error("Enter valid scores");
      return;
    }

    const { error } = await supabase
      .from("matches")
      .update({ team1_score: t1, team2_score: t2, status: "completed" })
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to submit score");
    } else {
      toast.success("Score saved!");
      setEditingScores((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
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
      {/* Generate button for managers */}
      {canManage && (
        <div className="flex gap-2">
          <Button
            variant="hero"
            size="sm"
            onClick={handleGenerateRandom}
            disabled={generating || allPlayers.length < 4}
            className="gap-1.5"
          >
            <Shuffle className="w-4 h-4" />
            {generating ? "Generating..." : "Random Teams"}
          </Button>
        </div>
      )}

      {/* No matches state */}
      {matches.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg mb-1">No Matches Yet</h3>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? `${allPlayers.length < 4 ? `Need at least 4 players (currently ${allPlayers.length}).` : "Generate random teams to create matches."}`
              : "Matches will appear here once the host creates them."}
          </p>
        </div>
      )}

      {/* Match cards */}
      {matches.map((match) => {
        const team1 = match.match_players.filter((mp) => mp.team === 1);
        const team2 = match.match_players.filter((mp) => mp.team === 2);
        const isCompleted = match.status === "completed";
        const isEditing = !!editingScores[match.id];

        return (
          <div
            key={match.id}
            className={cn(
              "bg-card border rounded-xl p-4",
              isCompleted ? "border-border" : "border-primary/20"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
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
                <button
                  onClick={() => handleDeleteMatch(match.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Teams + Score */}
            <div className="flex items-center gap-3">
              {/* Team 1 */}
              <div className="flex-1 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team 1</p>
                {team1.map((mp) => (
                  <div key={mp.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={mp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {mp.profiles?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{mp.profiles?.name || "Player"}</span>
                  </div>
                ))}
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={editingScores[match.id]?.t1 ?? ""}
                      onChange={(e) =>
                        setEditingScores((prev) => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], t1: e.target.value },
                        }))
                      }
                      className="w-12 h-10 text-center text-lg font-bold p-0"
                    />
                    <span className="text-muted-foreground font-bold">-</span>
                    <Input
                      type="number"
                      min={0}
                      value={editingScores[match.id]?.t2 ?? ""}
                      onChange={(e) =>
                        setEditingScores((prev) => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], t2: e.target.value },
                        }))
                      }
                      className="w-12 h-10 text-center text-lg font-bold p-0"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-2xl font-bold",
                      isCompleted && match.team1_score > match.team2_score && "text-success"
                    )}>
                      {match.team1_score}
                    </span>
                    <span className="text-muted-foreground text-lg">-</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      isCompleted && match.team2_score > match.team1_score && "text-success"
                    )}>
                      {match.team2_score}
                    </span>
                  </div>
                )}

                {canManage && (
                  isEditing ? (
                    <Button
                      size="sm"
                      variant="hero"
                      className="h-7 text-xs px-3"
                      onClick={() => handleSubmitScore(match.id)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3"
                      onClick={() =>
                        setEditingScores((prev) => ({
                          ...prev,
                          [match.id]: {
                            t1: String(match.team1_score),
                            t2: String(match.team2_score),
                          },
                        }))
                      }
                    >
                      {isCompleted ? "Edit" : "Score"}
                    </Button>
                  )
                )}
              </div>

              {/* Team 2 */}
              <div className="flex-1 space-y-1.5 text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team 2</p>
                {team2.map((mp) => (
                  <div key={mp.id} className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-medium truncate">{mp.profiles?.name || "Player"}</span>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={mp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {mp.profiles?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
