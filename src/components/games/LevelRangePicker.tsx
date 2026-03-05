import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LEVEL_HIERARCHY,
  levelRank,
  deriveMinMax,
  formatLevelBadge,
  type GameLevel,
  type MainLevel,
} from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

const SUB_LEVELS: Record<string, GameLevel[]> = {
  B: ["B1", "B2"],
  C: ["C1", "C2", "C3"],
};

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  const [expandedMain, setExpandedMain] = useState<"B" | "C" | null>(null);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [selectedMain, setSelectedMain] = useState<string | null>(null);

  // Sync from props on mount / external change
  useEffect(() => {
    if (!minLevel || !maxLevel) {
      setSelectedMain(null);
      setExpandedMain(null);
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    // Single main level with no sub-levels
    if (minLevel === maxLevel && (minLevel === "A" || minLevel === "D")) {
      setSelectedMain(minLevel);
      setExpandedMain(null);
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    // Figure out which main group
    const main = minLevel.startsWith("B") || maxLevel.startsWith("B") ? "B"
      : minLevel.startsWith("C") || maxLevel.startsWith("C") ? "C" : null;

    if (main) {
      const subs = SUB_LEVELS[main];
      setSelectedMain(main);
      setExpandedMain(main);
      const si = subs.indexOf(maxLevel as GameLevel); // max = best = first in hierarchy
      const ei = subs.indexOf(minLevel as GameLevel); // min = weakest = last
      setRangeStart(si >= 0 ? si : 0);
      setRangeEnd(ei >= 0 ? ei : subs.length - 1);
    }
  }, [minLevel, maxLevel]);

  const handleMainTap = (main: string) => {
    if (main === "A" || main === "D") {
      setSelectedMain(main);
      setExpandedMain(null);
      setRangeStart(null);
      setRangeEnd(null);
      onChange(main, main);
      return;
    }

    // B or C
    if (selectedMain === main && expandedMain === main) {
      // Tapping again deselects
      setSelectedMain(null);
      setExpandedMain(null);
      setRangeStart(null);
      setRangeEnd(null);
      onChange("", "");
      return;
    }

    const subs = SUB_LEVELS[main];
    setSelectedMain(main);
    setExpandedMain(main as "B" | "C");
    // Default: select all sub-levels
    setRangeStart(0);
    setRangeEnd(subs.length - 1);
    onChange(subs[subs.length - 1], subs[0]);
  };

  const handleSubTap = (idx: number) => {
    if (!expandedMain) return;
    const subs = SUB_LEVELS[expandedMain];

    // If tapping a filled pill → reset
    if (rangeStart !== null && rangeEnd !== null) {
      const lo = Math.min(rangeStart, rangeEnd);
      const hi = Math.max(rangeStart, rangeEnd);
      if (idx >= lo && idx <= hi) {
        // Reset and start fresh with this as start
        setRangeStart(idx);
        setRangeEnd(null);
        return;
      }
    }

    if (rangeStart === null || rangeEnd !== null) {
      // First tap or resetting: set start
      setRangeStart(idx);
      setRangeEnd(null);
    } else {
      // Second tap: set end and emit
      const lo = Math.min(rangeStart, idx);
      const hi = Math.max(rangeStart, idx);
      setRangeStart(lo);
      setRangeEnd(hi);
      onChange(subs[hi], subs[lo]);
    }
  };

  // Handle single-tap timeout: if only start is set, treat as single selection
  // We do this via a "confirm on second action" approach - emit on sub tap
  const handleSubTapComplete = (idx: number) => {
    if (!expandedMain) return;
    const subs = SUB_LEVELS[expandedMain];

    if (rangeStart !== null && rangeEnd !== null) {
      const lo = Math.min(rangeStart, rangeEnd);
      const hi = Math.max(rangeStart, rangeEnd);

      if (idx >= lo && idx <= hi) {
        // Tapping filled pill → set as single start, clear end
        setRangeStart(idx);
        setRangeEnd(null);
        return;
      }
    }

    if (rangeStart === null || rangeEnd !== null) {
      // First tap
      setRangeStart(idx);
      setRangeEnd(null);
      // Emit single selection immediately
      onChange(subs[idx], subs[idx]);
    } else {
      // Second tap → set range
      const lo = Math.min(rangeStart, idx);
      const hi = Math.max(rangeStart, idx);
      setRangeStart(lo);
      setRangeEnd(hi);
      onChange(subs[hi], subs[lo]);
    }
  };

  const isMainActive = (main: string) => selectedMain === main;

  // Compute display label
  const displayLabel = (() => {
    if (!selectedMain) return null;
    if (selectedMain === "A" || selectedMain === "D") return selectedMain;
    if (expandedMain && rangeStart !== null) {
      const subs = SUB_LEVELS[expandedMain];
      if (rangeEnd === null) {
        return subs[rangeStart];
      }
      const lo = Math.min(rangeStart, rangeEnd);
      const hi = Math.max(rangeStart, rangeEnd);
      return formatLevelBadge(subs[hi], subs[lo]);
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      {/* Main level pills */}
      <div className="flex gap-2">
        {(["A", "B", "C", "D"] as const).map((main) => (
          <button
            key={main}
            type="button"
            onClick={() => handleMainTap(main)}
            className={cn(
              "flex-1 h-11 rounded-xl border-2 text-sm font-bold transition-all",
              isMainActive(main)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {main}
          </button>
        ))}
      </div>

      {/* Sub-level row */}
      {expandedMain && SUB_LEVELS[expandedMain] && (
        <div className="flex items-center gap-1.5 pl-1">
          <span className="text-xs text-muted-foreground font-medium w-5 shrink-0">
            {expandedMain}:
          </span>
          <div className="flex gap-1.5">
            {SUB_LEVELS[expandedMain].map((sub, idx) => {
              const lo = rangeStart !== null && rangeEnd !== null
                ? Math.min(rangeStart, rangeEnd) : rangeStart;
              const hi = rangeStart !== null && rangeEnd !== null
                ? Math.max(rangeStart, rangeEnd) : rangeStart;
              const isInRange = lo !== null && hi !== null && idx >= lo && idx <= hi;
              const isAnchor = rangeStart === idx && rangeEnd === null;

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => handleSubTapComplete(idx)}
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
