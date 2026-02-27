import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SKILL_LEVEL_OPTIONS } from "@/components/games/SkillBadge";
import { useState, useEffect } from "react";

interface LevelSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: number;
  onSave: (level: number) => void;
  saving?: boolean;
}

export function LevelSelectSheet({
  open,
  onOpenChange,
  currentLevel,
  onSave,
  saving,
}: LevelSelectSheetProps) {
  const [selected, setSelected] = useState(currentLevel);

  useEffect(() => {
    if (open) setSelected(currentLevel);
  }, [open, currentLevel]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle
            className="text-base"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Select Level
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 mt-2">
          {SKILL_LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                selected === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="text-sm font-semibold text-foreground">
                {opt.label}
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selected === opt.value
                    ? "border-primary"
                    : "border-muted-foreground/30"
                }`}
              >
                {selected === opt.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          Used for matchmaking until PDR is established.
        </p>

        <Button
          variant="hero"
          className="w-full mt-4"
          onClick={() => onSave(selected)}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
