import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  LEVEL_HIERARCHY,
  levelRank,
  areAdjacent,
  type GameLevel,
} from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  // Internal state: anchor index and optional second index (always adjacent or shortcut)
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);

  // Sync from props
  useEffect(() => {
    if (!minLevel || !maxLevel) {
      setSelStart(null);
      setSelEnd(null);
      return;
    }
    const s = LEVEL_HIERARCHY.indexOf(maxLevel as GameLevel); // max = best = lowest index
    const e = LEVEL_HIERARCHY.indexOf(minLevel as GameLevel); // min = weakest = highest index
    if (s >= 0 && e >= 0) {
      setSelStart(s);
      setSelEnd(e);
    }
  }, [minLevel, maxLevel]);

  const emit = useCallback((start: number | null, end: number | null) => {
    if (start === null) {
      onChange("", "");
      return;
    }
    const lo = Math.min(start, end ?? start);
    const hi = Math.max(start, end ?? start);
    // lo index = best (max_level), hi index = weakest (min_level)
    onChange(LEVEL_HIERARCHY[hi], LEVEL_HIERARCHY[lo]);
  }, [onChange]);

  const handleTap = (idx: number) => {
    // Nothing selected → anchor
    if (selStart === null) {
      setSelStart(idx);
      setSelEnd(idx);
      emit(idx, idx);
      return;
    }

    const lo = Math.min(selStart, selEnd ?? selStart);
    const hi = Math.max(selStart, selEnd ?? selStart);

    // Tap inside current range → collapse to that single level
    if (idx >= lo && idx <= hi) {
      if (lo === hi) {
        // Already single, deselect
        setSelStart(null);
        setSelEnd(null);
        emit(null, null);
      } else {
        setSelStart(idx);
        setSelEnd(idx);
        emit(idx, idx);
      }
      return;
    }

    // Adjacent to current range → expand by 1
    if (idx === lo - 1 || idx === hi + 1) {
      const newLo = Math.min(lo, idx);
      const newHi = Math.max(hi, idx);
      // Only allow expand if total span ≤ 2 (adjacent pair) unless it's a shortcut
      if (newHi - newLo <= 1) {
        setSelStart(newLo);
        setSelEnd(newHi);
        emit(newLo, newHi);
        return;
      }
    }

    // Non-adjacent or would create too wide range → move anchor
    setSelStart(idx);
    setSelEnd(idx);
    emit(idx, idx);
  };

  const handleShortcut = (startLevel: GameLevel, endLevel: GameLevel) => {
    const s = LEVEL_HIERARCHY.indexOf(startLevel);
    const e = LEVEL_HIERARCHY.indexOf(endLevel);
    setSelStart(s);
    setSelEnd(e);
    emit(s, e);
  };

  const lo = selStart !== null ? Math.min(selStart, selEnd ?? selStart) : -1;
  const hi = selStart !== null ? Math.max(selStart, selEnd ?? selStart) : -1;

  // Check if a shortcut is active
  const isBActive = lo === LEVEL_HIERARCHY.indexOf("B1" as GameLevel) && hi === LEVEL_HIERARCHY.indexOf("B2" as GameLevel);
  const isCActive = lo === LEVEL_HIERARCHY.indexOf("C1" as GameLevel) && hi === LEVEL_HIERARCHY.indexOf("C3" as GameLevel);

  // Determine which cells are "reachable" (adjacent to current edges)
  const isReachable = (idx: number) => {
    if (selStart === null) return true;
    // Inside range
    if (idx >= lo && idx <= hi) return true;
    // Adjacent to range edges, and would keep span ≤ 1 from anchor
    if (idx === lo - 1 || idx === hi + 1) {
      const newSpan = Math.max(hi, idx) - Math.min(lo, idx);
      return newSpan <= 1;
    }
    // Always reachable as a new anchor
    return true;
  };

  return (
    <div className="space-y-3">
      {/* Connected segmented bar */}
      <div className="flex">
        {LEVEL_HIERARCHY.map((level, idx) => {
          const isSelected = idx >= lo && idx <= hi && selStart !== null;
          const isFirst = idx === 0;
          const isLast = idx === LEVEL_HIERARCHY.length - 1;

          return (
            <button
              key={level}
              type="button"
              onClick={() => handleTap(idx)}
              className={cn(
                "flex-1 h-11 text-sm font-bold transition-all border-y-2 border-r",
                "focus:outline-none focus:z-10 relative",
                isFirst && "rounded-l-xl border-l-2",
                isLast && "rounded-r-xl",
                !isFirst && !isSelected && "border-l-0",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary z-10"
                  : "border-border text-muted-foreground hover:bg-accent/50",
                // Dim unreachable cells slightly for visual hint
                !isSelected && selStart !== null && !isReachable(idx) && "opacity-50"
              )}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Shortcut pills */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => handleShortcut("B1", "B2")}
          className={cn(
            "h-8 px-4 rounded-full text-xs font-semibold border transition-all",
            isBActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
          )}
        >
          All B
        </button>
        <button
          type="button"
          onClick={() => handleShortcut("C1", "C3")}
          className={cn(
            "h-8 px-4 rounded-full text-xs font-semibold border transition-all",
            isCActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
          )}
        >
          All C
        </button>
      </div>
    </div>
  );
}
