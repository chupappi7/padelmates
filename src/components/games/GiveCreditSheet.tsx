import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const CREDIT_TYPES = [
  { key: "mvp", label: "MVP" },
  { key: "clutch_play", label: "Clutch Play" },
  { key: "sharp_shots", label: "Sharp Shots" },
  { key: "team_spirit", label: "Team Spirit" },
  { key: "never_gives_up", label: "Never Gives Up" },
  { key: "best_sportsmanship", label: "Best Sportsmanship" },
] as const;

interface Player {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface GiveCreditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  onConfirm: (receiverId: string, creditType: string) => Promise<void>;
}

export function GiveCreditSheet({ open, onOpenChange, players, onConfirm }: GiveCreditSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1);
    setSelectedPlayer(null);
    setSelectedType(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!selectedPlayer || !selectedType) return;
    setSubmitting(true);
    await onConfirm(selectedPlayer.user_id, selectedType);
    setSubmitting(false);
    handleOpenChange(false);
  };

  const creditLabel = CREDIT_TYPES.find(c => c.key === selectedType)?.label || selectedType;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep(s => (s - 1) as 1 | 2)} className="p-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step === 1 && "Pick a Player"}
            {step === 2 && "Pick a Credit"}
            {step === 3 && "Confirm"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {step === 1 && (
            <div className="space-y-2">
              {players.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => { setSelectedPlayer(p); setStep(2); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {CREDIT_TYPES.map(ct => (
                <button
                  key={ct.key}
                  onClick={() => { setSelectedType(ct.key); setStep(3); }}
                  className={cn(
                    "px-3.5 py-2 rounded-full border text-xs font-semibold transition-colors",
                    selectedType === ct.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          )}

          {step === 3 && selectedPlayer && (
            <div className="space-y-4">
              <p className="text-sm text-center">
                Give <span className="font-bold">{creditLabel}</span> to <span className="font-bold">{selectedPlayer.name}</span>?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? "Giving..." : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { CREDIT_TYPES };
