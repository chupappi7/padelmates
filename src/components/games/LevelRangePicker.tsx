import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatLevelBadge } from "@/lib/levelUtils";

interface LevelRangePickerProps {
  minLevel: string | null;
  maxLevel: string | null;
  onChange: (minLevel: string, maxLevel: string) => void;
}

const MAINS = ["A", "B", "C", "D"] as const;

type Option = { label: string; min: string; max: string };

const B_OPTIONS: Option[] = [
  { label: "B1", min: "B1", max: "B1" },
  { label: "B2", min: "B2", max: "B2" },
  { label: "B2 – C1", min: "C1", max: "B2" },
];

const C_OPTIONS: Option[] = [
  { label: "C1", min: "C1", max: "C1" },
  { label: "C2", min: "C2", max: "C2" },
  { label: "C3", min: "C3", max: "C3" },
  { label: "C3 – D", min: "D", max: "C3" },
];

function mainOf(level: string): string {
  if (level.startsWith("B")) return "B";
  if (level.startsWith("C")) return "C";
  return level;
}

const MAIN_RANGES: Record<string, [string, string]> = {
  "A-B": ["B2", "A"],
  "B-C": ["C3", "B1"],
  "C-D": ["D", "C1"],
};

function activeMains(min: string, max: string): Set<string> {
  const s = new Set<string>();
  const hierarchy = ["A", "B1", "B2", "C1", "C2", "C3", "D"];
  const si = hierarchy.indexOf(max);
  const ei = hierarchy.indexOf(min);
  if (si >= 0 && ei >= 0) {
    for (let i = si; i <= ei; i++) {
      s.add(mainOf(hierarchy[i]));
    }
  }
  return s;
}

export function LevelRangePicker({ minLevel, maxLevel, onChange }: LevelRangePickerProps) {
  const [expanded, setExpanded] = useState<"B" | "C" | null>(null);

  // Determine which option is currently selected
  const currentMin = minLevel || "";
  const currentMax = maxLevel || "";

  const isMainActive = (main: string) => {
    if (!currentMin || !currentMax) return false;
    const mains = activeMains(currentMin, currentMax);
    return mains.has(main);
  };

  const isOptionSelected = (opt: Option) =>
    currentMin === opt.min && currentMax === opt.max;

  // Sync expanded state from current selection
  useEffect(() => {
    if (!currentMin || !currentMax) {
      setExpanded(null);
      return;
    }
    const mains = activeMains(currentMin, currentMax);
    // Only expand sub-levels for single-main selections
    if (mains.size === 1) {
      if (mains.has("B")) setExpanded("B");
      else if (mains.has("C")) setExpanded("C");
      else setExpanded(null);
    } else {
      setExpanded(null);
    }
  }, [currentMin, currentMax]);

  const handleMainTap = (main: string) => {
    const mains = currentMin && currentMax ? activeMains(currentMin, currentMax) : new Set<string>();

    // If already have one main selected and tapping adjacent → main-level range
    if (mains.size === 1 && !mains.has(main)) {
      const existing = [...mains][0];
      const mainOrder = ["A", "B", "C", "D"];
      const ei = mainOrder.indexOf(existing);
      const mi = mainOrder.indexOf(main);
      if (Math.abs(ei - mi) === 1) {
        const key = ei < mi ? `${existing}-${main}` : `${main}-${existing}`;
        const range = MAIN_RANGES[key];
        if (range) {
          setExpanded(null);
          onChange(range[0], range[1]);
          return;
        }
      }
    }

    // If tapping already-selected single main → deselect
    if (mains.size === 1 && mains.has(main) && expanded === (main === "B" || main === "C" ? main : null)) {
      setExpanded(null);
      onChange("", "");
      return;
    }

    // If in a main-level range and tapping one of the two → keep the other
    if (mains.size === 2 && mains.has(main)) {
      const other = [...mains].find((m) => m !== main)!;
      if (other === "A" || other === "D") {
        setExpanded(null);
        onChange(other, other);
      } else {
        setExpanded(other as "B" | "C");
        if (other === "B") onChange("B2", "B1");
        if (other === "C") onChange("C3", "C1");
      }
      return;
    }

    // Fresh selection or non-adjacent → select this main
    if (main === "A" || main === "D") {
      setExpanded(null);
      onChange(main, main);
    } else {
      setExpanded(main as "B" | "C");
      if (main === "B") onChange("B2", "B1");
      if (main === "C") onChange("C3", "C1");
    }
  };

  const handleOptionTap = (opt: Option) => {
    if (isOptionSelected(opt)) {
      // Deselect → back to full group
      if (expanded === "B") onChange("B2", "B1");
      else if (expanded === "C") onChange("C3", "C1");
      return;
    }
    onChange(opt.min, opt.max);
  };

  const options = expanded === "B" ? B_OPTIONS : expanded === "C" ? C_OPTIONS : null;

  const displayLabel = currentMin && currentMax
    ? formatLevelBadge(currentMin, currentMax)
    : null;

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
              isMainActive(main)
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {main}
          </button>
        ))}
      </div>

      {/* Sub-options */}
      {options && (
        <div className="flex gap-1.5 pl-1 flex-wrap">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleOptionTap(opt)}
              className={cn(
                "h-9 px-4 rounded-full text-xs font-semibold border-2 transition-all",
                isOptionSelected(opt)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
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
