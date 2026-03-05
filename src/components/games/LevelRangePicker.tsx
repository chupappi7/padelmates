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

function activeMains(min: string, max: string): Set<string> {
  const s = new Set<string>();
  s.add(mainOf(max));
  s.add(mainOf(min));
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
    const max = mainOf(currentMax);
    if (max === "B") setExpanded("B");
    else if (max === "C") setExpanded("C");
    else setExpanded(null);
  }, [currentMin, currentMax]);

  const handleMainTap = (main: string) => {
    if (main === "A" || main === "D") {
      setExpanded(null);
      onChange(main, main);
      return;
    }

    if (expanded === main) {
      // Toggle off
      setExpanded(null);
      onChange("", "");
      return;
    }

    // Expand and select full group
    setExpanded(main as "B" | "C");
    if (main === "B") onChange("B2", "B1"); // All B
    if (main === "C") onChange("C3", "C1"); // All C
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
