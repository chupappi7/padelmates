import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlayerSelector } from "./PlayerSelector";
import { ScoreScrollPicker } from "@/components/games/ScoreScrollPicker";
import { calculateDoubles } from "@/lib/elo";
import { toast } from "sonner";

interface SelectedPlayer {
  id: string;
  user_id: string;
  name: string;
  elo_rating: number;
  avatar_url: string | null;
}

export function SubmitScoreTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [team1, setTeam1] = useState<SelectedPlayer[]>([]);
  const [team2, setTeam2] = useState<SelectedPlayer[]>([]);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [setScores, setSetScores] = useState<{ t1: number; t2: number }[]>([{ t1: 0, t2: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const allSelectedIds = [...team1, ...team2].map((p) => p.user_id);

  const handleConfirmScore = async (
    scores: { t1: number; t2: number }[],
    setsWonT1: number,
    setsWonT2: number
  ) => {
    if (team1.length !== 2 || team2.length !== 2) return;

    setSetScores(scores);
    setSubmitting(true);

    try {
      const team1Won = setsWonT1 > setsWonT2;
      const result = calculateDoubles(
        [team1[0].elo_rating, team1[1].elo_rating],
        [team2[0].elo_rating, team2[1].elo_rating],
        team1Won
      );

      // Insert elo_history for all 4 players and update their ratings
      const allPlayers = [
        ...team1.map((p, i) => ({ ...p, ...result.team1[i] })),
        ...team2.map((p, i) => ({ ...p, ...result.team2[i] })),
      ];

      for (const p of allPlayers) {
        await supabase.from("elo_history").insert({
          user_id: p.user_id,
          old_rating: p.old,
          new_rating: p.new,
        });

        await supabase
          .from("profiles")
          .update({ elo_rating: p.new })
          .eq("user_id", p.user_id);
      }

      toast.success("Match recorded! ELO ratings updated.");
      queryClient.invalidateQueries({ queryKey: ["elo-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-elo"] });

      // Reset
      setTeam1([]);
      setTeam2([]);
      setSetScores([{ t1: 0, t2: 0 }]);
    } catch (err) {
      toast.error("Failed to submit score.");
    } finally {
      setSubmitting(false);
    }
  };

  const ready = team1.length === 2 && team2.length === 2;

  return (
    <div className="space-y-6">
      <PlayerSelector
        label="Team 1"
        selectedIds={team1.map((p) => p.user_id)}
        onSelect={(p) => setTeam1((prev) => [...prev, p])}
        onRemove={(uid) => setTeam1((prev) => prev.filter((p) => p.user_id !== uid))}
        max={2}
        excludeIds={team2.map((p) => p.user_id)}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-bold text-muted-foreground">VS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <PlayerSelector
        label="Team 2"
        selectedIds={team2.map((p) => p.user_id)}
        onSelect={(p) => setTeam2((prev) => [...prev, p])}
        onRemove={(uid) => setTeam2((prev) => prev.filter((p) => p.user_id !== uid))}
        max={2}
        excludeIds={team1.map((p) => p.user_id)}
      />

      <Button
        variant="hero"
        className="w-full"
        disabled={!ready || submitting}
        onClick={() => setShowScorePicker(true)}
      >
        {submitting ? "Submitting..." : "Enter Score"}
      </Button>

      <ScoreScrollPicker
        open={showScorePicker}
        onOpenChange={setShowScorePicker}
        setScores={setScores}
        onConfirm={handleConfirmScore}
      />
    </div>
  );
}
