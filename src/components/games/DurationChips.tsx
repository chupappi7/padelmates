import { useMemo } from "react";
import { Clock } from "lucide-react";

const DURATION_OPTIONS = [60, 90, 120] as const;

interface DurationChipsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  selectedTime: string;
}

export function DurationChips({ duration, onDurationChange, selectedTime }: DurationChipsProps) {
  const endTime = useMemo(() => {
    const [h, m] = selectedTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  }, [selectedTime, duration]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onDurationChange(opt)}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all border-2 ${
              duration === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            {opt} min
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Ends at <span className="font-medium text-foreground">{endTime}</span></span>
      </div>
    </div>
  );
}

export function snapToDuration(minutes: number): number {
  const options = [60, 90, 120];
  return options.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
  );
}
