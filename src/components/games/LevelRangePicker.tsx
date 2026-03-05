import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LEVEL_HIERARCHY,
  formatLevelBadge,
  type GameLevel,
} from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

const MAINS = ["A", "B", "C", "D"] as const;

// When a single main is selected, these are the sub-levels + adjacent boundary to show
const EXPANDED_SUBS: Record<string, GameLevel[]> = {
  B: ["B1", "B2", "C1"],   // B subs + one step into C
  C: ["C1", "C2", "C3", "D"], // C subs + one step into D
};

// Full range for main-level pairs
const MAIN_RANGES: Record<string, [GameLevel, GameLevel]> = {
  "A": ["A", "A"],
  "D": ["D", "D"],
  "B": ["B1", "B2"],
  "C": ["C1", "C3"],
  "A-B": ["A", "B2"],
  "B-C": ["B1", "C3"],
  "C-D": ["C1", "D"],
};

function mainOf(level: string): string {
  if (level.startsWith("B")) return "B";
  if (level.startsWith("C")) return "C";
  return level;
}

function mainsAreAdjacent(a: string, b: string): boolean {
  const idx = MAINS.indexOf(a as any);
  const idx2 = MAINS.indexOf(b as any);
  return Math.abs(idx - idx2) === 1;
}

function rangeKey(a: string, b: string): string {
  const ai = MAINS.indexOf(a as any);
  const bi = MAINS.indexOf(b as any);
  return ai < bi ? `${a}-${b}` : `${b}-${a}`;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  // "mode" is either single-main (with optional sub-level drill) or main-range
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [secondMain, setSecondMain] = useState<string | null>(null); // adjacent main for range
  // Sub-level range (indices into EXPANDED_SUBS[selectedMain])
  const [subStart, setSubStart] = useState<number | null>(null);
  const [subEnd, setSubEnd] = useState<number | null>(null);

  // Sync from props
  useEffect(() => {
    if (!minLevel || !maxLevel) {
      setSelectedMain(null);
      setSecondMain(null);
      setSubStart(null);
      setSubEnd(null);
      return;
    }

    const maxMain = mainOf(maxLevel);
    const minMain = mainOf(minLevel);

    if (maxMain === minMain) {
      // Single main group
      setSelectedMain(maxMain);
      setSecondMain(null);
      const subs = EXPANDED_SUBS[maxMain];
      if (subs) {
        const si = subs.indexOf(maxLevel as GameLevel);
        const ei = subs.indexOf(minLevel as GameLevel);
        setSubStart(si >= 0 ? si : null);
        setSubEnd(ei >= 0 ? ei : null);
      } else {
        setSubStart(null);
        setSubEnd(null);
      }
    } else if (mainsAreAdjacent(maxMain, minMain)) {
      // Check if it's a fine sub-level cross (like B2-C1)
      const primaryMain = maxMain;
      const subs = EXPANDED_SUBS[primaryMain];
      if (subs) {
        const si = subs.indexOf(maxLevel as GameLevel);
        const ei = subs.indexOf(minLevel as GameLevel);
        if (si >= 0 && ei >= 0) {
          // It's a sub-level cross-boundary range
          setSelectedMain(primaryMain);
          setSecondMain(null);
          setSubStart(si);
          setSubEnd(ei);
          return;
        }
      }
      // Full main-level range
      setSelectedMain(maxMain);
      setSecondMain(minMain);
      setSubStart(null);
      setSubEnd(null);
    } else {
      setSelectedMain(maxMain);
      setSecondMain(null);
      setSubStart(null);
      setSubEnd(null);
    }
  }, [minLevel, maxLevel]);

  const handleMainTap = (main: string) => {
    if (selectedMain === null) {
      // First selection
      setSelectedMain(main);
      setSecondMain(null);
      const range = MAIN_RANGES[main];
      if (range) onChange(range[1], range[0]);
      // If B or C, auto-select all subs
      const subs = EXPANDED_SUBS[main];
      if (subs) {
        const ownSubs = main === "B" ? 2 : 3; // exclude boundary
        setSubStart(0);
        setSubEnd(ownSubs - 1);
      } else {
        setSubStart(null);
        setSubEnd(null);
      }
      return;
    }

    if (main === selectedMain && secondMain === null) {
      // Deselect
      setSelectedMain(null);
      setSecondMain(null);
      setSubStart(null);
      setSubEnd(null);
      onChange("", "");
      return;
    }

    if (main === secondMain) {
      // Deselect second → back to single
      setSecondMain(null);
      const range = MAIN_RANGES[selectedMain];
      if (range) onChange(range[1], range[0]);
      const subs = EXPANDED_SUBS[selectedMain];
      if (subs) {
        const ownSubs = selectedMain === "B" ? 2 : 3;
        setSubStart(0);
        setSubEnd(ownSubs - 1);
      }
      return;
    }

    if (secondMain !== null && main === selectedMain) {
      // Deselect first main, keep second as primary
      const newPrimary = secondMain;
      setSelectedMain(newPrimary);
      setSecondMain(null);
      const range = MAIN_RANGES[newPrimary];
      if (range) onChange(range[1], range[0]);
      const subs = EXPANDED_SUBS[newPrimary];
      if (subs) {
        const ownSubs = newPrimary === "B" ? 2 : 3;
        setSubStart(0);
        setSubEnd(ownSubs - 1);
      } else {
        setSubStart(null);
        setSubEnd(null);
      }
      return;
    }

    if (mainsAreAdjacent(selectedMain, main)) {
      // Adjacent → main-level range
      setSecondMain(main);
      setSubStart(null);
      setSubEnd(null);
      const key = rangeKey(selectedMain, main);
      const range = MAIN_RANGES[key];
      if (range) onChange(range[1], range[0]);
    } else {
      // Non-adjacent → move
      setSelectedMain(main);
      setSecondMain(null);
      const range = MAIN_RANGES[main];
      if (range) onChange(range[1], range[0]);
      const subs = EXPANDED_SUBS[main];
      if (subs) {
        const ownSubs = main === "B" ? 2 : 3;
        setSubStart(0);
        setSubEnd(ownSubs - 1);
      } else {
        setSubStart(null);
        setSubEnd(null);
      }
    }
  };

  const handleSubTap = (idx: number) => {
    if (!selectedMain) return;
    const subs = EXPANDED_SUBS[selectedMain];
    if (!subs) return;

    // If tapping a filled pill → reset, anchor here
    if (subStart !== null && subEnd !== null) {
      const lo = Math.min(subStart, subEnd);
      const hi = Math.max(subStart, subEnd);
      if (idx >= lo && idx <= hi) {
        setSubStart(idx);
        setSubEnd(null);
        onChange(subs[idx], subs[idx]);
        return;
      }
    }

    if (subStart === null || subEnd !== null) {
      // First tap
      setSubStart(idx);
      setSubEnd(null);
      onChange(subs[idx], subs[idx]);
    } else {
      // Second tap → range
      const lo = Math.min(subStart, idx);
      const hi = Math.max(subStart, idx);
      setSubStart(lo);
      setSubEnd(hi);
      onChange(subs[hi], subs[lo]);
    }
  };

  const isMainHighlighted = (main: string) => {
    if (main === selectedMain) return true;
    if (main === secondMain) return true;
    return false;
  };

  // Show subs only when single main selected (no second main) and main has subs
  const showSubs = selectedMain && !secondMain && EXPANDED_SUBS[selectedMain];
  const subs = showSubs ? EXPANDED_SUBS[selectedMain!] : null;

  // Compute display
  const displayLabel = (() => {
    if (!selectedMain) return null;
    if (secondMain) {
      const key = rangeKey(selectedMain, secondMain);
      const range = MAIN_RANGES[key];
      if (range) return formatLevelBadge(range[1], range[0]);
    }
    if (subs && subStart !== null) {
      if (subEnd !== null) {
        const lo = Math.min(subStart, subEnd);
        const hi = Math.max(subStart, subEnd);
        return formatLevelBadge(subs[hi], subs[lo]);
      }
      return subs[subStart];
    }
    const range = MAIN_RANGES[selectedMain];
    if (range) return formatLevelBadge(range[1], range[0]);
    return selectedMain;
  })();

  return (
    <div className="space-y-3">
      {/* Main level pills */}
      <div className="flex gap-2">
        {MAINS.map((main) => (
          <button
            key={main}
            type="button"
            onClick={() => handleMainTap(main)}
            className={cn(
              "flex-1 h-11 rounded-xl border-2 text-sm font-bold transition-all",
              isMainHighlighted(main)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {main}
          </button>
        ))}
      </div>

      {/* Sub-level row */}
      {subs && (
        <div className="flex items-center gap-1.5 pl-1">
          <div className="flex gap-1.5">
            {subs.map((sub, idx) => {
              const lo = subStart !== null && subEnd !== null ? Math.min(subStart, subEnd) : (subStart ?? -1);
              const hi = subStart !== null && subEnd !== null ? Math.max(subStart, subEnd) : (subStart ?? -1);
              const hasRange = subStart !== null && subEnd !== null;
              const isInRange = hasRange && idx >= lo && idx <= hi;
              const isAnchor = subStart === idx && subEnd === null;
              
              // Visual separator between own subs and boundary
              const ownCount = selectedMain === "B" ? 2 : 3;
              const isBoundary = idx >= ownCount;

              return (
                <span key={sub} className="flex items-center gap-1.5">
                  {isBoundary && idx === ownCount && (
                    <span className="text-muted-foreground text-xs mx-0.5">→</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSubTap(idx)}
                    className={cn(
                      "h-9 px-4 rounded-full text-xs font-semibold border-2 transition-all",
                      isInRange || isAnchor
                        ? "bg-primary text-primary-foreground border-primary"
                        : isBoundary
                          ? "bg-background text-muted-foreground border-dashed border-border hover:border-primary hover:text-foreground"
                          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                    )}
                  >
                    {sub}
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Live preview */}
      {displayLabel && (
        <p className="text-xs text-muted-foreground text-center">
          Level: <span className="font-semibold text-foreground">{displayLabel}</span>
        </p>
      )}
    </div>
  );
}
