import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LEVEL_HIERARCHY,
  formatLevelBadge,
  levelRank,
  type GameLevel,
} from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

const MAIN_GROUPS = ["A", "B", "C", "D"] as const;
const SUB_LEVELS: Record<string, GameLevel[]> = {
  B: ["B1", "B2"],
  C: ["C1", "C2", "C3"],
};

function mainOf(level: string): string {
  if (level.startsWith("B")) return "B";
  if (level.startsWith("C")) return "C";
  return level;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set());
  // Range expressed as indices into LEVEL_HIERARCHY
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  // Sync from props
  useEffect(() => {
    if (!minLevel || !maxLevel) {
      setExpandedMains(new Set());
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }
    const si = LEVEL_HIERARCHY.indexOf(maxLevel as GameLevel); // best = lowest index
    const ei = LEVEL_HIERARCHY.indexOf(minLevel as GameLevel); // weakest = highest index
    if (si < 0 || ei < 0) return;

    setRangeStart(si);
    setRangeEnd(ei);

    // Expand relevant mains
    const mains = new Set<string>();
    for (let i = si; i <= ei; i++) {
      const m = mainOf(LEVEL_HIERARCHY[i]);
      if (m === "B" || m === "C") mains.add(m);
    }
    setExpandedMains(mains);
  }, [minLevel, maxLevel]);

  const lo = rangeStart !== null && rangeEnd !== null ? Math.min(rangeStart, rangeEnd) : (rangeStart ?? -1);
  const hi = rangeStart !== null && rangeEnd !== null ? Math.max(rangeStart, rangeEnd) : (rangeStart ?? -1);
  const hasRange = rangeStart !== null && rangeEnd !== null;

  const emit = (s: number, e: number) => {
    const loI = Math.min(s, e);
    const hiI = Math.max(s, e);
    onChange(LEVEL_HIERARCHY[hiI], LEVEL_HIERARCHY[loI]);
  };

  // Build the visible sub-level row: only for expanded B/C, in hierarchy order
  const visibleSubs: GameLevel[] = [];
  LEVEL_HIERARCHY.forEach((l) => {
    const m = mainOf(l);
    if ((m === "B" || m === "C") && expandedMains.has(m)) {
      visibleSubs.push(l);
    }
  });

  const handleMainTap = (main: string) => {
    if (main === "A" || main === "D") {
      const idx = LEVEL_HIERARCHY.indexOf(main as GameLevel);
      setExpandedMains(new Set());
      setRangeStart(idx);
      setRangeEnd(idx);
      emit(idx, idx);
      return;
    }

    // B or C toggle
    const next = new Set(expandedMains);
    if (next.has(main)) {
      next.delete(main);
      // If deselecting and current range is within this group, clear
      if (rangeStart !== null) {
        const subs = SUB_LEVELS[main];
        const subIndices = subs.map((s) => LEVEL_HIERARCHY.indexOf(s));
        const allInGroup = lo >= subIndices[0] && hi <= subIndices[subIndices.length - 1];
        if (allInGroup) {
          setRangeStart(null);
          setRangeEnd(null);
          onChange("", "");
        }
      }
    } else {
      next.add(main);
      // Auto-select all subs of this group
      const subs = SUB_LEVELS[main];
      const first = LEVEL_HIERARCHY.indexOf(subs[0]);
      const last = LEVEL_HIERARCHY.indexOf(subs[subs.length - 1]);

      if (rangeStart === null || rangeEnd === null) {
        // No prior selection → select all of this group
        setRangeStart(first);
        setRangeEnd(last);
        emit(first, last);
      } else {
        // Extend range to include this group
        const newLo = Math.min(lo, first);
        const newHi = Math.max(hi, last);
        setRangeStart(newLo);
        setRangeEnd(newHi);
        emit(newLo, newHi);
      }
    }
    setExpandedMains(next);
  };

  const handleSubTap = (level: GameLevel) => {
    const idx = LEVEL_HIERARCHY.indexOf(level);

    // Tapping a filled pill → reset, start fresh
    if (hasRange && idx >= lo && idx <= hi) {
      setRangeStart(idx);
      setRangeEnd(null);
      // Emit single immediately
      emit(idx, idx);
      return;
    }

    if (rangeStart === null || rangeEnd !== null) {
      // First tap (or restart)
      setRangeStart(idx);
      setRangeEnd(null);
      emit(idx, idx);
    } else {
      // Second tap → set range
      setRangeEnd(idx);
      emit(rangeStart, idx);
    }
  };

  const isMainActive = (main: string) => {
    if (!hasRange) return false;
    if (main === "A") return lo <= 0 && hi >= 0;
    if (main === "D") return lo <= 6 && hi >= 6;
    const subs = SUB_LEVELS[main];
    if (!subs) return false;
    const first = LEVEL_HIERARCHY.indexOf(subs[0]);
    const last = LEVEL_HIERARCHY.indexOf(subs[subs.length - 1]);
    // At least one sub in range
    return hi >= first && lo <= last;
  };

  const displayLabel = (() => {
    if (!hasRange) return null;
    return formatLevelBadge(LEVEL_HIERARCHY[hi], LEVEL_HIERARCHY[lo]);
  })();

  return (
    <div className="space-y-3">
      {/* Main level pills */}
      <div className="flex gap-2">
        {MAIN_GROUPS.map((main) => (
          <button
            key={main}
            type="button"
            onClick={() => handleMainTap(main)}
            className={cn(
              "flex-1 h-11 rounded-xl border-2 text-sm font-bold transition-all",
              isMainActive(main) || expandedMains.has(main)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {main}
          </button>
        ))}
      </div>

      {/* Sub-level row for expanded groups */}
      {visibleSubs.length > 0 && (
        <div className="flex items-center gap-1.5 pl-1 flex-wrap">
          {(["B", "C"] as const).map((main) => {
            if (!expandedMains.has(main)) return null;
            const subs = SUB_LEVELS[main];
            return (
              <div key={main} className="flex items-center gap-1.5 mr-2">
                <span className="text-xs text-muted-foreground font-medium w-5 shrink-0">{main}:</span>
                {subs.map((sub) => {
                  const idx = LEVEL_HIERARCHY.indexOf(sub);
                  const isInRange = hasRange && idx >= lo && idx <= hi;
                  const isAnchor = rangeStart === idx && rangeEnd === null;

                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSubTap(sub)}
                      className={cn(
                        "h-9 px-4 rounded-full text-xs font-semibold border-2 transition-all",
                        isInRange || isAnchor
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                      )}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            );
          })}
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
