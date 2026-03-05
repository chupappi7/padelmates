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

// Sub-levels shown when a main is expanded, including adjacent boundary levels
const EXPANDED_SUBS: Record<string, GameLevel[]> = {
  B: ["A", "B1", "B2", "C1"],
  C: ["B2", "C1", "C2", "C3", "D"],
};

// Which indices in EXPANDED_SUBS are the "own" subs (not boundaries)
const OWN_RANGE: Record<string, [number, number]> = {
  B: [1, 2],   // B1=1, B2=2
  C: [1, 3],   // C1=1, C2=2, C3=3
};

// Full range for main-level combos
const MAIN_RANGES: Record<string, [GameLevel, GameLevel]> = {
  A: ["A", "A"],
  D: ["D", "D"],
  B: ["B1", "B2"],
  C: ["C1", "C3"],
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
  const ai = MAINS.indexOf(a as typeof MAINS[number]);
  const bi = MAINS.indexOf(b as typeof MAINS[number]);
  return ai >= 0 && bi >= 0 && Math.abs(ai - bi) === 1;
}

function rangeKey(a: string, b: string): string {
  const ai = MAINS.indexOf(a as typeof MAINS[number]);
  const bi = MAINS.indexOf(b as typeof MAINS[number]);
  return ai < bi ? `${a}-${b}` : `${b}-${a}`;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [secondMain, setSecondMain] = useState<string | null>(null);
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

    const maxMain = mainOf(maxLevel); // best
    const minMain = mainOf(minLevel); // weakest

    if (maxMain === minMain) {
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
      // Check if it fits in one expanded group (cross-boundary like B2-C1)
      for (const tryMain of [maxMain, minMain]) {
        const subs = EXPANDED_SUBS[tryMain];
        if (subs) {
          const si = subs.indexOf(maxLevel as GameLevel);
          const ei = subs.indexOf(minLevel as GameLevel);
          if (si >= 0 && ei >= 0) {
            setSelectedMain(tryMain);
            setSecondMain(null);
            setSubStart(si);
            setSubEnd(ei);
            return;
          }
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

  const autoSelectOwnSubs = (main: string) => {
    const own = OWN_RANGE[main];
    if (own) {
      setSubStart(own[0]);
      setSubEnd(own[1]);
    } else {
      setSubStart(null);
      setSubEnd(null);
    }
  };

  const handleMainTap = (main: string) => {
    if (selectedMain === null) {
      setSelectedMain(main);
      setSecondMain(null);
      const range = MAIN_RANGES[main];
      if (range) onChange(range[1], range[0]);
      autoSelectOwnSubs(main);
      return;
    }

    if (main === selectedMain && secondMain === null) {
      setSelectedMain(null);
      setSecondMain(null);
      setSubStart(null);
      setSubEnd(null);
      onChange("", "");
      return;
    }

    if (main === secondMain) {
      setSecondMain(null);
      const range = MAIN_RANGES[selectedMain];
      if (range) onChange(range[1], range[0]);
      autoSelectOwnSubs(selectedMain);
      return;
    }

    if (secondMain !== null && main === selectedMain) {
      const newPrimary = secondMain;
      setSelectedMain(newPrimary);
      setSecondMain(null);
      const range = MAIN_RANGES[newPrimary];
      if (range) onChange(range[1], range[0]);
      autoSelectOwnSubs(newPrimary);
      return;
    }

    if (mainsAreAdjacent(selectedMain, main)) {
      setSecondMain(main);
      setSubStart(null);
      setSubEnd(null);
      const key = rangeKey(selectedMain, main);
      const range = MAIN_RANGES[key];
      if (range) onChange(range[1], range[0]);
    } else {
      setSelectedMain(main);
      setSecondMain(null);
      const range = MAIN_RANGES[main];
      if (range) onChange(range[1], range[0]);
      autoSelectOwnSubs(main);
    }
  };

  const handleSubTap = (idx: number) => {
    if (!selectedMain) return;
    const subs = EXPANDED_SUBS[selectedMain];
    if (!subs) return;

    const hasFullRange = subStart !== null && subEnd !== null;

    if (hasFullRange) {
      const lo = Math.min(subStart!, subEnd!);
      const hi = Math.max(subStart!, subEnd!);
      if (idx >= lo && idx <= hi) {
        // Tap inside range → reset to single anchor
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

  const isMainHighlighted = (main: string) => main === selectedMain || main === secondMain;

  const showSubs = selectedMain && !secondMain && EXPANDED_SUBS[selectedMain];
  const subs = showSubs ? EXPANDED_SUBS[selectedMain!] : null;

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

      {/* Sub-level row with boundaries */}
      {subs && (
        <div className="flex items-center gap-1.5 pl-1">
          <div className="flex gap-1.5 items-center">
            {subs.map((sub, idx) => {
              const lo = subStart !== null && subEnd !== null ? Math.min(subStart, subEnd) : (subStart ?? -1);
              const hi = subStart !== null && subEnd !== null ? Math.max(subStart, subEnd) : (subStart ?? -1);
              const hasRange = subStart !== null && subEnd !== null;
              const isInRange = hasRange && idx >= lo && idx <= hi;
              const isAnchor = subStart === idx && subEnd === null;

              const own = OWN_RANGE[selectedMain!];
              const isBoundary = own ? (idx < own[0] || idx > own[1]) : false;

              // Show separator arrows
              const showLeftArrow = own && idx === own[0] && own[0] > 0;
              const showRightArrow = own && idx === own[1] + 1;

              return (
                <span key={sub} className="flex items-center gap-1.5">
                  {showLeftArrow && (
                    <span className="text-muted-foreground text-[10px] mx-0.5">←</span>
                  )}
                  {showRightArrow && (
                    <span className="text-muted-foreground text-[10px] mx-0.5">→</span>
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
