import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, ChevronRight, ChevronLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { isValidSetScore, calcActualScore, parseSetScores, formatPDR, calcMatchWeight, expectedScore, gFactor } from "@/lib/pdr";
import { cn } from "@/lib/utils";

const MATCH_TYPES = [
  { value: "tournament", label: "Tournament", weight: "1.5x" },
  { value: "club", label: "Club Match", weight: "1.0x" },
  { value: "americano", label: "Americano", weight: "0.75x" },
  { value: "casual", label: "Casual", weight: "0.5x" },
];

export function PDRSubmitTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [matchType, setMatchType] = useState("casual");
  const [partner, setPartner] = useState<any>(null);
  const [opponent1, setOpponent1] = useState<any>(null);
  const [opponent2, setOpponent2] = useState<any>(null);
  const [sets, setSets] = useState([{ a: 0, b: 0 }, { a: 0, b: 0 }]);
  const [hasSet3, setHasSet3] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles-pdr-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, pdr_rating, pdr_phase");
      return data || [];
    },
  });

  const selectedIds = [user?.id, partner?.user_id, opponent1?.user_id, opponent2?.user_id].filter(Boolean);

  const validSets = sets.slice(0, hasSet3 ? 3 : 2);
  const allSetsValid = validSets.every((s) => isValidSetScore(s.a, s.b));
  const parsed = allSetsValid ? parseSetScores(
    sets[0].a, sets[0].b,
    sets[1].a, sets[1].b,
    hasSet3 ? (sets[2]?.a ?? 0) : null,
    hasSet3 ? (sets[2]?.b ?? 0) : null,
  ) : null;

  const scoreSummary = validSets.map((s) => `${s.a}-${s.b}`).join(", ");
  const setsWonA = validSets.filter((s) => s.a > s.b).length;
  const setsWonB = validSets.filter((s) => s.b > s.a).length;
  const gamesA = validSets.reduce((sum, s) => sum + s.a, 0);
  const gamesB = validSets.reduce((sum, s) => sum + s.b, 0);

  const canProceed = () => {
    switch (step) {
      case 0: return !!matchType;
      case 1: return !!partner && !!opponent1 && !!opponent2;
      case 2: return allSetsValid;
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !partner || !opponent1 || !opponent2) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("match_submissions").insert({
        submitted_by: user.id,
        match_type: matchType,
        team_a_player1: user.id,
        team_a_player2: partner.user_id,
        team_b_player1: opponent1.user_id,
        team_b_player2: opponent2.user_id,
        set1_a: sets[0].a,
        set1_b: sets[0].b,
        set2_a: sets[1].a,
        set2_b: sets[1].b,
        set3_a: hasSet3 ? (sets[2]?.a ?? null) : null,
        set3_b: hasSet3 ? (sets[2]?.b ?? null) : null,
        played_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      // Send notifications to opponents
      const opponents = [opponent1, opponent2];
      for (const opp of opponents) {
        await supabase.from("notifications").insert({
          user_id: opp.user_id,
          type: "match_confirmation",
          title: "Match Submitted",
          message: `${allProfiles.find((p: any) => p.user_id === user.id)?.name || "Someone"} submitted a match. Score: ${scoreSummary}. Confirm or dispute?`,
          link: "/elo",
        });
      }

      toast.success("Match submitted! Waiting for opponent confirmation.");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["pdr-submissions"] });
    } catch (err) {
      toast.error("Failed to submit match.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setMatchType("casual");
    setPartner(null);
    setOpponent1(null);
    setOpponent2(null);
    setSets([{ a: 0, b: 0 }, { a: 0, b: 0 }]);
    setHasSet3(false);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="bg-card rounded-2xl border p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-semibold">Waiting for opponent confirmation</p>
        <p className="text-xs text-muted-foreground">
          They have 72 hours. The match applies at 0.2x weight until confirmed.
        </p>
        <Button variant="outline" size="sm" onClick={resetForm}>Submit Another</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 justify-center">
        {["Type", "Players", "Score", "Review"].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {i + 1}
            </div>
            {i < 3 && <div className={cn("w-6 h-px", i < step ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border p-4">
        {/* Step 0: Match Type */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Match Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {MATCH_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setMatchType(t.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-all",
                    matchType === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.weight} weight</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              This match type carries {MATCH_TYPES.find((t) => t.value === matchType)?.weight} weight when confirmed by both opponents
            </p>
          </div>
        )}

        {/* Step 1: Players */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Select Players</h3>
            <PlayerSearch
              label="Your Partner"
              selected={partner}
              onSelect={setPartner}
              onRemove={() => setPartner(null)}
              excludeIds={selectedIds}
              profiles={allProfiles}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-bold text-muted-foreground">VS</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <PlayerSearch
              label="Opponent 1"
              selected={opponent1}
              onSelect={setOpponent1}
              onRemove={() => setOpponent1(null)}
              excludeIds={selectedIds}
              profiles={allProfiles}
            />
            <PlayerSearch
              label="Opponent 2"
              selected={opponent2}
              onSelect={setOpponent2}
              onRemove={() => setOpponent2(null)}
              excludeIds={selectedIds}
              profiles={allProfiles}
            />
          </div>
        )}

        {/* Step 2: Score */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Enter Score</h3>
            {[0, 1, ...(hasSet3 ? [2] : [])].map((setIdx) => (
              <div key={setIdx} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Set {setIdx + 1}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Team A</label>
                    <Input
                      type="number"
                      min={0}
                      max={7}
                      value={sets[setIdx]?.a ?? 0}
                      onChange={(e) => {
                        const v = Math.min(7, Math.max(0, parseInt(e.target.value) || 0));
                        setSets((prev) => {
                          const n = [...prev];
                          if (!n[setIdx]) n[setIdx] = { a: 0, b: 0 };
                          n[setIdx] = { ...n[setIdx], a: v };
                          return n;
                        });
                      }}
                      className="h-10 text-center text-lg font-bold"
                    />
                  </div>
                  <span className="text-lg font-bold text-muted-foreground mt-4">-</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Team B</label>
                    <Input
                      type="number"
                      min={0}
                      max={7}
                      value={sets[setIdx]?.b ?? 0}
                      onChange={(e) => {
                        const v = Math.min(7, Math.max(0, parseInt(e.target.value) || 0));
                        setSets((prev) => {
                          const n = [...prev];
                          if (!n[setIdx]) n[setIdx] = { a: 0, b: 0 };
                          n[setIdx] = { ...n[setIdx], b: v };
                          return n;
                        });
                      }}
                      className="h-10 text-center text-lg font-bold"
                    />
                  </div>
                </div>
                {sets[setIdx] && !isValidSetScore(sets[setIdx].a, sets[setIdx].b) && (sets[setIdx].a > 0 || sets[setIdx].b > 0) && (
                  <p className="text-[10px] text-destructive">Invalid set score. Valid: 6-0 to 6-4, 7-5, 7-6</p>
                )}
              </div>
            ))}
            {!hasSet3 && (
              <Button variant="ghost" size="sm" onClick={() => { setHasSet3(true); setSets((p) => [...p, { a: 0, b: 0 }]); }}>
                + Add 3rd Set
              </Button>
            )}
            {allSetsValid && (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-sm font-medium">
                  Team A wins {setsWonA}-{setsWonB} ({gamesA} games to {gamesB})
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Review & Submit</h3>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Team A</p>
                  <p className="text-sm font-medium">You & {partner?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Team B</p>
                  <p className="text-sm font-medium">{opponent1?.name} & {opponent2?.name}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{scoreSummary}</p>
                <p className="text-xs text-muted-foreground capitalize">{matchType} match</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            className="flex-1"
            disabled={!canProceed()}
            onClick={() => setStep(step + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting..." : "Submit Match"}
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Player Search component ---
function PlayerSearch({
  label, selected, onSelect, onRemove, excludeIds, profiles,
}: {
  label: string;
  selected: any;
  onSelect: (p: any) => void;
  onRemove: () => void;
  excludeIds: (string | undefined)[];
  profiles: any[];
}) {
  const [search, setSearch] = useState("");

  const filtered = profiles.filter(
    (p: any) =>
      !excludeIds.includes(p.user_id) &&
      p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={selected.avatar_url || ""} />
            <AvatarFallback className="text-[9px]">{selected.name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1">{selected.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatPDR(selected.pdr_rating, selected.pdr_phase)}
          </span>
          <button onClick={onRemove}>
            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
        {search.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((p: any) => (
              <button
                key={p.user_id}
                onClick={() => { onSelect(p); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPDR(p.pdr_rating, p.pdr_phase)}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No players found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
