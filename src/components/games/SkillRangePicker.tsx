import { cn } from "@/lib/utils";
import { SKILL_LEVELS } from "./SkillBadge";

const LEVELS = [1, 2, 3, 4] as const;

interface SkillRangePickerProps {
  min: number | null; // null = no filter
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

/**
 * Chip-based skill range picker.
 * - First click: sets single level (min = max = level)
 * - Second click on different chip: expands to range
 * - Click on already-selected single: clears
 * - Click inside range: shrinks from nearest end
 */
export function SkillRangePicker({ min, max, onChange }: SkillRangePickerProps) {
  const handleClick = (level: number) => {
    if (min === null) {
      // No selection → select single
      onChange(level, level);
    } else if (min === max && min === level) {
      // Same chip clicked → clear
      onChange(null, null);
    } else if (min === max) {
      // Single selected, click different → make range
      const newMin = Math.min(min, level);
      const newMax = Math.max(max!, level);
      onChange(newMin, newMax);
    } else {
      // Range active
      if (level === min && level === max) {
        onChange(null, null);
      } else if (level < min!) {
        onChange(level, max);
      } else if (level > max!) {
        onChange(min, level);
      } else {
        // Click inside range: collapse to clicked
        onChange(level, level);
      }
    }
  };

  const isSelected = (level: number) =>
    min !== null && max !== null && level >= min && level <= max;

  const isStart = (level: number) => level === min;
  const isEnd = (level: number) => level === max;
  const inRange = (level: number) =>
    min !== null && max !== null && level > min && level < max;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {LEVELS.map((level) => {
        const { label } = SKILL_LEVELS[level];
        const selected = isSelected(level);
        const start = isStart(level);
        const end = isEnd(level);
        const inside = inRange(level);

        return (
          <button
            key={level}
            type="button"
            onClick={() => handleClick(level)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold border transition-all select-none",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
