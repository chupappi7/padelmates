import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  MAIN_LEVELS,
  SUB_LEVELS,
  levelsInGroup,
  mainLevelOf,
  deriveMinMax,
  expandToSelected,
  type MainLevel,
  type GameLevel,
} from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    expandToSelected(minLevel, maxLevel)
  );

  // Sync external changes
  useEffect(() => {
    setSelected(expandToSelected(minLevel, maxLevel));
  }, [minLevel, maxLevel]);

  const emitChange = (next: Set<string>) => {
    setSelected(next);
    if (next.size === 0) {
      onChange("", "");
    } else {
      const { min_level, max_level } = deriveMinMax(next);
      onChange(min_level, max_level);
    }
  };

  // Which main levels have at least one sub-level selected?
  const activeMainLevels = new Set<MainLevel>();
  selected.forEach((l) => activeMainLevels.add(mainLevelOf(l)));

  const handleMainClick = (main: MainLevel) => {
    const next = new Set(selected);
    const groupLevels = levelsInGroup(main);

    if (activeMainLevels.has(main)) {
      // Deselect all in group
      groupLevels.forEach((l) => next.delete(l));
    } else {
      // Select all in group (= "Any B" / "Any C" default)
      groupLevels.forEach((l) => next.add(l));
    }

    emitChange(next);
  };

  const handleSubClick = (sub: GameLevel, main: MainLevel) => {
    const next = new Set(selected);
    const groupLevels = levelsInGroup(main);

    if (next.has(sub)) {
      next.delete(sub);
      // If none left in group, deselect main entirely
    } else {
      next.add(sub);
    }

    emitChange(next);
  };

  const handleAnyClick = (main: MainLevel) => {
    const next = new Set(selected);
    const groupLevels = levelsInGroup(main);
    // Select all sub-levels
    groupLevels.forEach((l) => next.add(l));
    emitChange(next);
  };

  const isAllSubsSelected = (main: MainLevel) => {
    const groupLevels = levelsInGroup(main);
    return groupLevels.every((l) => selected.has(l));
  };

  return (
    <div className="space-y-3">
      {/* Step 1: Main level pills */}
      <div className="flex gap-2">
        {MAIN_LEVELS.map((main) => {
          const active = activeMainLevels.has(main);
          return (
            <button
              key={main}
              type="button"
              onClick={() => handleMainClick(main)}
              className={cn(
                "flex-1 h-10 rounded-xl border-2 text-sm font-bold transition-all",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {main}
            </button>
          );
        })}
      </div>

      {/* Step 2: Sub-levels for B and C */}
      {(["B", "C"] as MainLevel[]).map((main) => {
        if (!activeMainLevels.has(main)) return null;
        const subs = SUB_LEVELS[main];
        if (!subs) return null;
        const allSelected = isAllSubsSelected(main);

        return (
          <div key={main} className="flex items-center gap-1.5 pl-1">
            <span className="text-xs text-muted-foreground font-medium w-4 shrink-0">{main}:</span>
            <div className="flex gap-1.5 flex-wrap">
              {subs.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => handleSubClick(sub, main)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-semibold border transition-all",
                    selected.has(sub)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                  )}
                >
                  {sub}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleAnyClick(main)}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-semibold border transition-all",
                  allSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                )}
              >
                Any {main}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
